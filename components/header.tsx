"use client";

import Link from "next/link";
import { Search } from "lucide-react";

export function Header() {
  function handleInventorySearch(event: React.MouseEvent<HTMLAnchorElement>) {
    const heading = document.getElementById("inventory-heading");

    if (heading) {
      event.preventDefault();
      window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}#inventory`);
      window.dispatchEvent(new Event("blockauto:focus-inventory-search"));
      return;
    }

    window.sessionStorage.setItem("blockauto:focus-inventory-search", "true");
  }

  return (
    <header className="site-header">
      <div className="shell header-inner">
        <Link href="/" className="brand" aria-label="Block Auto home">
          <span className="brand-mark"><span /></span>
          <span>BLOCK<span>AUTO</span></span>
        </Link>
        <nav className="desktop-nav" aria-label="Primary navigation">
          <Link href="/#inventory">Inventory</Link>
          <Link href="/#how-it-works">How it works</Link>
          <Link href="/#about">About</Link>
        </nav>
        <div className="header-actions">
          <Link className="icon-button" href="/#inventory" aria-label="Search inventory" onClick={handleInventorySearch}><Search size={19} /></Link>
        </div>
      </div>
    </header>
  );
}
