import React from "react";
import type { SymbolKey } from "../config/tokens";

type BalanceState = {
  underlying: string;
};

type Props = {
  address?: string;
  ethBalance: string;
  loadingBalances: boolean;
  balances: Record<SymbolKey, BalanceState>;
  selectedAsset: SymbolKey;
  onRefresh: () => void;
  onSelectAsset: (symbol: SymbolKey) => void;
};

export function OverviewView({
  address,
  ethBalance,
  loadingBalances,
  balances,
  selectedAsset,
  onRefresh,
  onSelectAsset,
}: Props) {
  return (
    <section className="card overview-card">
      <div className="section-header">
        <div>
          <p className="section-title">Account overview</p>
          <p className="note">Primary wallet + assets snapshot.</p>
        </div>
        <button className="btn secondary" onClick={onRefresh} disabled={loadingBalances}>
          {loadingBalances ? "Refreshing..." : "Refresh"}
        </button>
      </div>
      <div className="stats">
        <div>
          <p className="stat-label">Address</p>
          <p className="stat-value mono">{address ?? "-"}</p>
        </div>
        <div>
          <p className="stat-label">ETH balance</p>
          <p className="stat-value">{ethBalance}</p>
        </div>
      </div>
      <div className="divider" />
      <p className="section-title">Assets</p>
      <div className="asset-list">
        {(["USDC", "USDT"] as SymbolKey[]).map((symbol) => (
          <button
            key={symbol}
            className={`asset ${selectedAsset === symbol ? "active" : ""}`}
            onClick={() => onSelectAsset(symbol)}
          >
            <div>
              <p className="stat-label">{symbol}</p>
              <p className="stat-value">{balances[symbol].underlying}</p>
            </div>
            <span className="pill subtle">c{symbol}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
