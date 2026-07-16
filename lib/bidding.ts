import { Prisma, type PrismaClient } from "@prisma/client";
import { BID_INCREMENT, minimumBidFor } from "@/lib/format";

export class BidError extends Error {
  constructor(
    public readonly code: "VEHICLE_NOT_FOUND" | "BID_TOO_LOW" | "BID_CONFLICT" | "AUCTION_ENDED",
    message: string,
    public readonly minimumBid?: number,
  ) {
    super(message);
    this.name = "BidError";
  }
}

export function assertAuctionOpen(auctionEnd: Date, now = new Date()) {
  if (auctionEnd.getTime() <= now.getTime()) {
    throw new BidError("AUCTION_ENDED", "This auction has ended and is no longer accepting bids.");
  }
}

export function validateBid(
  amount: number,
  vehicle: { startingBid: number; currentBid: number | null },
) {
  const minimumBid = minimumBidFor(vehicle.startingBid, vehicle.currentBid);

  if (!Number.isInteger(amount) || amount < minimumBid) {
    throw new BidError(
      "BID_TOO_LOW",
      `Your bid must be at least ${minimumBid} CAD.`,
      minimumBid,
    );
  }

  if (amount % BID_INCREMENT !== 0) {
    throw new BidError(
      "BID_TOO_LOW",
      `Bids must use ${BID_INCREMENT} CAD increments.`,
      minimumBid,
    );
  }

  return minimumBid;
}

export async function placeBid(db: PrismaClient, vehicleId: string, amount: number) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await db.$transaction(async (tx) => {
        const vehicle = await tx.vehicle.findUnique({ where: { id: vehicleId } });

        if (!vehicle) {
          throw new BidError("VEHICLE_NOT_FOUND", "This vehicle could not be found.");
        }

        assertAuctionOpen(vehicle.auctionEnd);
        validateBid(amount, vehicle);

        const updated = await tx.vehicle.updateMany({
          where: {
            id: vehicleId,
            currentBid: vehicle.currentBid,
            auctionEnd: { gt: new Date() },
          },
          data: {
            currentBid: amount,
            currentPrice: amount,
            bidCount: { increment: 1 },
          },
        });

        if (updated.count !== 1) {
          const latest = await tx.vehicle.findUnique({ where: { id: vehicleId } });
          if (latest) assertAuctionOpen(latest.auctionEnd);
          throw new BidError(
            "BID_CONFLICT",
            "Another buyer placed a bid first. Review the latest price and try again.",
          );
        }

        await tx.bid.create({ data: { vehicleId, amount } });
        return tx.vehicle.findUniqueOrThrow({
          where: { id: vehicleId },
          include: {
            bids: {
              orderBy: { createdAt: "desc" },
              take: 1,
            },
          },
        });
      });
    } catch (error) {
      const retryablePrismaError =
        error instanceof Prisma.PrismaClientKnownRequestError &&
        ["P1008", "P2028", "P2034"].includes(error.code);
      const retryableBidConflict = error instanceof BidError && error.code === "BID_CONFLICT";

      if (attempt < 2 && (retryablePrismaError || retryableBidConflict)) continue;
      if (retryablePrismaError) {
        throw new BidError(
          "BID_CONFLICT",
          "Another buyer updated this auction. Review the latest price and try again.",
        );
      }
      throw error;
    }
  }

  throw new BidError("BID_CONFLICT", "The bid changed while you were submitting. Please try again.");
}
