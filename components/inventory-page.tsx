"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Button,
  FormControl,
  InputAdornment,
  InputLabel,
  MenuItem,
  Pagination,
  PaginationItem,
  Select,
  TextField,
  ToggleButton,
} from "@mui/material";
import { Gavel, Heart, Search, SlidersHorizontal, X } from "lucide-react";
import type { VehicleListResponse } from "@/types/vehicle";
import { VehicleCard } from "@/components/vehicle-card";
import { VehicleCardSkeleton } from "@/components/vehicle-card-skeleton";
import {
  getSavedVehiclesSnapshot,
  getServerSavedVehiclesSnapshot,
  parseSavedVehicleIds,
  subscribeToSavedVehicles,
  toggleSavedVehicle,
} from "@/lib/saved-vehicles";

type SortBy = "auction" | "price" | "year" | "odometer" | "condition";
type SortDirection = "asc" | "desc";

type Filters = {
  search: string;
  make: string;
  bodyStyle: string;
  province: string;
  titleStatus: string;
  minCondition: string;
  savedOnly: boolean;
  userBidsOnly: boolean;
  sortBy: SortBy;
  sortDirection: SortDirection;
  page: number;
};

const EMPTY_FILTERS: Filters = {
  search: "",
  make: "",
  bodyStyle: "",
  province: "",
  titleStatus: "",
  minCondition: "",
  savedOnly: false,
  userBidsOnly: false,
  sortBy: "auction",
  sortDirection: "asc",
  page: 1,
};

const SORT_OPTIONS = new Set<SortBy>(["auction", "price", "year", "odometer", "condition"]);
const DIRECTION_OPTIONS = new Set<SortDirection>(["asc", "desc"]);
const TITLE_OPTIONS = new Set(["clean", "rebuilt", "salvage"]);
const CONDITION_OPTIONS = new Set(["2", "3", "4"]);

const SORT_LABELS: Record<SortBy, string> = {
  auction: "Auction time",
  price: "Current price",
  year: "Model year",
  odometer: "Mileage",
  condition: "Condition grade",
};

const DIRECTION_LABELS: Record<SortBy, Record<SortDirection, string>> = {
  auction: { asc: "Earliest first", desc: "Latest first" },
  price: { asc: "Low to high", desc: "High to low" },
  year: { asc: "Oldest first", desc: "Newest first" },
  odometer: { asc: "Lowest first", desc: "Highest first" },
  condition: { asc: "Lowest first", desc: "Highest first" },
};

