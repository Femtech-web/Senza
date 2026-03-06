import React, { useMemo, useState } from "react";
import { ethers } from "ethers";
import type { DappConnection, PendingRequest } from "../lib/providerTypes";
import { ABIS } from "../abis";

export function PermissionsPanel({
  connected,
  pending,
  pendingRequests,
  chainId,
  onApprove,
  onAllowOnce,
  onReject,
  onDisconnect,
  onApproveRequest,
  onRejectRequest,
}: {
  connected: DappConnection[];
  pending: DappConnection[];
  pendingRequests: PendingRequest[];
  chainId?: number;
  onApprove: (origin: string) => void;
  onAllowOnce: (origin: string) => void;
  onReject: (origin: string) => void;
  onDisconnect: (origin: string) => void;
  onApproveRequest: (id: string) => void;
  onRejectRequest: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [viewMode, setViewMode] = useState<Record<string, "decoded" | "raw">>({});

  const interfaces = useMemo(() => {
    const list: { name: string; iface: ethers.Interface }[] = [];
    list.push({ name: "ERC20", iface: new ethers.Interface(ABIS.ERC20) });
    list.push({
      name: "ConfidentialUSDC",
      iface: new ethers.Interface(ABIS.ConfidentialUSDC),
    });
    list.push({
      name: "ConfidentialUSDT",
      iface: new ethers.Interface(ABIS.ConfidentialUSDT),
    });
    return list;
  }, []);

  const short = (value: string) =>
    value.length > 18 ? `${value.slice(0, 10)}...${value.slice(-6)}` : value;

  const tryDecode = (data?: string) => {
    if (!data || data === "0x") return null;
    for (const entry of interfaces) {
      try {
        const decoded = entry.iface.parseTransaction({ data });
        if (decoded) {
          return {
            source: entry.name,
            name: decoded.name,
            args: decoded.args?.map((arg: any) =>
              typeof arg === "string" ? short(arg) : String(arg)
            ),
            signature: decoded.signature,
          };
        }
      } catch {
        continue;
      }
    }
    return null;
  };

  const renderTypedData = (raw: string) => {
    try {
      const data = JSON.parse(raw);
      return (
        <div className="typed-block">
          <div>
            <p className="stat-label">Domain</p>
            <pre className="code-block">{JSON.stringify(data.domain, null, 2)}</pre>
          </div>
          <div>
            <p className="stat-label">Message</p>
            <pre className="code-block">{JSON.stringify(data.message, null, 2)}</pre>
          </div>
        </div>
      );
    } catch {
      return <pre className="code-block">{raw}</pre>;
    }
  };
  return (
    <section className="card permissions-card">
      <div className="section-header">
        <div>
          <p className="section-title">Connected dapps</p>
          <p className="note">Approve or remove websites requesting access.</p>
        </div>
        <span className="pill subtle">EIP-6963 ready</span>
      </div>

      {pendingRequests.length > 0 && (
        <div className="permission-group">
          <p className="section-title">Pending requests</p>
          <div className="permission-list">
            {pendingRequests.map((req) => {
              const expandedRow = expanded[req.id] ?? true;
              const mode = viewMode[req.id] ?? "decoded";
              const params = (req.params as any) ?? [];
              const isTx = req.method === "eth_sendTransaction";
              const tx = isTx ? params[0] ?? {} : null;
              const decoded = isTx ? tryDecode(tx?.data) : null;
              const isTyped = req.method === "eth_signTypedData_v4";
              const typedRaw = isTyped ? (params?.[1] ?? "{}") : "";
              return (
              <div key={req.id} className="permission-card">
                <div>
                  <p className="stat-label">{req.method}</p>
                  <p className="stat-value mono">{req.origin}</p>
                </div>
                {expandedRow && isTx && (
                  <div className="request-details">
                    <div className="detail-row">
                      <span className="stat-label">To</span>
                      <span className="stat-value mono">{short(tx?.to ?? "-")}</span>
                    </div>
                    <div className="detail-row">
                      <span className="stat-label">Value</span>
                      <span className="stat-value">
                        {tx?.value ? ethers.formatEther(tx.value) : "0"} ETH
                      </span>
                    </div>
                    <div className="detail-tabs">
                      <button
                        className={`tab ${mode === "decoded" ? "active" : ""}`}
                        onClick={() =>
                          setViewMode((prev) => ({ ...prev, [req.id]: "decoded" }))
                        }
                      >
                        Decoded
                      </button>
                      <button
                        className={`tab ${mode === "raw" ? "active" : ""}`}
                        onClick={() =>
                          setViewMode((prev) => ({ ...prev, [req.id]: "raw" }))
                        }
                      >
                        Raw
                      </button>
                    </div>
                    {mode === "decoded" ? (
                      decoded ? (
                        <div className="code-block">
                          <div className="detail-row">
                            <span className="stat-label">Method</span>
                            <span className="stat-value">{decoded.name}</span>
                          </div>
                          <div className="detail-row">
                            <span className="stat-label">Args</span>
                            <span className="stat-value">{decoded.args?.join(", ")}</span>
                          </div>
                          <div className="detail-row">
                            <span className="stat-label">Signature</span>
                            <span className="stat-value mono">{decoded.signature}</span>
                          </div>
                        </div>
                      ) : (
                        <p className="note">Unable to decode calldata.</p>
                      )
                    ) : (
                      <pre className="code-block">{tx?.data ?? "0x"}</pre>
                    )}
                  </div>
                )}
                {expandedRow && isTyped && (
                  <div className="request-details">
                    <div className="detail-tabs">
                      <button
                        className={`tab ${mode === "decoded" ? "active" : ""}`}
                        onClick={() =>
                          setViewMode((prev) => ({ ...prev, [req.id]: "decoded" }))
                        }
                      >
                        Structured
                      </button>
                      <button
                        className={`tab ${mode === "raw" ? "active" : ""}`}
                        onClick={() =>
                          setViewMode((prev) => ({ ...prev, [req.id]: "raw" }))
                        }
                      >
                        Raw
                      </button>
                    </div>
                    {mode === "decoded" ? (
                      renderTypedData(String(typedRaw))
                    ) : (
                      <pre className="code-block">{String(typedRaw)}</pre>
                    )}
                  </div>
                )}
                <div className="row">
                  <span className="pill subtle">Chain {chainId ?? "-"}</span>
                  <button className="btn secondary" onClick={() => onRejectRequest(req.id)}>
                    Reject
                  </button>
                  <button className="btn" onClick={() => onApproveRequest(req.id)}>
                    Approve
                  </button>
                </div>
                <button
                  className="ghost-link"
                  onClick={() =>
                    setExpanded((prev) => ({ ...prev, [req.id]: !expandedRow }))
                  }
                >
                  {expandedRow ? "Hide details" : "Show details"}
                </button>
              </div>
            );})}
          </div>
        </div>
      )}

      {pending.length > 0 && (
        <div className="permission-group">
          <p className="section-title">Pending approvals</p>
          <div className="permission-list">
            {pending.map((dapp) => (
              <div key={dapp.origin} className="permission-card">
                <div>
                  <p className="stat-label">{dapp.name}</p>
                  <p className="stat-value mono">{dapp.origin}</p>
                </div>
                <div className="row">
                  <span className="pill subtle">Chain {dapp.chainId ?? chainId ?? "-"}</span>
                  <button className="btn secondary" onClick={() => onReject(dapp.origin)}>
                    Reject
                  </button>
                  <button className="btn secondary" onClick={() => onAllowOnce(dapp.origin)}>
                    Allow once
                  </button>
                  <button className="btn" onClick={() => onApprove(dapp.origin)}>
                    Always allow
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {connected.length === 0 ? (
        <div className="empty-state">
          <p className="note">No dapps connected yet.</p>
        </div>
      ) : (
        <div className="permission-group">
          <p className="section-title">Active connections</p>
          <div className="permission-list">
            {connected.map((dapp) => (
              <div key={dapp.origin} className="permission-card">
                <div>
                  <p className="stat-label">{dapp.name}</p>
                  <p className="stat-value mono">{dapp.origin}</p>
                </div>
                <div className="row">
                  <span className="pill subtle">Chain {dapp.chainId ?? chainId ?? "-"}</span>
                  <button className="btn secondary" onClick={() => onDisconnect(dapp.origin)}>
                    Disconnect
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
