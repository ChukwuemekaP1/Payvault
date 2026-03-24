import * as React from "react";
import { Search, X, SlidersHorizontal, Download } from "lucide-react";
import { cn } from "../lib/utils";
import {
  useInfiniteTransactions,
  flattenTransactionPages,
} from "../hooks/useTransactions";
import { useAuthStore } from "../store/authStore";
import { NavBar } from "../components/layout/NavBar";
import {
  TransactionItem,
  TransactionItemSkeleton,
  TransactionEmptyState,
} from "../components/common/TransactionItem";
import { LoadingSpinner } from "../components/common/LoadingSpinner";

// ─── Filter Types ─────────────────────────────────────────────────────────────

type FilterType = "all" | "credit" | "transfer";

interface FilterOption {
  value: FilterType;
  label: string;
  emoji: string;
}

const FILTER_OPTIONS: FilterOption[] = [
  { value: "all", label: "All", emoji: "📋" },
  { value: "credit", label: "Credit", emoji: "💚" },
  { value: "transfer", label: "Transfer", emoji: "🔁" },
];

// ─── Filter Tabs ──────────────────────────────────────────────────────────────

interface FilterTabsProps {
  active: FilterType;
  onChange: (value: FilterType) => void;
}

const FilterTabs: React.FC<FilterTabsProps> = ({ active, onChange }) => (
  <div
    role="tablist"
    aria-label="Transaction type filter"
    className={cn(
      "flex items-center gap-1 rounded-2xl border border-border bg-surface p-1",
      "overflow-x-auto scrollbar-none"
    )}
  >
    {FILTER_OPTIONS.map((opt) => {
      const isActive = active === opt.value;
      return (
        <button
          key={opt.value}
          role="tab"
          aria-selected={isActive}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            "relative flex shrink-0 items-center gap-1.5 rounded-xl px-4 py-2",
            "font-sans text-sm font-medium",
            "transition-all duration-150 ease-out",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
            isActive
              ? [
                  "bg-primary text-white shadow-glow-sm",
                  "hover:bg-[#e64d20]",
                ]
              : [
                  "bg-transparent text-muted",
                  "hover:bg-white/[0.04] hover:text-text",
                ]
          )}
        >
          <span className="text-sm leading-none select-none" aria-hidden="true">
            {opt.emoji}
          </span>
          {opt.label}
        </button>
      );
    })}
  </div>
);

// ─── Search Bar ───────────────────────────────────────────────────────────────

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  resultCount: number | null;
}

const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChange,
  resultCount,
}) => (
  <div className="relative flex items-center">
    {/* Search icon */}
    <div
      className="pointer-events-none absolute left-3.5 flex items-center"
      aria-hidden="true"
    >
      <Search className="h-4 w-4 text-muted" />
    </div>

    <input
      type="search"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Search by reference…"
      aria-label="Search transactions by reference"
      className={cn(
        "flex h-11 w-full rounded-xl border border-border bg-surface",
        "pl-10 pr-10 py-2.5",
        "font-sans text-sm text-text placeholder:text-muted",
        "outline-none ring-offset-background",
        "focus:border-primary focus:ring-2 focus:ring-primary/20",
        "transition-colors duration-150 ease-in-out",
        "[&::-webkit-search-cancel-button]:hidden"
      )}
    />

    {/* Clear button */}
    {value && (
      <button
        type="button"
        onClick={() => onChange("")}
        aria-label="Clear search"
        className={cn(
          "absolute right-3 flex h-6 w-6 items-center justify-center rounded-lg",
          "text-muted border border-transparent",
          "hover:text-text hover:bg-white/[0.06] hover:border-border",
          "transition-colors duration-150",
          "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/60"
        )}
      >
        <X className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    )}

    {/* Live result count — screen readers */}
    {resultCount !== null && (
      <span className="sr-only" aria-live="polite" aria-atomic="true">
        {resultCount === 0
          ? "No transactions match your search"
          : `${resultCount} transaction${resultCount !== 1 ? "s" : ""} found`}
      </span>
    )}
  </div>
);

