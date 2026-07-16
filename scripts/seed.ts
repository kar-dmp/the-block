import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { PrismaClient } from "@prisma/client";
import { AUCTION_DURATION_MS } from "../lib/auction-time";

type SourceVehicle = {
  id: string;
  vin: string;
  year: number;
  make: string;
  model: string;
  trim: string;
  body_style: string;
  exterior_color: string;
  interior_color: string;
  engine: string;
  transmission: string;
  drivetrain: string;
  odometer_km: number;
  fuel_type: string;
  condition_grade: number;
  condition_report: string;
  damage_notes: string[];
  title_status: string;
  province: string;
  city: string;
  auction_start: string;
  starting_bid: number;
  reserve_price: number | null;
  buy_now_price: number | null;
  images: string[];
  selling_dealership: string;
  lot: string;
  current_bid: number | null;
  bid_count: number;
};

const prisma = new PrismaClient();

async function main() {
  const sourcePath = resolve(process.cwd(), "data/vehicles.json");
  const vehicles = JSON.parse(await readFile(sourcePath, "utf8")) as SourceVehicle[];
  const earliest = Math.min(...vehicles.map((vehicle) => new Date(vehicle.auction_start).getTime()));
  const normalizedStart = new Date();
  normalizedStart.setMinutes(0, 0, 0);
  normalizedStart.setHours(normalizedStart.getHours() + 2);

  await prisma.bid.deleteMany();
  await prisma.vehicle.deleteMany();

  for (const vehicle of vehicles) {
    const originalAuctionStart = new Date(vehicle.auction_start);
    const auctionStart = new Date(
      normalizedStart.getTime() + (originalAuctionStart.getTime() - earliest),
    );
    const auctionEnd = new Date(auctionStart.getTime() + AUCTION_DURATION_MS);

    await prisma.vehicle.create({
      data: {
        id: vehicle.id,
        vin: vehicle.vin,
        year: vehicle.year,
        make: vehicle.make,
        model: vehicle.model,
        trim: vehicle.trim,
        bodyStyle: vehicle.body_style,
        exteriorColor: vehicle.exterior_color,
        interiorColor: vehicle.interior_color,
        engine: vehicle.engine,
        transmission: vehicle.transmission,
        drivetrain: vehicle.drivetrain,
        odometerKm: vehicle.odometer_km,
        fuelType: vehicle.fuel_type,
        conditionGrade: vehicle.condition_grade,
        conditionReport: vehicle.condition_report,
        damageNotes: JSON.stringify(vehicle.damage_notes),
        titleStatus: vehicle.title_status,
        province: vehicle.province,
        city: vehicle.city,
        auctionStart,
        auctionEnd,
        originalAuctionStart,
        startingBid: vehicle.starting_bid,
        reservePrice: vehicle.reserve_price,
        buyNowPrice: vehicle.buy_now_price,
        images: JSON.stringify(vehicle.images),
        sellingDealership: vehicle.selling_dealership,
        sellerVerified: true,
        lot: vehicle.lot,
        currentBid: vehicle.current_bid,
        currentPrice: vehicle.current_bid ?? vehicle.starting_bid,
        bidCount: vehicle.bid_count,
      },
    });
  }

  console.log(`Seeded ${vehicles.length} vehicles. Auctions begin at ${normalizedStart.toISOString()}.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
