import React, { useMemo, useState } from "react";
import type { NetworkKey } from "../config/tokens";

type NetworkOption = {
  key: NetworkKey;
  label: string;
  chainId: number;
};

type Props = {
  networks: NetworkOption[];
  activeNetworkKey: NetworkKey;
  rpcDrafts: Record<NetworkKey, string>;
  addCandidate: string;
  busyAction: string | null;
  onSwitch: (key: NetworkKey) => void;
  onRpcDraft: (key: NetworkKey, value: string) => void;
  onSaveRpc: (key: NetworkKey) => void;
  onAddCandidate: (value: string) => void;
  onAddNetwork: () => void;
};

export function NetworksView({
  networks,
  activeNetworkKey,
  rpcDrafts,
  addCandidate,
  busyAction,
  onSwitch,
  onRpcDraft,
  onSaveRpc,
  onAddCandidate,
  onAddNetwork,
}: Props) {
  const [search, setSearch] = useState("");
  const [selectedKey, setSelectedKey] = useState<NetworkKey>(activeNetworkKey);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return networks;
    return networks.filter(
      (n) =>
        n.label.toLowerCase().includes(q) ||
        String(n.chainId).includes(q) ||
        n.key.toLowerCase().includes(q)
    );
  }, [networks, search]);

  const selected = networks.find((n) => n.key === selectedKey) ?? networks[0];

  return (
    <section className="card networks-card">
      <p className="section-title">Manage networks</p>
      <div className="search-bar networks-search">
        <span aria-hidden>🔎</span>
        <input
          className="search-input"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search networks"
        />
      </div>
      <p className="note">Enabled networks</p>
      <div className="networks-body">
        <div className="network-list">
          {filtered.map((net) => (
            <button
              key={net.key}
              className={`network-row ${activeNetworkKey === net.key ? "active" : ""}`}
              onClick={() => {
                setSelectedKey(net.key);
                onSwitch(net.key);
              }}
            >
              <div className="network-avatar">{net.label[0]}</div>
              <div className="account-info">
                <p className="account-name">{net.label}</p>
                <p className="account-address">Chain {net.chainId}</p>
              </div>
              <span className="pill subtle">
                {activeNetworkKey === net.key ? "Active" : "Use"}
              </span>
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="empty-state">
              <p className="note">No network matches your search.</p>
            </div>
          )}
        </div>
        {selected && (
          <div className="permission-card">
            <p className="stat-label">RPC endpoint ({selected.label})</p>
            <div className="field">
              <input
                className="input mono"
                value={rpcDrafts[selected.key] ?? ""}
                onChange={(e) => onRpcDraft(selected.key, e.target.value)}
                placeholder="https://..."
              />
            </div>
            <button
              className="btn secondary"
              onClick={() => onSaveRpc(selected.key)}
              disabled={busyAction === `rpc-${selected.key}`}
            >
              {busyAction === `rpc-${selected.key}` ? "Saving..." : "Save RPC"}
            </button>
          </div>
        )}
      </div>
      <div className="networks-footer">
        <div className="field">
          <select
            className="input"
            value={addCandidate}
            onChange={(e) => onAddCandidate(e.target.value)}
          >
            <option value="hardhat">Hardhat Local</option>
            <option value="sepolia">Sepolia</option>
            <option value="mainnet">Mainnet</option>
            <option value="custom">Custom (unsupported)</option>
          </select>
        </div>
        <button className="btn secondary" onClick={onAddNetwork}>
          + Add network
        </button>
      </div>
    </section>
  );
}
