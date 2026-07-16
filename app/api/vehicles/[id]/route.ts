import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { toVehicleDetail } from "@/lib/vehicle-mapper";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const vehicle = await prisma.vehicle.findUnique({
    where: { id },
    include: {
      bids: {
        orderBy: { createdAt: "desc" },
        take: 5,
      },
    },
  });

  if (!vehicle) {
    return NextResponse.json(
      { error: { code: "VEHICLE_NOT_FOUND", message: "This vehicle could not be found." } },
      { status: 404 },
    );
  }

  return NextResponse.json(toVehicleDetail(vehicle));
}
