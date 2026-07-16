import type { Bid as PrismaBid, Vehicle as PrismaVehicle } from "@prisma/client";
import type { Vehicle, VehicleDetail } from "@/types/vehicle";
import { minimumBidFor } from "@/lib/format";

type VehicleWithUserBids = PrismaVehicle & { bids?: PrismaBid[] };

export function toVehicle(vehicle: VehicleWithUserBids): Vehicle {
  const activePrice = vehicle.currentPrice;
  const latestUserBid = vehicle.bids?.[0];
  const reserveStatus =
    vehicle.reservePrice === null
      ? "no-reserve"
      : activePrice >= vehicle.reservePrice
        ? "met"
        : "not-met";

  return {
    id: vehicle.id,
    vin: vehicle.vin,
    year: vehicle.year,
    make: vehicle.make,
    model: vehicle.model,
    trim: vehicle.trim,
    bodyStyle: vehicle.bodyStyle,
    exteriorColor: vehicle.exteriorColor,
    interiorColor: vehicle.interiorColor,
    engine: vehicle.engine,
    transmission: vehicle.transmission,
    drivetrain: vehicle.drivetrain,
    odometerKm: vehicle.odometerKm,
    fuelType: vehicle.fuelType,
    conditionGrade: vehicle.conditionGrade,
    conditionReport: vehicle.conditionReport,
    damageNotes: JSON.parse(vehicle.damageNotes) as string[],
    titleStatus: vehicle.titleStatus,
    province: vehicle.province,
    city: vehicle.city,
    auctionStart: vehicle.auctionStart.toISOString(),
    auctionEnd: vehicle.auctionEnd.toISOString(),
    startingBid: vehicle.startingBid,
    images: JSON.parse(vehicle.images) as string[],
    sellingDealership: vehicle.sellingDealership,
    sellerVerified: vehicle.sellerVerified,
    lot: vehicle.lot,
    currentBid: vehicle.currentBid,
    bidCount: vehicle.bidCount,
    userBidStatus: latestUserBid
      ? latestUserBid.amount === vehicle.currentBid ? "winning" : "outbid"
      : null,
    minimumBid: minimumBidFor(vehicle.startingBid, vehicle.currentBid),
    reserveStatus,
  };
}

export function toVehicleDetail(
  vehicle: PrismaVehicle & { bids: PrismaBid[] },
): VehicleDetail {
  return {
    ...toVehicle(vehicle),
    recentBids: vehicle.bids.map((bid) => ({
      id: bid.id,
      amount: bid.amount,
      createdAt: bid.createdAt.toISOString(),
    })),
  };
}
