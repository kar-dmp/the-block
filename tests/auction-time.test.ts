import { describe, expect, it } from "vitest";
import { getAuctionTiming } from "@/lib/auction-time";

const start = "2026-07-20T14:00:00Z";
const end = "2026-07-20T16:00:00Z";

describe("getAuctionTiming", () => {
  it("describes an upcoming auction", () => {
    expect(getAuctionTiming(start, end, new Date("2026-07-20T12:00:00Z").getTime())).toEqual({
      status: "upcoming",
      label: "Starts in 2h 0m",
    });
  });

  it("shows when a live auction ends", () => {
    expect(getAuctionTiming(start, end, new Date("2026-07-20T15:00:00Z").getTime())).toEqual({
      status: "live",
      label: "Live · Ends in 1h 0m",
    });
  });

  it("highlights an auction ending within 30 minutes", () => {
    expect(getAuctionTiming(start, end, new Date("2026-07-20T15:45:00Z").getTime())).toEqual({
      status: "ending-soon",
      label: "Ending soon · 15m",
    });
  });

  it("marks a closed auction as ended", () => {
    expect(getAuctionTiming(start, end, new Date(end).getTime())).toEqual({
      status: "ended",
      label: "Auction ended",
    });
  });
});
