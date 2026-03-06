import React from "react";
import { LayoutDashboard, WalletCards, Activity, ShieldCheck, Settings, Network } from "lucide-react";

export type NavItem = {
  key: string;
  label: string;
};

export function DrawerNav({
  open,
  onClose,
  items,
  activeKey,
  onSelect,
  fheStatus,
  onLock,
  lockBusy,
}: {
  open: boolean;
  onClose: () => void;
  items: NavItem[];
  activeKey: string;
  onSelect: (key: string) => void;
  fheStatus: string;
  onLock: () => void;
  lockBusy?: boolean;
}) {
  const iconFor = (key: string) => {
    switch (key) {
      case "overview":
        return <LayoutDashboard size={18} />;
      case "assets":
        return <WalletCards size={18} />;
      case "activity":
        return <Activity size={18} />;
      case "permissions":
        return <ShieldCheck size={18} />;
      case "settings":
        return <Settings size={18} />;
      case "networks":
        return <Network size={18} />;
      default:
        return null;
    }
  };

  return (
    <>
      <div className={`nav-overlay ${open ? "show" : ""}`} onClick={onClose} />
      <aside className={`drawer ${open ? "open" : ""}`}>
        <div className="nav-list">
          {items.map((item) => (
            <button
              key={item.key}
              className={`nav-item ${activeKey === item.key ? "active" : ""}`}
              onClick={() => onSelect(item.key)}
            >
              <span className="nav-icon">{iconFor(item.key)}</span>
              {item.label}
            </button>
          ))}
        </div>
        <div className="drawer-divider" />
        <div className="drawer-footer">
          <div className="footer-card">
            <p className="footer-label">FHE status</p>
            <p className="footer-value">{fheStatus}</p>
          </div>
          <button className="btn secondary footer-lock-btn" onClick={onLock} disabled={lockBusy}>
            {lockBusy ? "Locking..." : "Lock"}
          </button>
        </div>
      </aside>
    </>
  );
}
