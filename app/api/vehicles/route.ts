import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { listVehicles } from "@/lib/vehicle-query";

const querySchema = z.object({
  search: z.string().trim().max(100).optional(),
  make: z.string().trim().max(50).optional(),
  bodyStyle: z.string().trim().max(30).optional(),
  province: z.string().trim().max(50).optional(),
  titleStatus: z.enum(["clean", "rebuilt", "salvage"]).optional(),
  minCondition: z.coerce.number().min(1).max(5).optional(),
  savedOnly: z.literal("true").transform(() => true).optional(),
  savedIds: z
    .string()
    .max(10_000)
    .transform((value) => [...new Set(value.split(",").filter(Boolean))].slice(0, 200))
    .optional(),
  userBidsOnly: z.literal("true").transform(() => true).optional(),
  sortBy: z
    .enum(["auction", "price", "year", "odometer", "condition"])
    .default("auction"),
  sortDirection: z.enum(["asc", "desc"]).default("asc"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(48).default(12),
});

export async function GET(request: NextRequest) {
  const raw = Object.fromEntries(request.nextUrl.searchParams.entries());
  const parsed = querySchema.safeParse(raw);

  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "INVALID_QUERY", message: "The inventory filters are invalid." } },
      { status: 400 },
    );
  }

  return NextResponse.json(await listVehicles(parsed.data));
}
