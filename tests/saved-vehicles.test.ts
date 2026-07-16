import { describe, expect, it } from "vitest";
import { nextSavedVehicleIds, parseSavedVehicleIds } from "@/lib/saved-vehicles";

describe("saved vehicle storage", () => {
  it("parses unique vehicle ids and ignores invalid values", () => {
    expect(parseSavedVehicleIds('["vehicle-1","vehicle-1",42,"vehicle-2"]')).toEqual([
      "vehicle-1",
      "vehicle-2",
    ]);
    expect(parseSavedVehicleIds("not-json")).toEqual([]);
  });

  it("adds and removes a saved vehicle", () => {
    expect(nextSavedVehicleIds("[]", "vehicle-1")).toEqual(["vehicle-1"]);
    expect(nextSavedVehicleIds('["vehicle-1","vehicle-2"]', "vehicle-1")).toEqual(["vehicle-2"]);
  });
});
