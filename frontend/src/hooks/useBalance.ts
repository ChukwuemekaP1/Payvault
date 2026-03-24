import { useQuery } from "@tanstack/react-query";
import { getWalletBalance } from "../lib/api";
import type { WalletBalance } from "../types";

export const BALANCE_QUERY_KEY = ["wallet", "balance"] as const;

export function useBalance() {
  return useQuery<WalletBalance, Error>({
    queryKey: BALANCE_QUERY_KEY,
    queryFn: getWalletBalance,
    staleTime: 1000 * 60, // 1 minute — SSE keeps it fresher in real time
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
}
