const SAVED_VEHICLES_KEY = "blockauto:saved-vehicles";
const SAVED_VEHICLES_EVENT = "blockauto:saved-vehicles-changed";

export function parseSavedVehicleIds(snapshot: string | null) {
  if (!snapshot) return [];

  try {
    const value = JSON.parse(snapshot) as unknown;
    if (!Array.isArray(value)) return [];
    return [...new Set(value.filter((id): id is string => typeof id === "string" && id.length > 0))];
  } catch {
    return [];
  }
}

export function nextSavedVehicleIds(snapshot: string | null, vehicleId: string) {
  const ids = new Set(parseSavedVehicleIds(snapshot));
  if (ids.has(vehicleId)) ids.delete(vehicleId);
  else ids.add(vehicleId);
  return [...ids];
}

export function getSavedVehiclesSnapshot() {
  if (typeof window === "undefined") return "[]";
  try {
    return window.localStorage.getItem(SAVED_VEHICLES_KEY) ?? "[]";
  } catch {
    return "[]";
  }
}

export function getServerSavedVehiclesSnapshot() {
  return "[]";
}

export function subscribeToSavedVehicles(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => undefined;

  const handleStorage = (event: StorageEvent) => {
    if (event.key === SAVED_VEHICLES_KEY) onStoreChange();
  };
  window.addEventListener("storage", handleStorage);
  window.addEventListener(SAVED_VEHICLES_EVENT, onStoreChange);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(SAVED_VEHICLES_EVENT, onStoreChange);
  };
}

export function toggleSavedVehicle(vehicleId: string) {
  try {
    const next = nextSavedVehicleIds(getSavedVehiclesSnapshot(), vehicleId);
    window.localStorage.setItem(SAVED_VEHICLES_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(SAVED_VEHICLES_EVENT));
  } catch {
    // Saving is a browser convenience; inventory remains usable if storage is unavailable.
  }
}
