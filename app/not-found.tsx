import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Header } from "@/components/header";

export default function NotFound() {
  return (
    <>
      <Header />
      <main className="not-found shell">
        <span>404</span>
        <h1>This vehicle has left the lot.</h1>
        <p>The listing may have moved, or the address may be incorrect.</p>
        <Link href="/"><ArrowLeft size={18} /> Back to inventory</Link>
      </main>
    </>
  );
}
