export type Vehicle = {
  id: string;
  vin: string;
  year: number;
  make: string;
  model: string;
  trim: string;
  bodyStyle: string;
  exteriorColor: string;
  interiorColor: string;
  engine: string;
  transmission: string;
  drivetrain: string;
  odometerKm: number;
  fuelType: string;
  conditionGrade: number;
  conditionReport: string;
  damageNotes: string[];
  titleStatus: string;
  province: string;
  city: string;
  auctionStart: string;
  auctionEnd: string;
  startingBid: number;
  images: string[];
  sellingDealership: string;
  sellerVerified: boolean;
  lot: string;
  currentBid: number | null;
  bidCount: number;
  userBidStatus: "winning" | "outbid" | null;
  minimumBid: number;
  reserveStatus: "no-reserve" | "met" | "not-met";
};

export type Bid = {
  id: string;
  amount: number;
  createdAt: string;
};

export type VehicleDetail = Vehicle & {
  recentBids: Bid[];
};

export type VehicleListResponse = {
  items: Vehicle[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  facets: {
    makes: string[];
    bodyStyles: string[];
    provinces: string[];
  };
  activity: {
    userBidVehicleCount: number;
  };
};

export type ApiError = {
  error: {
    code: string;
    message: string;
    minimumBid?: number;
  };
};
