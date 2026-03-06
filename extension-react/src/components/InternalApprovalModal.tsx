import React from "react";

export function InternalApprovalModal({
  title,
  origin,
  method,
  details,
  busy,
  onApprove,
  onReject,
}: {
  title: string;
  origin: string;
  method: string;
  details: { label: string; value: string }[];
  busy: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  return (
    <div className="modal-backdrop">
      <div className="modal approval-modal">
        <div className="modal-header">
          <div>
            <p className="section-title">Approval required</p>
            <p className="note">Review and approve this internal action.</p>
          </div>
          <button
            className="icon-button close"
            onClick={onReject}
            aria-label="Close approval"
          >
            ×
          </button>
        </div>
        <div className="modal-body">
          <div className="approval-card">
            <div>
              <p className="stat-label">Origin</p>
              <p className="stat-value">{origin}</p>
            </div>
            <div>
              <p className="stat-label">Action</p>
              <p className="stat-value">{title}</p>
            </div>
            <div>
              <p className="stat-label">Method</p>
              <p className="stat-value mono">{method}</p>
            </div>
          </div>
          {details.length > 0 && (
            <div className="approval-details">
              {details.map((row) => (
                <div key={row.label} className="review-row">
                  <span className="stat-label">{row.label}</span>
                  <span className="stat-value mono">{row.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="modal-actions">
          <button className="btn secondary" onClick={onReject} disabled={busy}>
            Reject
          </button>
          <button className="btn" onClick={onApprove} disabled={busy}>
            {busy ? "Approving..." : "Approve"}
          </button>
        </div>
        {busy && (
          <div className="modal-progress">
            <div className="spinner" />
            <p className="note">Processing your approval...</p>
          </div>
        )}
      </div>
    </div>
  );
}
