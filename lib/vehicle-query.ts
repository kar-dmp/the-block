import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { toVehicle } from "@/lib/vehicle-mapper";
import { clampPage } from "@/lib/pagination";

export type VehicleQuery = {
  search?: string;
  make?: string;
  bodyStyle?: string;
  province?: string;
  titleStatus?: string;
  minCondition?: number;
  savedOnly?: boolean;
  savedIds?: string[];
  userBidsOnly?: boolean;
  sortBy?: "auction" | "price" | "year" | "odometer" | "condition";
  sortDirection?: "asc" | "desc";
  page: number;
  pageSize: number;
};

let facetCache:
  | Promise<{ makes: string[]; bodyStyles: string[]; provinces: string[] }>
  | undefined;

function getInventoryFacets() {
  facetCache ??= Promise.all([
    prisma.vehicle.findMany({ distinct: ["make"], select: { make: true }, orderBy: { make: "asc" } }),
    prisma.vehicle.findMany({ distinct: ["bodyStyle"], select: { bodyStyle: true }, orderBy: { bodyStyle: "asc" } }),
    prisma.vehicle.findMany({ distinct: ["province"], select: { province: true }, orderBy: { province: "asc" } }),
  ]).then(([makes, bodyStyles, provinces]) => ({
    makes: makes.map((item) => item.make),
    bodyStyles: bodyStyles.map((item) => item.bodyStyle),
    provinces: provinces.map((item) => item.province),
  }));

  return facetCache;
}

function createWhere(query: VehicleQuery): Prisma.VehicleWhereInput {
  const search = query.search?.trim();

  return {
    AND: [
      search
        ? {
            OR: [
              { make: { contains: search } },
              { model: { contains: search } },
              { trim: { contains: search } },
              { vin: { contains: search } },
              { lot: { contains: search } },
              { sellingDealership: { contains: search } },
              { city: { contains: search } },
            ],
          }
        : {},
      query.make ? { make: query.make } : {},
      query.bodyStyle ? { bodyStyle: query.bodyStyle } : {},
      query.province ? { province: query.province } : {},
      query.titleStatus ? { titleStatus: query.titleStatus } : {},
      query.minCondition ? { conditionGrade: { gte: query.minCondition } } : {},
      query.savedOnly ? { id: { in: query.savedIds ?? [] } } : {},
      query.userBidsOnly ? { bids: { some: {} } } : {},
    ],
  };
}

function createOrderBy(query: VehicleQuery): Prisma.VehicleOrderByWithRelationInput[] {
  const direction = query.sortDirection ?? "asc";

  switch (query.sortBy) {
    case "price":
      return [{ currentPrice: direction }, { auctionStart: "asc" }];
    case "year":
      return [{ year: direction }, { make: "asc" }];
    case "odometer":
      return [{ odometerKm: direction }, { auctionStart: "asc" }];
    case "condition":
      return [{ conditionGrade: direction }, { auctionStart: "asc" }];
    default:
      return [{ auctionStart: direction }, { lot: "asc" }];
  }
}

export async function listVehicles(query: VehicleQuery) {
  const where = createWhere(query);
  const total = await prisma.vehicle.count({ where });
  const page = clampPage(query.page, total, query.pageSize);
  const skip = (page - 1) * query.pageSize;

  const [items, facets, userBidVehicleCount] = await Promise.all([
    prisma.vehicle.findMany({
      where,
      orderBy: createOrderBy(query),
      skip,
      take: query.pageSize,
      include: {
        bids: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    }),
    getInventoryFacets(),
    prisma.vehicle.count({ where: { bids: { some: {} } } }),
  ]);

  return {
    items: items.map(toVehicle),
    pagination: {
      page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
    },
    facets,
    activity: { userBidVehicleCount },
  };
}