// ─── Active Filter Summary ─────────────────────────────────────────────────────

interface ActiveFilterSummaryProps {
  filter: FilterType;
  search: string;
  total: number;
  isLoading: boolean;
  onClearFilter: () => void;
  onClearSearch: () => void;
}

const ActiveFilterSummary: React.FC<ActiveFilterSummaryProps> = ({
  filter,
  search,
  total,
  isLoading,
  onClearFilter,
  onClearSearch,
}) => {
  const hasFilter = filter !== "all";
  const hasSearch = search.trim() !== "";

  if (!hasFilter && !hasSearch) {
    return (
      <p className="font-sans text-sm text-muted" aria-live="polite">
        {isLoading ? (
          <span className="inline-block h-4 w-24 animate-pulse rounded-md bg-[#222228]" />
        ) : (
          <>
            {total > 0 ? (
              <>
                Showing{" "}
                <span className="font-semibold text-text">{total}</span>{" "}
                transaction{total !== 1 ? "s" : ""}
              </>
            ) : (
              "No transactions yet"
            )}
          </>
        )}
      </p>
    );
  }

  return (
    <div
      className="flex flex-wrap items-center gap-2"
      aria-live="polite"
      aria-atomic="true"
    >
      <p className="font-sans text-sm text-muted">
        {isLoading ? (
          <span className="inline-block h-4 w-24 animate-pulse rounded-md bg-[#222228]" />
        ) : (
          <>
            <span className="font-semibold text-text">{total}</span> result
            {total !== 1 ? "s" : ""}
          </>
        )}
      </p>

      {hasFilter && (
        <button
          type="button"
          onClick={onClearFilter}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/8 px-2.5 py-1",
            "font-sans text-xs font-medium text-primary",
            "hover:bg-primary/15 hover:border-primary/50",
            "transition-colors duration-150",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
          )}
        >
          {FILTER_OPTIONS.find((o) => o.value === filter)?.label}
          <X className="h-3 w-3" aria-hidden="true" />
        </button>
      )}

      {hasSearch && (
        <button
          type="button"
          onClick={onClearSearch}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1",
            "font-sans text-xs font-medium text-muted",
            "hover:border-[#3a3a42] hover:text-text",
            "transition-colors duration-150",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
          )}
        >
          "{search.length > 12 ? `${search.slice(0, 12)}…` : search}"
          <X className="h-3 w-3" aria-hidden="true" />
        </button>
      )}
    </div>
  );
};

// ─── Skeleton Rows ────────────────────────────────────────────────────────────

const SkeletonRows: React.FC<{ count?: number }> = ({ count = 5 }) => (
  <div role="status" aria-label="Loading transactions">
    {Array.from({ length: count }).map((_, i) => (
      <TransactionItemSkeleton key={i} />
    ))}
    <span className="sr-only">Loading transactions…</span>
  </div>
);

// ─── Transactions Page ────────────────────────────────────────────────────────