function safePage(value: string | null) {
  const page = Number(value);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

function allowed<T extends string>(value: string | null, options: Set<T>, fallback: T): T {
  return value && options.has(value as T) ? value as T : fallback;
}

export function InventoryPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const inventoryRef = useRef<HTMLElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [filters, setFilters] = useState<Filters>(() => ({
    ...EMPTY_FILTERS,
    search: searchParams.get("search") ?? "",
    make: searchParams.get("make") ?? "",
    bodyStyle: searchParams.get("bodyStyle") ?? "",
    province: searchParams.get("province") ?? "",
    titleStatus: allowed(searchParams.get("titleStatus"), TITLE_OPTIONS, ""),
    minCondition: allowed(searchParams.get("minCondition"), CONDITION_OPTIONS, ""),
    savedOnly: searchParams.get("savedOnly") === "true",
    userBidsOnly: searchParams.get("userBidsOnly") === "true",
    sortBy: allowed(searchParams.get("sortBy"), SORT_OPTIONS, "auction"),
    sortDirection: allowed(searchParams.get("sortDirection"), DIRECTION_OPTIONS, "asc"),
    page: safePage(searchParams.get("page")),
  }));
  const [data, setData] = useState<VehicleListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const savedSnapshot = useSyncExternalStore(
    subscribeToSavedVehicles,
    getSavedVehiclesSnapshot,
    getServerSavedVehiclesSnapshot,
  );
  const savedVehicleIds = useMemo(() => new Set(parseSavedVehicleIds(savedSnapshot)), [savedSnapshot]);
  const savedIdsFilter = useMemo(
    () => filters.savedOnly ? [...savedVehicleIds].join(",") : "",
    [filters.savedOnly, savedVehicleIds],
  );

  const activeFilterCount = useMemo(
    () => [filters.make, filters.bodyStyle, filters.province, filters.titleStatus, filters.minCondition, filters.savedOnly, filters.userBidsOnly].filter(Boolean).length,
    [filters],
  );

  useEffect(() => {
    function focusInventorySearch() {
      const heading = document.getElementById("inventory-heading");
      window.requestAnimationFrame(() => {
        heading?.scrollIntoView({ behavior: "smooth", block: "start" });
        searchInputRef.current?.focus({ preventScroll: true });
      });
    }

    window.addEventListener("blockauto:focus-inventory-search", focusInventorySearch);

    if (window.sessionStorage.getItem("blockauto:focus-inventory-search") === "true") {
      window.sessionStorage.removeItem("blockauto:focus-inventory-search");
      focusInventorySearch();
    }

    return () => window.removeEventListener("blockauto:focus-inventory-search", focusInventorySearch);
  }, []);

  const fetchVehicles = useCallback(async (signal: AbortSignal) => {
    setLoading(true);
    setError("");
    const params = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (!value) return;
      if (key === "page" && value === 1) return;
      if (key === "sortBy" && value === "auction") return;
      if (key === "sortDirection" && value === "asc") return;
      params.set(key, String(value));
    });
    if (filters.savedOnly) params.set("savedIds", savedIdsFilter);
    params.set("pageSize", "12");

    try {
      const response = await fetch(`/api/vehicles?${params.toString()}`, { signal });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.error?.message ?? "Could not load inventory");

      const nextData = body as VehicleListResponse;
      setData(nextData);
      const visible = new URLSearchParams(params);
      visible.delete("pageSize");
      visible.delete("savedIds");
      if (nextData.pagination.page > 1) visible.set("page", String(nextData.pagination.page));
      else visible.delete("page");
      router.replace(visible.size ? `/?${visible.toString()}#inventory` : "/#inventory", { scroll: false });
    } catch (caught) {
      if ((caught as Error).name !== "AbortError") {
        setError((caught as Error).message || "Inventory is taking a pit stop. Please try again.");
      }
    } finally {
      if (!signal.aborted) setLoading(false);
    }
  }, [filters, router, savedIdsFilter]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => fetchVehicles(controller.signal), filters.search ? 300 : 0);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [fetchVehicles, filters.search]);

  function updateFilter<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters((current) => ({ ...current, [key]: value, page: key === "page" ? Number(value) : 1 }));
  }

  function clearFilters() {
    setFilters((current) => ({
      ...EMPTY_FILTERS,
      search: current.search,
      sortBy: current.sortBy,
      sortDirection: current.sortDirection,
    }));
  }

  function goToPage(page: number) {
    const totalPages = data?.pagination.totalPages ?? 1;
    updateFilter("page", Math.max(1, Math.min(page, totalPages)));
    window.setTimeout(() => inventoryRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 10);
  }

  const facets = data?.facets ?? { makes: [], bodyStyles: [], provinces: [] };
  const currentPage = data?.pagination.page ?? filters.page;

  return (
    <section className="inventory-section scroll-mt-20" id="inventory" ref={inventoryRef} aria-labelledby="inventory-heading">
      <div className="shell">
        <div className="inventory-heading-row">
          <div>
            <h2 id="inventory-heading" className="scroll-mt-[86px]">Explore inventory</h2>
          </div>
          <p>Every listing includes a condition report and seller details.</p>
        </div>

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_442px]">
          <TextField
            id="inventory-search"
            inputRef={searchInputRef}
            value={filters.search}
            onChange={(event) => updateFilter("search", event.target.value)}
            placeholder="Search make, model, VIN, lot or dealer"
            aria-label="Search inventory"
            fullWidth
            sx={{ "& .MuiOutlinedInput-root": { height: 56, backgroundColor: "#fff" } }}
            slotProps={{
              input: {
                startAdornment: <InputAdornment position="start"><Search size={20} color="#0b5cff" /></InputAdornment>,
                endAdornment: filters.search ? (
                  <InputAdornment position="end">
                    <Button
                      aria-label="Clear search"
                      onClick={() => updateFilter("search", "")}
                      sx={{ minWidth: 36, width: 36, height: 36, borderRadius: "50%", p: 0 }}
                    >
                      <X size={17} />
                    </Button>
                  </InputAdornment>
                ) : undefined,
              },
            }}
          />
          <div className="grid grid-cols-2 gap-3">
            <MuiSelect
              label="Sort by"
              value={filters.sortBy}
              onChange={(value) => updateFilter("sortBy", value as SortBy)}
              options={Object.keys(SORT_LABELS)}
              format={(value) => SORT_LABELS[value as SortBy]}
            />
            <MuiSelect
              label="Direction"
              value={filters.sortDirection}
              onChange={(value) => updateFilter("sortDirection", value as SortDirection)}
              options={["asc", "desc"]}
              format={(value) => DIRECTION_LABELS[filters.sortBy][value as SortDirection]}
            />
          </div>
        </div>

        <div className="mt-3 flex md:hidden">
          <Button
            variant="outlined"
            startIcon={<SlidersHorizontal size={18} />}
            onClick={() => setMobileFiltersOpen((open) => !open)}
            aria-expanded={mobileFiltersOpen}
          >
            Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
          </Button>
        </div>

        <div className={`${mobileFiltersOpen ? "grid" : "hidden"} mt-3 grid-cols-1 gap-3 rounded-xl bg-slate-50 p-3 sm:grid-cols-2 md:grid md:grid-cols-5 md:bg-transparent md:p-0`}>
          <MuiSelect label="Make" value={filters.make} onChange={(value) => updateFilter("make", value)} options={facets.makes} />
          <MuiSelect label="Body style" value={filters.bodyStyle} onChange={(value) => updateFilter("bodyStyle", value)} options={facets.bodyStyles} />
          <MuiSelect label="Province" value={filters.province} onChange={(value) => updateFilter("province", value)} options={facets.provinces} />
          <MuiSelect label="Title" value={filters.titleStatus} onChange={(value) => updateFilter("titleStatus", value)} options={["clean", "rebuilt", "salvage"]} />
          <MuiSelect label="Condition" value={filters.minCondition} onChange={(value) => updateFilter("minCondition", value)} options={["4", "3", "2"]} format={(value) => `${value}.0+`} />
          {activeFilterCount > 0 && (
            <Button className="md:col-span-5 md:justify-self-start" onClick={clearFilters}>Clear all filters</Button>
          )}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2" aria-label="Activity filters" aria-live="polite">
          <span className="mr-1 text-[10px] font-extrabold tracking-[.08em] text-slate-500 uppercase">Quick filters</span>
          <ToggleButton
            value="saved"
            selected={filters.savedOnly}
            onChange={() => updateFilter("savedOnly", !filters.savedOnly)}
            aria-label={`Show saved vehicles, ${savedVehicleIds.size} saved`}
            sx={{
              height: 38,
              gap: 0.75,
              borderRadius: "999px !important",
              px: 1.5,
              color: "#9f1239",
              fontSize: 11,
              fontWeight: 800,
              textTransform: "none",
              "&.Mui-selected, &.Mui-selected:hover": { color: "#fff", backgroundColor: "#e11d48" },
            }}
          >
            <Heart size={15} fill={filters.savedOnly ? "currentColor" : "none"} /> Saved ({savedVehicleIds.size})
          </ToggleButton>
          <ToggleButton
            value="user-bids"
            selected={filters.userBidsOnly}
            onChange={() => updateFilter("userBidsOnly", !filters.userBidsOnly)}
            aria-label={`Show vehicles with your bids, ${data?.activity.userBidVehicleCount ?? 0} vehicles`}
            sx={{
              height: 38,
              gap: 0.75,
              borderRadius: "999px !important",
              px: 1.5,
              color: "#087550",
              fontSize: 11,
              fontWeight: 800,
              textTransform: "none",
              "&.Mui-selected, &.Mui-selected:hover": { color: "#fff", backgroundColor: "#0e9f6e" },
            }}
          >
            <Gavel size={15} /> My bids ({data?.activity.userBidVehicleCount ?? 0})
          </ToggleButton>
        </div>

        <div className="results-row" aria-live="polite">
          <p><strong>{data?.pagination.total ?? "—"}</strong> vehicles found</p>
          {activeFilterCount > 0 && <span>{activeFilterCount} active {activeFilterCount === 1 ? "filter" : "filters"}</span>}
        </div>

        {error ? (
          <div className="empty-state">
            <div className="empty-icon">!</div><h3>We hit a temporary snag</h3><p>{error}</p>
            <Button variant="contained" onClick={() => setFilters((current) => ({ ...current }))}>Try again</Button>
          </div>
        ) : !loading && data?.items.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">0</div><h3>No vehicles match</h3><p>Try broadening your search or removing a filter.</p>
            <Button variant="contained" onClick={clearFilters}>Reset filters</Button>
          </div>
        ) : (
          <div className="vehicle-grid">
            {loading
              ? Array.from({ length: 6 }, (_, index) => <VehicleCardSkeleton key={index} />)
              : data?.items.map((vehicle) => (
                <VehicleCard
                  key={vehicle.id}
                  vehicle={vehicle}
                  saved={savedVehicleIds.has(vehicle.id)}
                  onToggleSaved={() => toggleSavedVehicle(vehicle.id)}
                />
              ))}
          </div>
        )}

        {data && data.pagination.totalPages > 1 && (
          <nav className="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row" aria-label="Inventory pages">
            <Pagination
              count={data.pagination.totalPages}
              page={currentPage}
              onChange={(_event, page) => goToPage(page)}
              renderItem={(item) => item.type === "page" && item.selected ? (
                <SelectedPageInput
                  key={`${currentPage}-${data.pagination.totalPages}`}
                  page={currentPage}
                  totalPages={data.pagination.totalPages}
                  onPageChange={goToPage}
                  disabled={loading}
                />
              ) : <PaginationItem {...item} />}
              showFirstButton
              showLastButton
              siblingCount={1}
              boundaryCount={1}
              disabled={loading}
              color="primary"
              shape="rounded"
              size="large"
              sx={{
                maxWidth: "100%",
                "& .MuiPagination-ul": {
                  justifyContent: "center",
                  flexWrap: "wrap",
                  rowGap: 1,
                },
                "@media (max-width: 600px)": {
                  "& .MuiPaginationItem-firstLast": { display: "none" },
                  "& .MuiPaginationItem-root": { mx: "1px" },
                },
              }}
            />
          </nav>
        )}
      </div>
    </section>
  );
}

