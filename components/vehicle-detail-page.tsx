"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, Building2, Check, CircleAlert, Fuel, Gauge, MapPin, Palette, Share2, ShieldCheck, ShieldQuestion, Wrench } from "lucide-react";
import type { VehicleDetail } from "@/types/vehicle";
import { formatCurrency, formatOdometer } from "@/lib/format";
import { ImageGallery } from "@/components/image-gallery";
import { BidPanel } from "@/components/bid-panel";

export function VehicleDetailPage({ id }: { id: string }) {
  const [vehicle, setVehicle] = useState<VehicleDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch(`/api/vehicles/${id}`, { signal: controller.signal });
        if (!response.ok) throw new Error(response.status === 404 ? "This vehicle could not be found." : "The listing could not be loaded.");
        setVehicle(await response.json() as VehicleDetail);
      } catch (caught) {
        if ((caught as Error).name !== "AbortError") setError((caught as Error).message);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    load();
    return () => controller.abort();
  }, [id]);

  if (loading) return <DetailSkeleton />;
  if (error || !vehicle) return <main className="detail-error shell"><CircleAlert size={34} /><h1>Listing unavailable</h1><p>{error}</p><Link href="/"><ArrowLeft size={18} /> Browse inventory</Link></main>;

  const name = `${vehicle.year} ${vehicle.make} ${vehicle.model}`;
  const specs = [
    ["Odometer", formatOdometer(vehicle.odometerKm), Gauge],
    ["Engine", vehicle.engine, Wrench],
    ["Transmission", vehicle.transmission, Wrench],
    ["Drivetrain", vehicle.drivetrain, Wrench],
    ["Fuel type", vehicle.fuelType, Fuel],
    ["Exterior", vehicle.exteriorColor, Palette],
    ["Interior", vehicle.interiorColor, Palette],
    ["Body style", vehicle.bodyStyle, Wrench],
  ] as const;

  return (
    <main className="detail-main">
      <div className="shell detail-breadcrumb-row">
        <Link href="/#inventory"><ArrowLeft size={17} /> Back to inventory</Link>
        <ShareButton />
      </div>

      <div className="shell detail-title-row">
        <div>
          <div className="detail-badges"><span>Lot {vehicle.lot}</span><span className={`title-badge ${vehicle.titleStatus}`}>{vehicle.titleStatus} title</span></div>
          <h1>{name}</h1>
          <p>{vehicle.trim} · {vehicle.exteriorColor} · VIN {vehicle.vin}</p>
        </div>
        <div className="condition-hero"><span>Condition grade</span><strong>{vehicle.conditionGrade.toFixed(1)}</strong><small>/ 5.0</small></div>
      </div>

      <div className="shell detail-top-grid">
        <ImageGallery images={vehicle.images} name={name} />
        <BidPanel vehicle={vehicle} onBid={(updated) => setVehicle((current) => current ? { ...current, ...updated } : updated)} />
      </div>

      <div className="shell detail-content-grid">
        <div className="detail-sections">
          <section className="detail-section">
            <div className="section-heading"><span className="section-number">01</span><div><span className="section-kicker">At a glance</span><h2>Vehicle specifications</h2></div></div>
            <div className="spec-grid">
              {specs.map(([label, value, Icon]) => <div className="spec-item" key={label}><Icon size={18} /><span>{label}<strong>{value}</strong></span></div>)}
            </div>
          </section>

          <section className="detail-section">
            <div className="section-heading"><span className="section-number">02</span><div><span className="section-kicker">Inspected condition</span><h2>Condition report</h2></div></div>
            <div className="condition-report-card">
              <div className="grade-ring" style={{ "--grade": `${vehicle.conditionGrade / 5 * 360}deg` } as React.CSSProperties}><span><strong>{vehicle.conditionGrade.toFixed(1)}</strong><small>out of 5</small></span></div>
              <p>{vehicle.conditionReport}</p>
            </div>
            <div className="damage-block">
              <h3>{vehicle.damageNotes.length ? "Disclosures & damage notes" : "No reported damage"}</h3>
              {vehicle.damageNotes.length ? (
                <ul>{vehicle.damageNotes.map((note) => <li key={note}><CircleAlert size={17} /> {note}</li>)}</ul>
              ) : <p className="no-damage"><Check size={18} /> No specific damage was noted during inspection.</p>}
            </div>
          </section>

          <section className="detail-section">
            <div className="section-heading"><span className="section-number">03</span><div><span className="section-kicker">Pricing</span><h2>Auction details</h2></div></div>
            <div className="auction-detail-grid">
              <div><span>Starting bid</span><strong>{formatCurrency(vehicle.startingBid)}</strong></div>
              <div><span>Current bid</span><strong>{vehicle.currentBid ? formatCurrency(vehicle.currentBid) : "No bids yet"}</strong></div>
              <div><span>Bid increment</span><strong>$500 CAD</strong></div>
              <div><span>Reserve</span><strong>{vehicle.reserveStatus === "no-reserve" ? "No reserve" : vehicle.reserveStatus === "met" ? "Met" : "Not met"}</strong></div>
            </div>
          </section>
        </div>

        <aside className="seller-column">
          <section className="seller-card">
            <span className="section-kicker">Selling dealership</span>
            <div className="seller-heading"><div><Building2 size={23} /></div><h2>{vehicle.sellingDealership}</h2></div>
            <p><MapPin size={17} /> {vehicle.city}, {vehicle.province}</p>
            <div className="verified-seller">
              {vehicle.sellerVerified ? <ShieldCheck size={18} /> : <ShieldQuestion size={18} />}
              <span>
                <strong>{vehicle.sellerVerified ? "Verified seller" : "Verification unavailable"}</strong>
                {vehicle.sellerVerified ? "Marketplace credentials confirmed" : "Seller credentials have not been confirmed"}
              </span>
            </div>
          </section>
          <section className="buyer-checklist">
            <h3>Before you bid</h3>
            <ul><li><Check size={16} /> Review all photos</li><li><Check size={16} /> Read damage disclosures</li><li><Check size={16} /> Confirm title status</li><li><Check size={16} /> Verify transport costs</li></ul>
          </section>
        </aside>
      </div>
    </main>
  );
}

function ShareButton() {
  const [shared, setShared] = useState(false);

  async function share() {
    try {
      if (navigator.share) await navigator.share({ title: document.title, url: window.location.href });
      else await navigator.clipboard.writeText(window.location.href);
      setShared(true);
      window.setTimeout(() => setShared(false), 2500);
    } catch {
      // The buyer cancelled the native share dialog.
    }
  }

  return <button type="button" onClick={share}>{shared ? <Check size={17} /> : <Share2 size={17} />}{shared ? "Link copied" : "Share listing"}</button>;
}

function DetailSkeleton() {
  return <main className="detail-skeleton shell"><div className="skeleton detail-title-skeleton"/><div className="skeleton detail-image-skeleton"/><div className="skeleton detail-panel-skeleton"/></main>;
}
