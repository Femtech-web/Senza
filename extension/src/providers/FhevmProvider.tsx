import React, { createContext, useContext } from "react";
import type { FhevmInstance } from "../fhevm";
import { useFhevm, type FhevmGoState } from "../fhevm";
import { useEffect } from "react";

type Ctx = {
  instance: FhevmInstance | undefined;
  status: FhevmGoState;
  error: Error | undefined;
  refresh: () => void;
};

const FhevmContext = createContext<Ctx | undefined>(undefined);

export function FhevmProvider({
  children,
  provider,
  chainId,
}: {
  children: React.ReactNode;
  provider: string | any | undefined;
  chainId: number | undefined;
}) {
  useEffect(() => {
    console.log("[Senza:FHE] Provider input changed", { provider, chainId });
  }, [provider, chainId]);

  const { instance, status, error, refresh } = useFhevm({
    provider,
    chainId,
    enabled: true,
  });

  useEffect(() => {
    console.log("[Senza:FHE] Status update", {
      status,
      hasInstance: Boolean(instance),
      error: error ? (error.message || String(error)) : null,
      chainId,
    });
  }, [status, instance, error, chainId]);

  return (
    <FhevmContext.Provider value={{ instance, status, error, refresh }}>
      {children}
    </FhevmContext.Provider>
  );
}

export function useFhevmContext() {
  const ctx = useContext(FhevmContext);
  if (!ctx) throw new Error("useFhevmContext must be used within FhevmProvider");
  return ctx;
}
