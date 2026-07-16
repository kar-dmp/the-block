export const AUCTION_DURATION_MS = 2 * 60 * 60 * 1_000;
export const ENDING_SOON_MS = 30 * 60 * 1_000;

export type AuctionStatus = "upcoming" | "live" | "ending-soon" | "ended";

export type AuctionTiming = {
  status: AuctionStatus;
  label: string;
};

function durationLabel(distance: number) {
  const totalMinutes = Math.max(1, Math.ceil(distance / 60_000));
  const days = Math.floor(totalMinutes / (24 * 60));
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function getAuctionTiming(start: string, end: string, now = Date.now()): AuctionTiming {
  const startAt = new Date(start).getTime();
  const endAt = new Date(end).getTime();

  if (now < startAt) {
    return { status: "upcoming", label: `Starts in ${durationLabel(startAt - now)}` };
  }

  if (now >= endAt) {
    return { status: "ended", label: "Auction ended" };
  }

  const timeLeft = endAt - now;
  if (timeLeft <= ENDING_SOON_MS) {
    return { status: "ending-soon", label: `Ending soon · ${durationLabel(timeLeft)}` };
  }

  return { status: "live", label: `Live · Ends in ${durationLabel(timeLeft)}` };
}

export function formatAuctionDateTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
