import Image from "next/image";
import Link from "next/link";
import { Card, CardContent, Chip, IconButton, Tooltip } from "@mui/material";
import { Building2, Gauge, Gavel, Heart, MapPin, ShieldCheck, ShieldQuestion } from "lucide-react";
import type { Vehicle } from "@/types/vehicle";
import { formatCurrency, formatOdometer } from "@/lib/format";
import { Countdown } from "@/components/countdown";

const titleColors: Record<string, { color: string; background: string }> = {
  clean: { color: "#087550", background: "#e8f8f1" },
  rebuilt: { color: "#a96308", background: "#fff1dc" },
  salvage: { color: "#a62b2b", background: "#fff0f0" },
};

export function VehicleCard({
  vehicle,
  saved,
  onToggleSaved,
}: {
  vehicle: Vehicle;
  saved: boolean;
  onToggleSaved: () => void;
}) {
  const displayedBid = vehicle.currentBid ?? vehicle.startingBid;
  const titleColor = titleColors[vehicle.titleStatus] ?? titleColors.clean;

  return (
    <Card
      component="article"
      variant="outlined"
      className="group h-full"
      sx={{
        overflow: "visible",
        borderColor: "#dfe4eb",
        borderRadius: "16px",
        boxShadow: "0 2px 0 rgba(14,31,53,.01)",
        transition: "transform .25s, box-shadow .25s, border-color .25s",
        "&:hover": {
          transform: "translateY(-4px)",
          borderColor: "#c8d2e1",
          boxShadow: "0 18px 50px rgba(10,27,55,.10)",
        },
      }}
    >
      <div className="relative">
        <div className="relative aspect-[4/3] overflow-hidden rounded-t-2xl bg-slate-100">
          <Link
            href={`/vehicles/${vehicle.id}`}
            aria-label={`View ${vehicle.year} ${vehicle.make} ${vehicle.model}`}
            className="absolute inset-0"
          >
            <Image
              src={vehicle.images[0]}
              alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
              fill
              unoptimized
              sizes="(max-width: 700px) 100vw, (max-width: 1100px) 50vw, 33vw"
              className="object-cover transition-transform duration-500 group-hover:scale-[1.025]"
            />
          </Link>

          <div className="absolute top-3 left-3 z-10 flex items-center gap-2">
            <Chip
              label={`${vehicle.titleStatus} title`}
              size="small"
              sx={{
                height: 28,
                color: titleColor.color,
                backgroundColor: titleColor.background,
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: ".05em",
                textTransform: "uppercase",
              }}
            />

            <Tooltip
              arrow
              title={`${vehicle.sellingDealership} · ${vehicle.sellerVerified ? "Verified seller" : "Seller verification unavailable"}`}
            >
              <span
                className="relative grid size-8 cursor-help place-items-center rounded-full bg-white text-blue-700 shadow-[0_4px_14px_rgba(15,23,42,.16)] outline-offset-2 focus-visible:outline-2 focus-visible:outline-blue-600"
                tabIndex={0}
                aria-label={`${vehicle.sellingDealership}, ${vehicle.sellerVerified ? "verified seller" : "seller verification unavailable"}`}
              >
                <Building2 size={15} />
                <span
                  className={`absolute -right-0.5 -bottom-0.5 grid size-3.5 place-items-center rounded-full border-2 border-white ${vehicle.sellerVerified ? "bg-emerald-600 text-white" : "bg-slate-500 text-white"}`}
                  aria-hidden="true"
                >
                  {vehicle.sellerVerified ? <ShieldCheck size={8} /> : <ShieldQuestion size={8} />}
                </span>
              </span>
            </Tooltip>
          </div>

          <Tooltip title={saved ? "Remove from saved" : "Save vehicle"}>
            <IconButton
              aria-label={saved ? `Remove ${vehicle.year} ${vehicle.make} ${vehicle.model} from saved` : `Save ${vehicle.year} ${vehicle.make} ${vehicle.model}`}
              aria-pressed={saved}
              onClick={onToggleSaved}
              className="!absolute !top-3 !right-3 !z-10"
              sx={{
                width: 38,
                height: 38,
                color: saved ? "#e11d48" : "#475569",
                backgroundColor: "rgba(255,255,255,.96)",
                boxShadow: "0 4px 14px rgba(15,23,42,.16)",
                "&:hover": { color: "#e11d48", backgroundColor: "#fff" },
              }}
            >
              <Heart size={20} fill={saved ? "currentColor" : "none"} />
            </IconButton>
          </Tooltip>

          {vehicle.userBidStatus && (
            <Chip
              icon={<Gavel size={14} />}
              label={vehicle.userBidStatus === "winning" ? "Your bid · Winning" : "Your bid · Outbid"}
              size="small"
              className="!absolute !top-[58px] !right-3 !z-10"
              sx={{
                height: 28,
                color: vehicle.userBidStatus === "winning" ? "#087550" : "#b4233c",
                backgroundColor: vehicle.userBidStatus === "winning" ? "#e8f8f1" : "#fff0f3",
                fontSize: 10,
                fontWeight: 850,
                boxShadow: "0 3px 10px rgba(15,23,42,.12)",
                "& .MuiChip-icon": { color: "inherit", ml: 1 },
              }}
            />
          )}

          <div className="absolute bottom-3 right-3">
            <Countdown start={vehicle.auctionStart} end={vehicle.auctionEnd} compact />
          </div>
        </div>

        <Chip
          label={`Lot ${vehicle.lot}`}
          className="!absolute !-bottom-4 !left-5"
          sx={{
            zIndex: 3,
            height: 32,
            border: "2px solid #fff",
            backgroundColor: "#0c1930",
            color: "#fff",
            fontFamily: "var(--font-mono), monospace",
            fontSize: 12,
            fontWeight: 800,
            letterSpacing: ".04em",
            boxShadow: "0 5px 14px rgba(12,25,48,.22)",
          }}
        />
      </div>

      <CardContent sx={{ p: "26px 18px 14px", "&:last-child": { pb: "14px" } }}>
        <Link
          href={`/vehicles/${vehicle.id}`}
          className="flex min-w-0 items-baseline justify-between gap-3 text-slate-950"
        >
          <h3
            className="m-0 min-w-0 truncate text-[18px] leading-6 font-extrabold tracking-[-0.035em]"
            title={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
          >
            {vehicle.year} {vehicle.make} {vehicle.model}
          </h3>
          <span
            className="max-w-[35%] shrink-0 truncate text-right text-[11px] leading-5 font-semibold text-slate-600"
            title={vehicle.trim}
          >
            {vehicle.trim}
          </span>
        </Link>

        <div className="mt-2.5 grid grid-cols-2">
          <div className="flex min-w-0 items-center gap-2.5 pr-3">
            <Gauge size={16} className="shrink-0 text-blue-600" />
            <div className="min-w-0">
              <span className="block text-[9px] font-bold tracking-[.08em] text-slate-500 uppercase">Mileage</span>
              <strong className="block truncate text-[13px] leading-[18px] font-bold text-slate-800">
                {formatOdometer(vehicle.odometerKm)}
              </strong>
            </div>
          </div>

          <div className="flex min-w-0 items-center gap-2.5 border-l border-slate-200 pl-3">
            <MapPin size={16} className="shrink-0 text-blue-600" />
            <div className="min-w-0">
              <span className="block text-[9px] font-bold tracking-[.08em] text-slate-500 uppercase">Location</span>
              <strong
                className="block truncate text-[13px] leading-[18px] font-bold text-slate-800"
                title={`${vehicle.city}, ${vehicle.province}`}
              >
                {vehicle.city}, {vehicle.province}
              </strong>
            </div>
          </div>
        </div>

        <div className="my-2.5 h-px bg-slate-200" />

        <div className="flex items-end justify-between gap-3">
          <div>
            <span className="mb-0.5 block text-[10px] font-bold tracking-[.06em] text-slate-500 uppercase">
              {vehicle.currentBid ? "Current bid" : "Starting bid"}
            </span>
            <div className="flex flex-wrap items-baseline gap-x-2">
              <strong className="text-[21px] leading-7 font-extrabold tracking-[-0.035em] text-slate-950">
                {formatCurrency(displayedBid)}
              </strong>
              <small className="text-[11px] font-medium text-slate-500">
                {vehicle.bidCount} {vehicle.bidCount === 1 ? "bid" : "bids"}
              </small>
            </div>
          </div>
          <div className="text-right">
            <span className="mb-0.5 block text-[10px] font-bold tracking-[.06em] text-slate-500 uppercase">Condition</span>
            <strong className="text-[19px] font-extrabold text-emerald-600">{vehicle.conditionGrade.toFixed(1)}</strong>
            <small className="text-[11px] font-medium text-slate-500"> / 5</small>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
