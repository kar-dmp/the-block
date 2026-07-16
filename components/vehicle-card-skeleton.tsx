export function VehicleCardSkeleton() {
  return (
    <div className="vehicle-card skeleton-card" aria-hidden="true">
      <div className="skeleton skeleton-image" />
      <div className="px-[18px] pt-[26px] pb-[14px]">
        <div className="skeleton skeleton-line short" />
        <div className="skeleton skeleton-line title" />
        <div className="skeleton skeleton-line" />
        <div className="skeleton skeleton-footer" />
      </div>
    </div>
  );
}
