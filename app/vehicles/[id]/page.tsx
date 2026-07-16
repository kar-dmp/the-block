import { Header } from "@/components/header";
import { VehicleDetailPage } from "@/components/vehicle-detail-page";

export default async function VehiclePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <>
      <Header />
      <VehicleDetailPage id={id} />
    </>
  );
}
