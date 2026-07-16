import type { Bid as PrismaBid, Vehicle as PrismaVehicle } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { toVehicle } from "@/lib/vehicle-mapper";

function vehicle(overrides: Partial<PrismaVehicle> = {}): PrismaVehicle {
  return {
    id: "vehicle-1",
    vin: "12345678901234567",
    year: 2024,
    make: "Ford",
    model: "F-150",
    trim: "XLT",
    bodyStyle: "truck",
    exteriorColor: "Blue",
    interiorColor: "Black",
    engine: "2.7L EcoBoost V6",
    transmission: "automatic",
    drivetrain: "4WD",
    odometerKm: 32_000,
    fuelType: "gasoline",
    conditionGrade: 4.2,
    conditionReport: "Clean wholesale unit.",
    damageNotes: JSON.stringify(["Minor bumper scratch"]),
    titleStatus: "clean",
    province: "Ontario",
    city: "Toronto",
    auctionStart: new Date("2026-07-20T14:00:00Z"),
    auctionEnd: new Date("2026-07-20T16:00:00Z"),
    originalAuctionStart: new Date("2026-04-01T14:00:00Z"),
    startingBid: 20_000,
    reservePrice: 25_000,
    buyNowPrice: null,
    images: JSON.stringify(["https://placehold.co/800x600"]),
    sellingDealership: "Dealer One",
    sellerVerified: true,
    lot: "A-0001",
    currentBid: 24_500,
    currentPrice: 24_500,
    bidCount: 4,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function bid(amount: number): PrismaBid {
  return {
    id: `bid-${amount}`,
    amount,
    createdAt: new Date("2026-07-20T15:00:00Z"),
    vehicleId: "vehicle-1",
  };
}

describe("toVehicle", () => {
  it("hides the reserve price while exposing buyer-safe reserve state", () => {
    const result = toVehicle(vehicle());
    expect(result.reserveStatus).toBe("not-met");
    expect(result).not.toHaveProperty("reservePrice");
  });

  it("marks a reserve as met from the active bid", () => {
    expect(toVehicle(vehicle({ currentBid: 25_000, currentPrice: 25_000 })).reserveStatus).toBe("met");
  });

  it("deserializes image and damage arrays", () => {
    const result = toVehicle(vehicle());
    expect(result.images).toEqual(["https://placehold.co/800x600"]);
    expect(result.damageNotes).toEqual(["Minor bumper scratch"]);
  });

  it("includes auction close and seller verification metadata", () => {
    const result = toVehicle(vehicle());
    expect(result.auctionEnd).toBe("2026-07-20T16:00:00.000Z");
    expect(result.sellerVerified).toBe(true);
  });

  it("marks the buyer as winning when their latest bid is current", () => {
    const result = toVehicle({ ...vehicle(), bids: [bid(24_500)] });
    expect(result.userBidStatus).toBe("winning");
  });

  it("marks the buyer as outbid when the current bid has moved higher", () => {
    const result = toVehicle({
      ...vehicle({ currentBid: 25_500, currentPrice: 25_500 }),
      bids: [bid(24_500)],
    });
    expect(result.userBidStatus).toBe("outbid");
  });
});
