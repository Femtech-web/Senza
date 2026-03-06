import React from "react";

type PendingTx = {
  txHash: string;
  title: string;
  subtitle: string;
  createdAt: number;
};

export function PendingDrawer({
  open,
  items,
  onClose,
  onOpenTx,
}: {
  open: boolean;
  items: PendingTx[];
  onClose: () => void;
  onOpenTx: (hash: string) => void;
}) {
  if (!open) return null;

  return (
    <div className="pending-overlay">
      <div className="pending-drawer">
        <div className="pending-header">
          <div>
            <p className="section-title">Pending transactions</p>
            <p className="note">These are still confirming onchain.</p>
          </div>
          <button className="icon-button close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        {items.length === 0 ? (
          <div className="empty-state">
            <p className="note">No pending transactions.</p>
          </div>
        ) : (
          <div className="pending-list">
            {items.map((item) => (
              <div key={item.txHash} className="pending-row">
                <div>
                  <p className="stat-value">{item.title}</p>
                  <p className="note mono">{item.subtitle}</p>
                </div>
                <div className="pending-meta">
                  <span className="pill subtle">pending</span>
                  <button className="ghost" onClick={() => onOpenTx(item.txHash)}>
                    View tx
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
