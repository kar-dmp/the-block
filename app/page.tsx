import { Suspense } from "react";
import { Header } from "@/components/header";
import { InventoryPage } from "@/components/inventory-page";

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <section className="hero shell" aria-labelledby="hero-title">
          <div className="hero-copy">
            <span className="eyebrow"><span className="live-dot" /> Dealer-only marketplace</span>
            <h1 id="hero-title">Bid with the<br /><em>whole picture.</em></h1>
            <p>
              Inspected wholesale inventory, transparent condition reports, and a bidding
              experience built for confident decisions.
            </p>
            <div className="hero-trust" aria-label="Marketplace highlights">
              <span><strong>200</strong> vehicles</span>
              <span><strong>32</strong> trusted sellers</span>
              <span><strong>7</strong> provinces</span>
            </div>
          </div>
          <div className="hero-visual" aria-hidden="true">
            <div className="hero-card hero-card-back">
              <span>Condition</span><strong>4.7</strong><small>Excellent</small>
            </div>
            <div className="hero-card hero-card-main">
              <div className="hero-car-shape">
                <div className="hero-car-window" />
                <div className="hero-wheel hero-wheel-one" />
                <div className="hero-wheel hero-wheel-two" />
              </div>
              <div className="hero-card-meta">
                <div><small>Current bid</small><strong>$28,500</strong></div>
                <span>12 bids</span>
              </div>
            </div>
            <div className="hero-card hero-card-float">
              <span className="shield-check">✓</span>
              <div><strong>Inspected</strong><small>Condition verified</small></div>
            </div>
          </div>
        </section>

        <Suspense fallback={<div className="shell inventory-loading">Loading inventory…</div>}>
          <InventoryPage />
        </Suspense>

        <section className="buyer-promise" id="how-it-works" aria-labelledby="promise-title">
          <div className="shell">
            <span className="section-kicker">Built for better decisions</span>
            <h2 id="promise-title">From inspection to winning bid.</h2>
            <div className="promise-grid">
              <article><span>01</span><h3>Find the right unit</h3><p>Search and filter wholesale inventory by the details that matter to your lot.</p></article>
              <article><span>02</span><h3>Know what you’re buying</h3><p>Review vehicle specifications, condition grades, title status, photos, and disclosures.</p></article>
              <article><span>03</span><h3>Bid with confidence</h3><p>See the latest price and reserve state before confirming a securely recorded bid.</p></article>
            </div>
          </div>
        </section>

        <footer className="site-footer" id="about">
          <div className="shell footer-inner">
            <div className="brand footer-brand"><span className="brand-mark"><span /></span><span>BLOCK<span>AUTO</span></span></div>
            <p>A focused buyer-side auction prototype built for the OPENLANE coding challenge.</p>
            <span>© 2026 Block Auto</span>
          </div>
        </footer>
      </main>
    </>
  );
}
