export const BID_INCREMENT = 500;

export function minimumBidFor(startingBid: number, currentBid: number | null) {
  return currentBid === null ? startingBid : currentBid + BID_INCREMENT;
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatOdometer(value: number) {
  return `${new Intl.NumberFormat("en-CA").format(value)} km`;
}
