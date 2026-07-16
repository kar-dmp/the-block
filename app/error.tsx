"use client";

import { useEffect } from "react";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => console.error(error), [error]);
  return (
    <main className="detail-error shell">
      <div className="empty-icon">!</div>
      <h1>Something took an unexpected turn.</h1>
      <p>Please try the request again.</p>
      <button className="primary-bid-button" type="button" onClick={reset}>Try again</button>
    </main>
  );
}
