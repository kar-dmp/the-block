"use client";

import { useEffect, useState } from "react";
import { Clock3 } from "lucide-react";
import { formatAuctionDateTime, getAuctionTiming, type AuctionStatus } from "@/lib/auction-time";

const statusStyles: Record<AuctionStatus, { compact: string; full: string }> = {
  upcoming: {
    compact: "bg-slate-900/90 text-white",
    full: "bg-blue-50 text-blue-700",
  },
  live: {
    compact: "bg-emerald-600/95 text-white",
    full: "bg-emerald-50 text-emerald-700",
  },
  "ending-soon": {
    compact: "bg-amber-400 text-slate-950",
    full: "bg-amber-50 text-amber-800",
  },
  ended: {
    compact: "bg-slate-600/95 text-white",
    full: "bg-slate-100 text-slate-600",
  },
};

export function Countdown({ start, end, compact = false }: { start: string; end: string; compact?: boolean }) {
  const [timing, setTiming] = useState(() => getAuctionTiming(start, end));

  useEffect(() => {
    const timer = window.setInterval(() => setTiming(getAuctionTiming(start, end)), 30_000);
    return () => window.clearInterval(timer);
  }, [start, end]);

  const modeStyles = compact ? statusStyles[timing.status].compact : statusStyles[timing.status].full;

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-bold whitespace-nowrap ${compact ? "rounded-lg px-2.5 py-2 text-[11px] shadow-sm backdrop-blur-sm" : "rounded-lg px-3 py-2 text-xs"} ${modeStyles}`}
      title={`Auction ends ${formatAuctionDateTime(end)}`}
      data-auction-status={timing.status}
    >
      <Clock3 size={compact ? 14 : 16} /> {timing.label}
    </span>
  );
}
