import { spawn } from "node:child_process";

const port = 3100;
const baseUrl = `http://127.0.0.1:${port}`;
const server = spawn("npm", ["run", "start", "--", "--hostname", "127.0.0.1", "--port", String(port)], {
  cwd: process.cwd(),
  env: process.env,
  detached: process.platform !== "win32",
  stdio: ["ignore", "pipe", "pipe"],
});

let output = "";
server.stdout.on("data", (chunk) => { output += chunk.toString(); });
server.stderr.on("data", (chunk) => { output += chunk.toString(); });

async function waitForServer() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/api/health`);
      if (response.ok) return;
    } catch {
      // The server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Server did not become ready.\n${output}`);
}

async function stopServer() {
  if (server.exitCode !== null) return;
  const exited = new Promise((resolve) => server.once("exit", resolve));
  if (process.platform === "win32") server.kill("SIGTERM");
  else process.kill(-server.pid, "SIGTERM");
  await exited;
}

async function resetDatabase() {
  const reset = spawn("node", ["--import", "tsx", "scripts/seed.ts"], {
    cwd: process.cwd(),
    env: process.env,
    stdio: "ignore",
  });
  const exitCode = await new Promise((resolve) => reset.once("exit", resolve));
  if (exitCode !== 0) throw new Error("Smoke test passed, but the development database could not be reset.");
}

let bidPlaced = false;
try {
  await waitForServer();
  const listResponse = await fetch(`${baseUrl}/api/vehicles?pageSize=2`);
  const list = await listResponse.json();
  const finalPage = await fetch(`${baseUrl}/api/vehicles?page=999&pageSize=12`).then((response) => response.json());
  const priceSorted = await fetch(`${baseUrl}/api/vehicles?sortBy=price&sortDirection=asc&pageSize=12`).then((response) => response.json());
  const latestAuctions = await fetch(`${baseUrl}/api/vehicles?sortBy=auction&sortDirection=desc&pageSize=2`).then((response) => response.json());
  const vehicle = list.items[0];
  const detail = await fetch(`${baseUrl}/api/vehicles/${vehicle.id}`).then((response) => response.json());
  const bidAmount = detail.minimumBid;
  const bidResponse = await fetch(`${baseUrl}/api/vehicles/${vehicle.id}/bids`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ amount: bidAmount }),
  });
  bidPlaced = bidResponse.status === 201;
  const refreshed = await fetch(`${baseUrl}/api/vehicles/${vehicle.id}`).then((response) => response.json());
  const buyerActivity = await fetch(`${baseUrl}/api/vehicles?search=${encodeURIComponent(vehicle.vin)}&pageSize=12`).then((response) => response.json());
  const savedOnly = await fetch(`${baseUrl}/api/vehicles?savedOnly=true&savedIds=${encodeURIComponent(vehicle.id)}&pageSize=12`).then((response) => response.json());
  const emptySavedOnly = await fetch(`${baseUrl}/api/vehicles?savedOnly=true&savedIds=&pageSize=12`).then((response) => response.json());
  const userBidsOnly = await fetch(`${baseUrl}/api/vehicles?userBidsOnly=true&pageSize=12`).then((response) => response.json());
  const staleBidResponse = await fetch(`${baseUrl}/api/vehicles/${vehicle.id}/bids`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ amount: bidAmount }),
  });
  const concurrentVehicle = await fetch(`${baseUrl}/api/vehicles/${list.items[1].id}`).then((response) => response.json());
  const concurrentRequest = () => fetch(`${baseUrl}/api/vehicles/${concurrentVehicle.id}/bids`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ amount: concurrentVehicle.minimumBid }),
  });
  const concurrentStatuses = (await Promise.all([concurrentRequest(), concurrentRequest()]))
    .map((response) => response.status)
    .sort();

  if (!listResponse.ok || list.pagination.total !== 200) throw new Error("Inventory API did not return all seeded vehicles.");
  if (typeof vehicle.sellerVerified !== "boolean" || !vehicle.sellingDealership) {
    throw new Error("Inventory API did not return seller verification metadata.");
  }
  if (new Date(vehicle.auctionEnd) <= new Date(vehicle.auctionStart)) {
    throw new Error("Inventory API returned an invalid auction timeframe.");
  }
  if (new Date(list.items[0].auctionStart) > new Date(list.items[1].auctionStart)) {
    throw new Error("Default inventory order is not earliest auction first.");
  }
  if (new Date(latestAuctions.items[0].auctionStart) < new Date(latestAuctions.items[1].auctionStart)) {
    throw new Error("Descending auction direction is incorrect.");
  }
  if (finalPage.pagination.page !== finalPage.pagination.totalPages || finalPage.items.length === 0) {
    throw new Error("Out-of-range pagination was not normalized.");
  }
  const prices = priceSorted.items.map((item) => item.currentBid ?? item.startingBid);
  if (prices.some((price, index) => index > 0 && price < prices[index - 1])) {
    throw new Error("Inventory price sorting is incorrect.");
  }
  if (bidResponse.status !== 201) throw new Error(`Bid API returned ${bidResponse.status}.`);
  if (staleBidResponse.status !== 409) throw new Error("A stale bid was not rejected.");
  if (concurrentStatuses.join(",") !== "201,409") {
    throw new Error(`Concurrent identical bids were not serialized safely: ${concurrentStatuses.join(",")}.`);
  }
  if (refreshed.currentBid !== bidAmount || refreshed.bidCount !== detail.bidCount + 1) {
    throw new Error("The bid did not persist correctly.");
  }
  if (buyerActivity.activity.userBidVehicleCount < 1 || buyerActivity.items[0]?.userBidStatus !== "winning") {
    throw new Error("Buyer bid activity was not reflected in the inventory response.");
  }
  if (savedOnly.pagination.total !== 1 || savedOnly.items[0]?.id !== vehicle.id || emptySavedOnly.pagination.total !== 0) {
    throw new Error("Saved-vehicle filtering did not return the supplied saved IDs exactly.");
  }
  if (userBidsOnly.pagination.total !== 1 || userBidsOnly.items[0]?.userBidStatus !== "winning") {
    throw new Error("My-bids filtering did not return the buyer's active vehicle.");
  }

  console.log(JSON.stringify({
    inventoryCount: list.pagination.total,
    vehicle: `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
    bidStatus: bidResponse.status,
    persistedBid: refreshed.currentBid,
    bidCountBefore: detail.bidCount,
    bidCountAfter: refreshed.bidCount,
    staleBidStatus: staleBidResponse.status,
    concurrentBidStatuses: concurrentStatuses,
    normalizedFinalPage: finalPage.pagination.page,
    defaultSort: "auction asc",
    sellerVerification: vehicle.sellerVerified,
    auctionDurationMinutes: (new Date(vehicle.auctionEnd) - new Date(vehicle.auctionStart)) / 60_000,
    userBidStatus: buyerActivity.items[0].userBidStatus,
    userBidVehicleCount: buyerActivity.activity.userBidVehicleCount,
    savedFilterCount: savedOnly.pagination.total,
    myBidsFilterCount: userBidsOnly.pagination.total,
  }, null, 2));
} finally {
  await stopServer();
  if (bidPlaced) await resetDatabase();
}
