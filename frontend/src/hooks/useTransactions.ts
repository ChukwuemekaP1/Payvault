import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { getTransactions, getTransactionById } from "../lib/api";
import type { TransactionsResponse, Transaction } from "../types";

// ─── Query Keys ───────────────────────────────────────────────────────────────

export const transactionKeys = {
  all: ["transactions"] as const,
  lists: () => [...transactionKeys.all, "list"] as const,
  list: (type?: string) => [...transactionKeys.lists(), { type }] as const,
  details: () => [...transactionKeys.all, "detail"] as const,
  detail: (id: string) => [...transactionKeys.details(), id] as const,
};

// ─── Infinite Transactions Hook ───────────────────────────────────────────────

interface UseInfiniteTransactionsOptions {
  type?: string;
  limit?: number;
  enabled?: boolean;
}

export function useInfiniteTransactions(options: UseInfiniteTransactionsOptions = {}) {
  const { type, limit = 20, enabled = true } = options;

  return useInfiniteQuery<TransactionsResponse, Error>({
    queryKey: transactionKeys.list(type),
    queryFn: ({ pageParam }) => {
      const page = typeof pageParam === "number" ? pageParam : 1;
      return getTransactions({ page, limit, type });
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const { page, limit: pageLimit, total } = lastPage;
      const totalLoaded = page * pageLimit;
      if (totalLoaded >= total) return undefined;
      return page + 1;
    },
    enabled,
    staleTime: 1000 * 60, // 1 minute
  });
}

// ─── Flat Transactions Selector ───────────────────────────────────────────────

/**
 * Flatten all pages from an infinite query into a single Transaction array.
 */
export function flattenTransactionPages(
  data: { pages: TransactionsResponse[] } | undefined
): Transaction[] {
  if (!data) return [];
  return data.pages.flatMap((page) => page.transactions);
}

// ─── Single Page Transactions Hook ───────────────────────────────────────────

interface UseTransactionsOptions {
  page?: number;
  limit?: number;
  type?: string;
  enabled?: boolean;
}

export function useTransactions(options: UseTransactionsOptions = {}) {
  const { page = 1, limit = 20, type, enabled = true } = options;

  return useQuery<TransactionsResponse, Error>({
    queryKey: [...transactionKeys.list(type), page, limit],
    queryFn: () => getTransactions({ page, limit, type }),
    enabled,
    staleTime: 1000 * 60,
    placeholderData: (previousData) => previousData,
  });
}

// ─── Single Transaction Hook ──────────────────────────────────────────────────

export function useTransaction(id: string | undefined) {
  return useQuery<Transaction, Error>({
    queryKey: transactionKeys.detail(id ?? ""),
    queryFn: () => {
      if (!id) throw new Error("Transaction ID is required");
      return getTransactionById(id);
    },
    enabled: Boolean(id),
    staleTime: 1000 * 60 * 5, // 5 minutes — receipts don't change
  });
}