const Transactions: React.FC = () => {
  const { user } = useAuthStore();

  // ── Filter state ──────────────────────────────────────────────────────────
  const [activeFilter, setActiveFilter] = React.useState<FilterType>("all");
  const [searchQuery, setSearchQuery] = React.useState("");

  // ── Infinite query ────────────────────────────────────────────────────────
  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    isError,
    error,
  } = useInfiniteTransactions({
    type: activeFilter === "all" ? undefined : activeFilter,
    limit: 20,
  });

  // Flatten all pages into a single transaction array
  const allTransactions = React.useMemo(
    () => flattenTransactionPages(data),
    [data]
  );

  // ── Client-side search filter ─────────────────────────────────────────────
  const filteredTransactions = React.useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return allTransactions;
    return allTransactions.filter(
      (tx) =>
        tx.reference.toLowerCase().includes(query) ||
        tx.id.toLowerCase().includes(query) ||
        tx.type.toLowerCase().includes(query) ||
        tx.status.toLowerCase().includes(query)
    );
  }, [allTransactions, searchQuery]);

  // Total (server-side) from last page metadata
  const serverTotal = data?.pages[data.pages.length - 1]?.total ?? 0;
  // Display count respects client-side search
  const displayCount = searchQuery.trim()
    ? filteredTransactions.length
    : serverTotal;

  // ── IntersectionObserver sentinel for infinite scroll ─────────────────────
  const sentinelRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (
          entry &&
          entry.isIntersecting &&
          hasNextPage &&
          !isFetchingNextPage &&
          !isLoading
        ) {
          fetchNextPage();
        }
      },
      {
        root: null,
        rootMargin: "200px", // trigger 200px before the sentinel is visible
        threshold: 0,
      }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, isLoading]);

  // ── Reset filters when type filter changes ────────────────────────────────
  const handleFilterChange = (filter: FilterType) => {
    setActiveFilter(filter);
    // Keep search across filter changes — it's client-side only
  };

  // ── PDF Export handler ────────────────────────────────────────────────────
  const handleExportPDF = () => {
    window.print();
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background text-text font-sans antialiased">
      <NavBar />

      {/* Ambient glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 overflow-hidden"
      >
        <div className="absolute top-0 right-1/4 h-96 w-96 rounded-full bg-primary/5 blur-[100px]" />
      </div>

      <main className="relative z-10 mx-auto max-w-3xl px-4 pb-20 pt-8 sm:px-6">

        {/* ── Page header ── */}
        <div className="mb-8 flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20"
                aria-hidden="true"
              >
                <SlidersHorizontal className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="font-serif text-3xl text-text leading-tight">
                  Transactions
                </h1>
                <p className="font-sans text-sm text-muted leading-snug">
                  Your complete payment history
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleExportPDF}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-border bg-surface text-sm font-medium text-muted hover:text-text hover:border-primary/40 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 print:hidden"
              title="Export as PDF"
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Export PDF</span>
            </button>
          </div>
        </div>

        {/* ── Controls: search + filter ── */}
        <div
          className={cn(
            "sticky top-16 z-20",
            "mb-6 flex flex-col gap-3",
            "rounded-2xl border border-border bg-background/95 backdrop-blur-md",
            "px-4 py-4 shadow-[0_4px_24px_rgba(0,0,0,0.35)]"
          )}
        >
          {/* Search */}
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            resultCount={
              searchQuery.trim() ? filteredTransactions.length : null
            }
          />

          {/* Filter tabs */}
          <FilterTabs active={activeFilter} onChange={handleFilterChange} />

          {/* Active filter summary */}
          <ActiveFilterSummary
            filter={activeFilter}
            search={searchQuery}
            total={displayCount}
            isLoading={isLoading}
            onClearFilter={() => setActiveFilter("all")}
            onClearSearch={() => setSearchQuery("")}
          />
        </div>

        {/* ── Transaction list ── */}
        <div
          className={cn(
            "rounded-2xl border border-border bg-surface overflow-hidden",
            "shadow-card"
          )}
          aria-label="Transaction list"
        >
          {/* Initial loading state */}
          {isLoading && <SkeletonRows count={8} />}

          {/* Error state */}
          {isError && !isLoading && (
            <div className="flex flex-col items-center gap-4 px-6 py-16 text-center">
              <div
                className={cn(
                  "flex h-14 w-14 items-center justify-center rounded-2xl",
                  "bg-error/10 border border-error/25"
                )}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#FF3B3B"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </div>
              <div className="space-y-1">
                <p className="font-sans text-base font-semibold text-text">
                  Failed to load transactions
                </p>
                <p className="font-sans text-sm text-muted leading-relaxed max-w-sm">
                  {error?.message ?? "Please check your connection and try again."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className={cn(
                  "inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2",
                  "font-sans text-sm font-medium text-muted",
                  "hover:border-[#3a3a42] hover:text-text hover:bg-[#222228]",
                  "transition-colors duration-150",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                )}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <polyline points="23 4 23 10 17 10" />
                  <polyline points="1 20 1 14 7 14" />
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                </svg>
                Retry
              </button>
            </div>
          )}

          {/* Search empty state */}
          {!isLoading &&
            !isError &&
            searchQuery.trim() !== "" &&
            filteredTransactions.length === 0 && (
              <div className="flex flex-col items-center gap-4 px-6 py-16 text-center">
                <div
                  className={cn(
                    "flex h-14 w-14 items-center justify-center rounded-2xl",
                    "bg-surface border border-border"
                  )}
                  aria-hidden="true"
                >
                  <Search className="h-6 w-6 text-muted" />
                </div>
                <div className="space-y-1.5">
                  <p className="font-sans text-base font-semibold text-text">
                    No results found
                  </p>
                  <p className="font-sans text-sm text-muted leading-relaxed max-w-xs">
                    No transactions match{" "}
                    <span className="font-mono text-text">
                      "{searchQuery}"
                    </span>
                    . Try a different reference or clear the search.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2",
                    "font-sans text-sm font-medium text-muted",
                    "hover:border-[#3a3a42] hover:text-text",
                    "transition-colors duration-150",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                  )}
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                  Clear search
                </button>
              </div>
            )}

          {/* Fully empty state (no transactions at all for this filter) */}
          {!isLoading &&
            !isError &&
            searchQuery.trim() === "" &&
            allTransactions.length === 0 && (
              <TransactionEmptyState
                message={
                  activeFilter === "all"
                    ? "No transactions yet"
                    : `No ${activeFilter} transactions found`
                }
              />
            )}

          {/* Transaction rows */}
          {!isLoading && !isError && filteredTransactions.length > 0 && (
            <ul role="list" aria-label="Transactions">
              {filteredTransactions.map((tx) => (
                <li key={tx.id}>
                  <TransactionItem
                    transaction={tx}
                    currentUserId={user?.user_id}
                    showStatus
                    showFullDate
                    clickable
                  />
                </li>
              ))}
            </ul>
          )}

          {/* Fetch-next-page loading indicator (inside card, below list) */}
          {isFetchingNextPage && (
            <div
              className="flex items-center justify-center gap-3 border-t border-border/60 py-5"
              role="status"
              aria-live="polite"
            >
              <LoadingSpinner size="sm" variant="muted" />
              <span className="font-sans text-sm text-muted">
                Loading more transactions…
              </span>
            </div>
          )}
        </div>

        {/* ── End-of-list message ── */}
        {!isLoading &&
          !isError &&
          !hasNextPage &&
          allTransactions.length > 0 &&
          searchQuery.trim() === "" && (
            <p
              className={cn(
                "mt-6 text-center font-sans text-xs text-muted/50",
                "select-none"
              )}
              aria-live="polite"
            >
              You've reached the end of your transaction history{" "}
              <span aria-hidden="true">·</span>{" "}
              {serverTotal} transaction{serverTotal !== 1 ? "s" : ""} total
            </p>
          )}

        {/* Load-more hint when not at end */}
        {!isLoading &&
          !isError &&
          hasNextPage &&
          !isFetchingNextPage &&
          searchQuery.trim() === "" && (
            <p className="mt-4 text-center font-sans text-xs text-muted/40 select-none">
              Scroll down to load more
            </p>
          )}

        {/* ── Infinite scroll sentinel ── */}
        {/*
         * This invisible div sits at the bottom of the page.
         * When it enters the viewport the IntersectionObserver fires fetchNextPage().
         * We only render it when there are more pages to load and we're not already fetching.
         */}
        <div
          ref={sentinelRef}
          aria-hidden="true"
          className="h-1 w-full"
          data-testid="infinite-scroll-sentinel"
        />
      </main>
    </div>
  );
};

export default Transactions;
