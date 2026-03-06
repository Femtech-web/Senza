import React from "react";

export type ActivityItem = {
  id: string;
  title: string;
  subtitle: string;
  timestamp: string;
  status: string;
  txHash: string;
};

export function ActivityPanel({
  items,
  loading,
  page,
  pageCount,
  total,
  onNext,
  onPrev,
  onRefresh,
  onOpenTx,
}: {
  items: ActivityItem[];
  loading: boolean;
  page: number;
  pageCount: number;
  total: number;
  onNext: () => void;
  onPrev: () => void;
  onRefresh: () => void;
  onOpenTx: (hash: string) => void;
}) {
  return (
    <section className="card">
      <div className="section-header">
        <div>
          <p className="section-title">Activity</p>
          <p className="note">Latest onchain events for this wallet.</p>
        </div>
        <button className="btn secondary" onClick={onRefresh} disabled={loading}>
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>
      <div className="row between">
        <p className="note">Showing {items.length} of {total} items</p>
        <div className="row">
          <button className="ghost" onClick={onPrev} disabled={page <= 0}>
            Prev
          </button>
          <span className="note">
            Page {page + 1} / {Math.max(pageCount, 1)}
          </span>
          <button
            className="ghost"
            onClick={onNext}
            disabled={page + 1 >= pageCount}
          >
            Next
          </button>
        </div>
      </div>
      {items.length === 0 ? (
        <div className="empty-state">
          <p className="note">No recent activity.</p>
        </div>
      ) : (
        <div className="activity-list">
          {items.map((item) => (
            <div key={item.id} className="activity-row">
              <div>
                <p className="stat-value">{item.title}</p>
                <p className="note mono">{item.subtitle}</p>
              </div>
              <div className="activity-meta">
                <span className="pill subtle">{item.status}</span>
                <button className="ghost" onClick={() => onOpenTx(item.txHash)}>
                  View tx
                </button>
                <span className="note">{item.timestamp}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
