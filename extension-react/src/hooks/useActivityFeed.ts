import { useCallback, useMemo, useState, useEffect } from "react";
import { ethers } from "ethers";
import type { SymbolKey } from "../config/tokens";
import { subgraphClient } from "../lib/subgraphClient";
import { ACTIVITY_QUERY } from "../lib/queries/activity";
import useSWR from "swr";

export type ActivityItem = {
  id: string;
  title: string;
  subtitle: string;
  timestamp: string;
  status: string;
  txHash: string;
  blockNumber?: number;
  logIndex?: number;
};

type TokenConfig = {
  cToken: string;
  underlying: string;
};

type TokensMap = Record<SymbolKey, TokenConfig>;

type PendingTx = {
  txHash: string;
  title: string;
  subtitle: string;
  createdAt: number;
};

const formatTimestamp = (value?: number) => {
  if (!value) return "-";
  const date = new Date(value * 1000);
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
};

const formatPendingTime = (value: number) => {
  const date = new Date(value);
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
};


export function useActivityFeed({
  provider,
  address,
  tokens,
}: {
  provider?: ethers.JsonRpcProvider;
  address?: string;
  tokens: TokensMap;
}) {
  const [pending, setPending] = useState<PendingTx[]>([]);
  const [loading, setLoading] = useState(false);

  const tokenEntries = useMemo(() => Object.entries(tokens) as [SymbolKey, TokenConfig][], [tokens]);

  const trackPending = useCallback((txHash: string, title: string, subtitle: string) => {
    setPending((prev) => [{ txHash, title, subtitle, createdAt: Date.now() }, ...prev]);
  }, []);

  const swrKey = address ? ["token-activity", address.toLowerCase()] : null;
  const { data, error, isValidating, mutate } = useSWR(
    swrKey,
    async () => {
      const response = await subgraphClient.request<{
        tokenActivities: Array<{
          id: string;
          activityType: string;
          token: string;
          counterparty?: string;
          encryptedAmount?: string;
          clearAmount?: string;
          timestamp: string;
          transactionHash: string;
          blockNumber: string;
        }>;
      }>(ACTIVITY_QUERY, {
        actor: address?.toLowerCase(),
        first: 100,
        skip: 0,
      });
      return response.tokenActivities;
    },
    {
      refreshInterval: 15000,
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
    }
  );

  const items = useMemo(() => {
    const entries: ActivityItem[] = (data ?? []).map((activity: any) => {
      const tokenSymbol = tokenEntries.find(
        ([, token]) =>
          token.cToken.toLowerCase() === activity.token.toLowerCase()
      )?.[0];
      const symbol = tokenSymbol ?? "USDC";
      const counterparty = activity.counterparty ?? "";

      let title = "";
      let subtitle = "";
      switch (activity.activityType) {
        case "WRAP":
          title = `Wrap ${symbol}`;
          subtitle = `-${symbol} → c${symbol}`;
          break;
        case "UNWRAP_REQUEST":
          title = `Unwrap ${symbol}`;
          subtitle = `Request from c${symbol}`;
          break;
        case "UNWRAP_FINALIZED":
          title = `Unwrap ${symbol}`;
          subtitle = `Finalized +${symbol}`;
          break;
        case "CONFIDENTIAL_TRANSFER_OUT":
          title = `Confidential send c${symbol}`;
          subtitle = `Encrypted amount → ${counterparty.slice(0, 6)}...`;
          break;
        case "CONFIDENTIAL_TRANSFER_IN":
          title = `Confidential receive c${symbol}`;
          subtitle = `Encrypted amount ← ${counterparty.slice(0, 6)}...`;
          break;
        default:
          title = `${activity.activityType} ${symbol}`;
          subtitle = counterparty ? `Counterparty ${counterparty.slice(0, 6)}...` : "";
      }

      return {
        id: activity.id,
        title,
        subtitle,
        timestamp: formatTimestamp(Number(activity.timestamp)),
        status: "confirmed",
        txHash: activity.transactionHash,
        blockNumber: Number(activity.blockNumber),
      };
    });

    const pendingItems: ActivityItem[] = [];
    const stillPending: PendingTx[] = [];

    for (const tx of pending) {
      pendingItems.push({
        id: `${tx.txHash}-pending`,
        title: tx.title,
        subtitle: tx.subtitle,
        timestamp: formatPendingTime(tx.createdAt),
        status: "pending",
        txHash: tx.txHash,
      });
      stillPending.push(tx);
    }

    if (stillPending.length !== pending.length) {
      setPending(stillPending);
    }

    const merged = [...pendingItems, ...entries];
    const seen = new Set<string>();
    const deduped = merged.filter((item) => {
      if (seen.has(item.txHash)) return false;
      seen.add(item.txHash);
      return true;
    });

    deduped.sort((a, b) => {
      if ((a.blockNumber ?? 0) !== (b.blockNumber ?? 0)) {
        return (b.blockNumber ?? 0) - (a.blockNumber ?? 0);
      }
      return (b.logIndex ?? 0) - (a.logIndex ?? 0);
    });

    return deduped.slice(0, 100);
  }, [data, pending, tokenEntries]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      await mutate();
    } finally {
      setLoading(false);
    }
  }, [mutate]);

  useEffect(() => {
    setPending([]);
  }, [address]);

  return {
    items,
    loading: loading || isValidating,
    refresh,
    trackPending,
    pendingCount: pending.length,
    pendingItems: pending,
    error,
  };
}
