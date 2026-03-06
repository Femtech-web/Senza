import React from "react";
import { Eye, EyeOff } from "lucide-react";
import type { SymbolKey } from "../config/tokens";
import type { TxReview } from "../components/TransactionReviewModal";

type BalanceState = {
  underlying: string;
  cHandle: string;
  decrypted: string;
};

type Props = {
  selectedAsset: SymbolKey;
  networkLabel: string;
  activeBalance: BalanceState;
  showDecrypted: boolean;
  busy: boolean;
  decrypting: boolean;
  confidentialEnabled: boolean;
  fheReady: boolean;
  wrapAmount: string;
  unwrapAmount: string;
  sendTo: string;
  sendAmount: string;
  onBack: () => void;
  onRefresh: () => void;
  onDecrypt: () => void;
  onToggleDecrypted: () => void;
  onWrapAmount: (value: string) => void;
  onUnwrapAmount: (value: string) => void;
  onSendTo: (value: string) => void;
  onSendAmount: (value: string) => void;
  onOpenReview: (review: TxReview) => void;
};

export function AssetsView({
  selectedAsset,
  networkLabel,
  activeBalance,
  showDecrypted,
  busy,
  decrypting,
  confidentialEnabled,
  fheReady,
  wrapAmount,
  unwrapAmount,
  sendTo,
  sendAmount,
  onBack,
  onRefresh,
  onDecrypt,
  onToggleDecrypted,
  onWrapAmount,
  onUnwrapAmount,
  onSendTo,
  onSendAmount,
  onOpenReview,
}: Props) {
  const hasDecrypted =
    activeBalance.decrypted !== "-" && activeBalance.decrypted !== "";
  const shortHandle = (value: string) => {
    if (!value || value === "Unavailable") return value;
    if (value.length <= 14) return value;
    return `${value.slice(0, 10)}...${value.slice(-6)}`;
  };

  return (
    <section className="card">
      <div className="section-header">
        <div>
          <p className="section-title">{selectedAsset}</p>
          <p className="note">{networkLabel}</p>
        </div>
        <div className="row">
          <button className="ghost" onClick={onBack}>
            Back
          </button>
          <button className="btn secondary" onClick={onRefresh}>
            Refresh
          </button>
        </div>
      </div>
      <div className="stats">
        <div>
          <p className="stat-label">{selectedAsset} balance</p>
          <p className="stat-value">{activeBalance.underlying}</p>
        </div>
        <div>
          <p className="stat-label">c{selectedAsset} handle</p>
          <p className="stat-value mono">{shortHandle(activeBalance.cHandle)}</p>
        </div>
        <div>
          <div className="stat-label row between">
            <span>Decrypted c{selectedAsset}</span>
            {hasDecrypted && (
              <button
                className="icon-button eye"
                type="button"
                onClick={onToggleDecrypted}
                aria-label={showDecrypted ? "Hide balance" : "Show balance"}
              >
                {showDecrypted ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            )}
          </div>
          <p className="stat-value">
            {hasDecrypted ? (showDecrypted ? activeBalance.decrypted : "Hidden") : "-"}
          </p>
        </div>
      </div>
      <button
        className="btn secondary"
        onClick={onDecrypt}
        disabled={busy || !confidentialEnabled}
      >
        {decrypting ? "Decrypting..." : `Decrypt c${selectedAsset} balance`}
      </button>
      <div className="divider" />
      <p className="section-title">Actions</p>
      <div className="field">
        <label className="label">Wrap</label>
        <input
          className="input"
          value={wrapAmount}
          onChange={(e) => onWrapAmount(e.target.value)}
          placeholder={`Amount (${selectedAsset})`}
        />
        <button
          className="btn"
          onClick={() => onOpenReview({ kind: "wrap", amount: wrapAmount })}
          disabled={busy || !confidentialEnabled || !fheReady}
        >
          Wrap
        </button>
      </div>
      <div className="field">
        <label className="label">Unwrap</label>
        <input
          className="input"
          value={unwrapAmount}
          onChange={(e) => onUnwrapAmount(e.target.value)}
          placeholder={`Amount (c${selectedAsset})`}
        />
        <button
          className="btn"
          onClick={() => onOpenReview({ kind: "unwrap", amount: unwrapAmount })}
          disabled={busy || !confidentialEnabled || !fheReady}
        >
          Unwrap
        </button>
      </div>
      <div className="field">
        <label className="label">Confidential send</label>
        <input
          className="input mono"
          value={sendTo}
          onChange={(e) => onSendTo(e.target.value)}
          placeholder="Recipient 0x..."
        />
        <input
          className="input"
          value={sendAmount}
          onChange={(e) => onSendAmount(e.target.value)}
          placeholder={`Amount (c${selectedAsset})`}
        />
        <button
          className="btn"
          onClick={() =>
            onOpenReview({
              kind: "send",
              amount: sendAmount,
              to: sendTo,
            })
          }
          disabled={busy || !confidentialEnabled || !fheReady}
        >
          Send
        </button>
      </div>
    </section>
  );
}
