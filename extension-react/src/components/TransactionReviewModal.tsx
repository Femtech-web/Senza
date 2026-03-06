import React from "react";

export type ReviewKind = "wrap" | "unwrap" | "send";

export type TxReview = {
  kind: ReviewKind;
  amount: string;
  to?: string;
};

export type ReviewImpact = {
  label: string;
  before: string;
  after: string;
};

export function TransactionReviewModal({
  review,
  onCancel,
  onConfirm,
  feeEstimate,
  impact,
  selectedAsset,
  busy,
}: {
  review: TxReview;
  onCancel: () => void;
  onConfirm: () => void;
  feeEstimate: string;
  impact: ReviewImpact[];
  selectedAsset: string;
  busy: boolean;
}) {
  return (
    <div className="modal-backdrop">
      <div className="modal">
        <div className="modal-header">
          <div>
            <p className="section-title">Transaction review</p>
            <p className="note">Confirm the details before signing.</p>
          </div>
          <button className="icon-button close" onClick={onCancel} aria-label="Close review">
            ×
          </button>
        </div>
        <div className="modal-body">
          <div className="review-row">
            <span className="stat-label">Action</span>
            <span className="stat-value">
              {review.kind === "wrap" && `Wrap ${selectedAsset}`}
              {review.kind === "unwrap" && `Unwrap c${selectedAsset}`}
              {review.kind === "send" && `Send c${selectedAsset}`}
            </span>
          </div>
          <div className="review-row">
            <span className="stat-label">Amount</span>
            <span className="stat-value">
              {review.amount} {review.kind === "wrap" ? selectedAsset : `c${selectedAsset}`}
            </span>
          </div>
          {review.to && (
            <div className="review-row">
              <span className="stat-label">Recipient</span>
              <span className="stat-value mono">{review.to}</span>
            </div>
          )}
          <div className="review-row">
            <span className="stat-label">Network fee</span>
            <span className="stat-value">{feeEstimate}</span>
          </div>
          <div className="review-row">
            <span className="stat-label">Network</span>
            <span className="stat-value">Ethereum / Sepolia</span>
          </div>
          <div className="divider" />
          <div className="impact-block">
            <p className="stat-label">Simulated balance impact</p>
            {impact.map((row) => (
              <div key={row.label} className="impact-row">
                <span className="mono">{row.label}</span>
                <span className="stat-value">
                  {row.before} → {row.after}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="modal-actions">
          <button className="btn secondary" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button className="btn" onClick={onConfirm} disabled={busy}>
            {busy ? "Confirming..." : "Confirm"}
          </button>
        </div>
        {busy && (
          <div className="modal-progress">
            <div className="spinner" />
            <p className="note">Submitting transaction to the network...</p>
          </div>
        )}
      </div>
    </div>
  );
}