function MuiSelect({
  label,
  value,
  options,
  onChange,
  format = (option) => option.charAt(0).toUpperCase() + option.slice(1),
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  format?: (value: string) => string;
}) {
  const labelId = `${label.toLowerCase().replaceAll(" ", "-")}-label`;
  const includesAll = !["Sort by", "Direction"].includes(label);
  return (
    <FormControl fullWidth sx={{ backgroundColor: "#fff" }}>
      <InputLabel id={labelId} shrink={includesAll || undefined}>{label}</InputLabel>
      <Select
        labelId={labelId}
        label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        displayEmpty={includesAll}
        renderValue={includesAll ? (selected) => selected ? format(String(selected)) : "All" : undefined}
        sx={{ height: 56, fontWeight: 650, fontSize: 14 }}
      >
        {includesAll && <MenuItem value="">All</MenuItem>}
        {options.map((option) => <MenuItem value={option} key={option}>{format(option)}</MenuItem>)}
      </Select>
    </FormControl>
  );
}

function SelectedPageInput({
  page,
  totalPages,
  onPageChange,
  disabled,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  disabled: boolean;
}) {
  const [value, setValue] = useState(String(page));
  const submittingRef = useRef(false);

  function submit() {
    if (submittingRef.current) return;
    const requested = Number(value);
    const nextPage = value && Number.isInteger(requested)
      ? Math.max(1, Math.min(requested, totalPages))
      : page;
    setValue(String(nextPage));
    if (nextPage !== page) {
      submittingRef.current = true;
      onPageChange(nextPage);
    }
  }

  return (
    <div className="flex h-11 items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-2 shadow-sm">
      <label
        htmlFor="pagination-page-input"
        className="whitespace-nowrap text-[10px] font-extrabold tracking-[.08em] text-blue-900 uppercase"
      >
        Go to
      </label>
      <TextField
        id="pagination-page-input"
        value={value}
        type="number"
        onChange={(event) => {
          submittingRef.current = false;
          setValue(event.target.value.replace(/\D/g, ""));
        }}
        onFocus={(event) => event.currentTarget.select()}
        onBlur={submit}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            submit();
            event.currentTarget.blur();
          }
        }}
        disabled={disabled}
        sx={{
          width: Math.max(46, String(totalPages).length * 12 + 22),
          "& .MuiOutlinedInput-root": {
            height: 32,
            borderRadius: "7px",
            backgroundColor: "#fff",
            "& fieldset": { borderWidth: 2, borderColor: "#0b5cff" },
            "&:hover fieldset, &.Mui-focused fieldset": { borderColor: "#0647d8" },
          },
          "& .MuiOutlinedInput-input": {
            height: 32,
            boxSizing: "border-box",
            p: "0 4px",
            textAlign: "center",
            color: "#0b5cff",
            fontSize: 14,
            fontWeight: 850,
            MozAppearance: "textfield",
          },
          "& input::-webkit-outer-spin-button, & input::-webkit-inner-spin-button": {
            margin: 0,
            WebkitAppearance: "none",
          },
        }}
        slotProps={{
          htmlInput: {
            min: 1,
            max: totalPages,
            step: 1,
            inputMode: "numeric",
            "aria-current": "page",
            "aria-label": `Go to page. Current page ${page}. Enter a page from 1 to ${totalPages} and press Enter`,
            title: `Type a page from 1 to ${totalPages} and press Enter`,
          },
        }}
      />
      <span className="whitespace-nowrap text-[11px] font-bold text-blue-900">of {totalPages}</span>
    </div>
  );
}
