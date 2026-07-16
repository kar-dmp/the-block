import { NextResponse } from "next/server";
import { z } from "zod";
import { BidError, placeBid } from "@/lib/bidding";
import { prisma } from "@/lib/prisma";
import { toVehicle } from "@/lib/vehicle-mapper";

const bidSchema = z.object({
  amount: z.number().int().positive(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const body = await request.json().catch(() => null);
  const parsed = bidSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "INVALID_BID", message: "Enter a valid whole-dollar bid." } },
      { status: 400 },
    );
  }

  try {
    const { id } = await params;
    const vehicle = await placeBid(prisma, id, parsed.data.amount);
    return NextResponse.json({ vehicle: toVehicle(vehicle) }, { status: 201 });
  } catch (error) {
    if (error instanceof BidError) {
      return NextResponse.json(
        {
          error: {
            code: error.code,
            message: error.message,
            minimumBid: error.minimumBid,
          },
        },
        { status: error.code === "VEHICLE_NOT_FOUND" ? 404 : error.code === "AUCTION_ENDED" ? 410 : 409 },
      );
    }

    throw error;
  }
}
