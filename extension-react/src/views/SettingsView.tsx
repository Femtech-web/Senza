import React from "react";
import type { AppConfig, SymbolKey } from "../config/tokens";

type Props = {
  rpcDraft: string;
  networkLabel: string;
  selectedAsset: SymbolKey;
  cfg: AppConfig;
  autoLockMinutes: number;
  busyAction: string | null;
  resetConfirm: boolean;
  onRpcDraft: (value: string) => void;
  onSaveRpc: () => void;
  onSelectAsset: (asset: SymbolKey) => void;
  onTokenChange: (asset: SymbolKey, field: "cToken" | "underlying", value: string) => void;
  onSaveTokens: () => void;
  onAutoLockMinutes: (value: number) => void;
  onAskReset: () => void;
  onCancelReset: () => void;
  onConfirmReset: () => void;
};

export function SettingsView({
  rpcDraft,
  networkLabel,
  selectedAsset,
  cfg,
  autoLockMinutes,
  busyAction,
  resetConfirm,
  onRpcDraft,
  onSaveRpc,
  onSelectAsset,
  onTokenChange,
  onSaveTokens,
  onAutoLockMinutes,
  onAskReset,
  onCancelReset,
  onConfirmReset,
}: Props) {
  return (
    <section className="card">
      <p className="section-title">Network</p>
      <div className="field">
        <label className="label">RPC endpoint</label>
        <input
          className="input mono"
          value={rpcDraft}
          onChange={(e) => onRpcDraft(e.target.value)}
          placeholder={`${networkLabel} RPC URL`}
        />
      </div>
      <div className="row">
        <button className="btn secondary" disabled={busyAction === "rpc"} onClick={onSaveRpc}>
          {busyAction === "rpc" ? "Saving RPC..." : "Save RPC"}
        </button>
        <span className="note">{networkLabel}</span>
      </div>
      <div className="divider" />
      <p className="section-title">Token config</p>
      <div className="field">
        <label className="label">Asset</label>
        <select
          className="input"
          value={selectedAsset}
          onChange={(e) => onSelectAsset(e.target.value as SymbolKey)}
        >
          <option value="USDC">USDC / cUSDC</option>
          <option value="USDT">USDT / cUSDT</option>
        </select>
      </div>
      <div className="field">
        <label className="label">Underlying token</label>
        <input
          className="input mono"
          value={cfg.tokens[selectedAsset].underlying}
          onChange={(e) => onTokenChange(selectedAsset, "underlying", e.target.value)}
          placeholder="0x..."
        />
      </div>
      <div className="field">
        <label className="label">Confidential wrapper</label>
        <input
          className="input mono"
          value={cfg.tokens[selectedAsset].cToken}
          onChange={(e) => onTokenChange(selectedAsset, "cToken", e.target.value)}
          placeholder="0x..."
        />
      </div>
      <button className="btn secondary" disabled={busyAction === "saveToken"} onClick={onSaveTokens}>
        {busyAction === "saveToken" ? "Saving..." : "Save token addresses"}
      </button>
      <div className="divider" />
      <p className="section-title">Security</p>
      <div className="field">
        <label className="label">Auto-lock (minutes)</label>
        <input
          className="input"
          type="number"
          min="0"
          value={autoLockMinutes}
          onChange={(e) => onAutoLockMinutes(Number(e.target.value))}
        />
        <p className="note">Set to 0 to disable auto-lock.</p>
      </div>
      <div className="divider" />
      <p className="section-title">Danger zone</p>
      {!resetConfirm ? (
        <button className="btn danger" disabled={busyAction === "reset"} onClick={onAskReset}>
          Reset vault
        </button>
      ) : (
        <div className="danger-confirm">
          <p className="note">
            This clears all local wallets and session data for this extension.
          </p>
          <div className="row">
            <button className="btn secondary" onClick={onCancelReset}>
              Cancel
            </button>
            <button
              className="btn danger"
              disabled={busyAction === "reset"}
              onClick={onConfirmReset}
            >
              {busyAction === "reset" ? "Resetting..." : "Confirm reset"}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
