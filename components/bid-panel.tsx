"use client";

import { useEffect, useState } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  IconButton,
  InputAdornment,
  TextField,
} from "@mui/material";
import { Check, Gavel, LoaderCircle, ShieldCheck, X } from "lucide-react";
import type { ApiError, VehicleDetail } from "@/types/vehicle";
import { formatCurrency } from "@/lib/format";
import { Countdown } from "@/components/countdown";

export function BidPanel({ vehicle, onBid }: { vehicle: VehicleDetail; onBid: (vehicle: VehicleDetail) => void }) {
  const [amount, setAmount] = useState(String(vehicle.minimumBid));
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [now, setNow] = useState(() => Date.now());

  const numericAmount = Number(amount);
  const valid = Number.isInteger(numericAmount) && numericAmount >= vehicle.minimumBid && numericAmount % 500 === 0;
  const auctionEnded = now >= new Date(vehicle.auctionEnd).getTime();

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  function closeDialog() {
    if (!submitting) setConfirming(false);
  }

  async function submitBid() {
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch(`/api/vehicles/${vehicle.id}/bids`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: numericAmount }),
      });
      const body = await response.json() as { vehicle: VehicleDetail } | ApiError;
      if (!response.ok || !("vehicle" in body)) {
        const apiError = body as ApiError;
        if (apiError.error.minimumBid) setAmount(String(apiError.error.minimumBid));
        throw new Error(apiError.error.message);
      }

      const updated = { ...vehicle, ...body.vehicle };
      onBid(updated);
      setAmount(String(updated.minimumBid));
      setConfirming(false);
      setSuccess(`You're leading at ${formatCurrency(numericAmount)}.`);
      window.setTimeout(() => setSuccess(""), 5000);
    } catch (caught) {
      setConfirming(false);
      setError((caught as Error).message || "We could not place your bid. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <aside className="bid-panel" aria-label="Bidding panel">
        <div className="bid-panel-time"><Countdown start={vehicle.auctionStart} end={vehicle.auctionEnd} /></div>
        <div className="bid-price-row">
          <div>
            <span>{vehicle.currentBid ? "Current bid" : "Starting bid"}</span>
            <strong>{formatCurrency(vehicle.currentBid ?? vehicle.startingBid)}</strong>
          </div>
          <span className="bid-count"><Gavel size={15} /> {vehicle.bidCount} bids</span>
        </div>
        <div className="reserve-line">
          <span className={vehicle.reserveStatus === "not-met" ? "reserve-dot amber" : "reserve-dot"} />
          {vehicle.reserveStatus === "no-reserve" ? "No reserve" : vehicle.reserveStatus === "met" ? "Reserve met" : "Reserve not met"}
        </div>

        <div className="px-5 py-5">
          <TextField
            id="bid-amount"
            label="Your bid"
            value={amount}
            onChange={(event) => setAmount(event.target.value.replace(/\D/g, ""))}
            fullWidth
            error={amount.length > 0 && !valid}
            helperText={`Minimum ${formatCurrency(vehicle.minimumBid)} · $500 increments`}
            inputMode="numeric"
            disabled={auctionEnded}
            slotProps={{
              input: {
                startAdornment: <InputAdornment position="start">$</InputAdornment>,
                endAdornment: <InputAdornment position="end">CAD</InputAdornment>,
              },
            }}
            sx={{ "& .MuiInputBase-input": { fontSize: 20, fontWeight: 750 } }}
          />

          <div className="mt-3 grid grid-cols-3 gap-2" aria-label="Quick bid amounts">
            {[vehicle.minimumBid, vehicle.minimumBid + 1000, vehicle.minimumBid + 2500].map((value) => (
              <Button
                type="button"
                key={value}
                variant={numericAmount === value ? "contained" : "outlined"}
                onClick={() => setAmount(String(value))}
                disabled={auctionEnded}
                sx={{ minWidth: 0, px: 1, py: 1, fontSize: 12 }}
              >
                {formatCurrency(value)}
              </Button>
            ))}
          </div>

          <Button
            variant="contained"
            size="large"
            fullWidth
            disabled={!valid || auctionEnded}
            onClick={() => { setError(""); setConfirming(true); }}
            sx={{ mt: 1.5, minHeight: 50, fontWeight: 800 }}
          >
            {auctionEnded ? "Auction ended" : "Review bid"}
          </Button>
        </div>

        {auctionEnded && <div className="bid-alert error" role="status">Bidding is closed for this auction.</div>}
        {error && <div className="bid-alert error" role="alert">{error}</div>}
        {success && <div className="bid-alert success" role="status"><Check size={17} /> {success}</div>}
        <div className="secure-note"><ShieldCheck size={17} /><span><strong>Bid with confidence</strong>Your bid is validated and securely recorded.</span></div>
      </aside>

      <Dialog
        open={confirming}
        onClose={() => closeDialog()}
        aria-labelledby="confirm-heading"
        aria-describedby="confirm-description"
        slotProps={{ paper: { sx: { width: "min(450px, calc(100% - 32px))", borderRadius: 3 } } }}
      >
        <DialogContent sx={{ p: { xs: 3, sm: 4 }, pb: 2, position: "relative" }}>
          <IconButton
            aria-label="Close"
            onClick={closeDialog}
            disabled={submitting}
            sx={{ position: "absolute", top: 12, right: 12 }}
          >
            <X size={20} />
          </IconButton>
          <div className="mb-5 grid size-12 place-items-center rounded-full bg-blue-50 text-blue-600">
            <Gavel size={23} />
          </div>
          <span className="section-kicker">Confirm your bid</span>
          <h2 id="confirm-heading" className="mt-3 mb-0 text-4xl font-extrabold tracking-[-0.04em]">
            {formatCurrency(numericAmount)}
          </h2>
          <p id="confirm-description" className="mt-1 mb-5 text-sm text-slate-600">
            for the {vehicle.year} {vehicle.make} {vehicle.model}
          </p>
          <div className="grid grid-cols-[1fr_auto] gap-2 rounded-xl bg-slate-50 p-4 text-sm">
            <span className="text-slate-500">Lot</span><strong>{vehicle.lot}</strong>
            <span className="text-slate-500">Previous bid</span><strong>{formatCurrency(vehicle.currentBid ?? vehicle.startingBid)}</strong>
          </div>
          <p className="mt-4 mb-0 text-[11px] leading-5 text-slate-500">
            By placing this bid, you confirm the amount shown above. This prototype does not create a legally binding purchase.
          </p>
        </DialogContent>
        <DialogActions sx={{ px: { xs: 3, sm: 4 }, pb: { xs: 3, sm: 4 }, gap: 1 }}>
          <Button variant="outlined" onClick={closeDialog} disabled={submitting} fullWidth>Go back</Button>
          <Button variant="contained" onClick={submitBid} disabled={submitting} fullWidth sx={{ minHeight: 44 }}>
            {submitting ? <><LoaderCircle className="spin" size={18} /> Placing bid…</> : "Place bid"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
