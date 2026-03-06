import React from "react";
import { Menu } from "lucide-react";

type NetworkOption = {
  key: string;
  label: string;
  shortLabel: string;
  chainId: number;
};

export function Topbar({
  address,
  chainId,
  onMenu,
  onAccountMenu,
  compact = false,
  networks = [],
  activeNetworkKey,
  networkOpen = false,
  onToggleNetwork,
  onSelectNetwork,
  pendingCount = 0,
  onPendingClick,
}: {
  address?: string;
  chainId?: number;
  onMenu: () => void;
  onAccountMenu: () => void;
  compact?: boolean;
  networks?: readonly NetworkOption[];
  activeNetworkKey?: string;
  networkOpen?: boolean;
  onToggleNetwork?: () => void;
  onSelectNetwork?: (key: string) => void;
  pendingCount?: number;
  onPendingClick?: () => void;
}) {
  const shortAddress = (value?: string) => {
    if (!value) return "-";
    if (value.length < 12) return value;
    return `${value.slice(0, 6)}...${value.slice(-4)}`;
  };

  return (
    <header className="topbar">
      <div className="topbar-left">
        <div className="brand-lockup">
          <h1 className="brand">Senza</h1>
        </div>
        {!compact && (
          <button className="account-chip" type="button" onClick={onAccountMenu}>
            {shortAddress(address)}
            <span className="caret">▾</span>
          </button>
        )}
      </div>
      {!compact && (
        <div className="topbar-actions">
          {pendingCount > 0 && (
            <button className="pending-pill" type="button" onClick={onPendingClick}>
              <span className="pending-dot" />
              {pendingCount} pending
            </button>
          )}
          <div className="network-select">
            <button
              className="network-chip"
              type="button"
              onClick={onToggleNetwork}
              aria-expanded={networkOpen}
            >
              {networks.find((net) => net.key === activeNetworkKey)?.shortLabel ??
                (chainId ? `Chain ${chainId}` : "Network")}
              <span className="caret">▾</span>
            </button>
            {networkOpen && networks.length > 0 && (
              <div className="network-menu" role="menu">
                {networks.map((net) => (
                  <button
                    key={net.key}
                    className={`network-option${
                      net.key === activeNetworkKey ? " active" : ""
                    }`}
                    type="button"
                    onClick={() => onSelectNetwork?.(net.key)}
                    role="menuitem"
                  >
                    <span>{net.label}</span>
                    <span className="pill subtle">Chain {net.chainId}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <button className="icon-button" onClick={onMenu} aria-label="Open navigation">
            <Menu size={18} />
          </button>
        </div>
      )}
    </header>
  );
}
