import { describe, expect, it } from "vitest";
import { assertAuctionOpen, BidError, validateBid } from "@/lib/bidding";
import { minimumBidFor } from "@/lib/format";

describe("minimumBidFor", () => {
  it("uses the starting bid when a vehicle has no bids", () => {
    expect(minimumBidFor(12_500, null)).toBe(12_500);
  });

  it("adds the required increment to an active bid", () => {
    expect(minimumBidFor(12_500, 14_000)).toBe(14_500);
  });
});

describe("assertAuctionOpen", () => {
  const now = new Date("2026-07-20T14:00:00Z");

  it("allows bids before the auction closes", () => {
    expect(() => assertAuctionOpen(new Date("2026-07-20T14:01:00Z"), now)).not.toThrow();
  });

  it("rejects bids at or after the auction close", () => {
    expect(() => assertAuctionOpen(new Date("2026-07-20T14:00:00Z"), now)).toThrowError(BidError);

    try {
      assertAuctionOpen(new Date("2026-07-20T13:59:59Z"), now);
    } catch (error) {
      expect(error).toMatchObject({ code: "AUCTION_ENDED" });
    }
  });
});

describe("validateBid", () => {
  const vehicle = { startingBid: 12_500, currentBid: 14_000 };

  it("accepts a bid at the current minimum", () => {
    expect(validateBid(14_500, vehicle)).toBe(14_500);
  });

  it("rejects a stale bid and returns the latest minimum", () => {
    expect(() => validateBid(14_000, vehicle)).toThrowError(BidError);

    try {
      validateBid(14_000, vehicle);
    } catch (error) {
      expect(error).toMatchObject({ code: "BID_TOO_LOW", minimumBid: 14_500 });
    }
  });

  it("rejects amounts outside 500 CAD increments", () => {
    expect(() => validateBid(14_750, vehicle)).toThrow("Bids must use 500 CAD increments.");
  });
});
