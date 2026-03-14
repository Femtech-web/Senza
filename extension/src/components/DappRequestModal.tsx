import React, { useMemo, useState } from "react";
import { ethers } from "ethers";
import type { PendingRequest } from "../lib/providerTypes";
import { ABIS } from "../abis";

export function DappRequestModal({
  request,
  chainId,
  busy,
  onApprove,
  onReject,
}: {
  request: PendingRequest;
  chainId?: number;
  busy: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  const [viewMode, setViewMode] = useState<"decoded" | "raw">("decoded");

  const interfaces = useMemo(() => {
    return [
      { name: "ERC20", iface: new ethers.Interface(ABIS.ERC20) },
      { name: "ConfidentialUSDC", iface: new ethers.Interface(ABIS.ConfidentialUSDC) },
      { name: "ConfidentialUSDT", iface: new ethers.Interface(ABIS.ConfidentialUSDT) },
    ];
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
            args: decoded.args?.map((arg: unknown) =>
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

  const params = (request.params as any) ?? [];
  const isTx = request.method === "eth_sendTransaction";
  const isTyped =
    request.method === "eth_signTypedData" ||
    request.method === "eth_signTypedData_v3" ||
    request.method === "eth_signTypedData_v4";
  const tx = isTx ? params[0] ?? {} : null;
  const typedRaw = isTyped ? String(params?.[1] ?? "{}") : "";
  const decoded = isTx ? tryDecode(tx?.data) : null;

  const approveLabel = isTx ? "Sign and send" : "Approve";

  return (
    <div className="modal-backdrop">
      <div className="modal approval-modal">
        <div className="modal-header">
          <div>
            <p className="section-title">Approval required</p>
            <p className="note">Review this website request before proceeding.</p>
          </div>
          <button
            className="icon-button close"
            onClick={onReject}
            aria-label="Close approval"
            disabled={busy}
          >
            ×
          </button>
        </div>

        <div className="modal-body">
          <div className="approval-card">
            <div>
              <p className="stat-label">Origin</p>
              <p className="stat-value">{request.origin}</p>
            </div>
            <div>
              <p className="stat-label">Method</p>
              <p className="stat-value mono">{request.method}</p>
            </div>
            <div>
              <p className="stat-label">Chain</p>
              <p className="stat-value">Chain {chainId ?? "-"}</p>
            </div>
          </div>

          {isTx && (
            <div className="approval-details">
              <div className="review-row">
                <span className="stat-label">To</span>
                <span className="stat-value mono">{short(tx?.to ?? "-")}</span>
              </div>
              <div className="review-row">
                <span className="stat-label">Value</span>
                <span className="stat-value">
                  {tx?.value ? ethers.formatEther(tx.value) : "0"} ETH
                </span>
              </div>
              <div className="detail-tabs">
                <button
                  className={`tab ${viewMode === "decoded" ? "active" : ""}`}
                  onClick={() => setViewMode("decoded")}
                  disabled={busy}
                >
                  Decoded
                </button>
                <button
                  className={`tab ${viewMode === "raw" ? "active" : ""}`}
                  onClick={() => setViewMode("raw")}
                  disabled={busy}
                >
                  Raw
                </button>
              </div>
              {viewMode === "decoded" ? (
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

          {!isTx && isTyped && (
            <div className="approval-details">
              <div className="detail-tabs">
                <button
                  className={`tab ${viewMode === "decoded" ? "active" : ""}`}
                  onClick={() => setViewMode("decoded")}
                  disabled={busy}
                >
                  Structured
                </button>
                <button
                  className={`tab ${viewMode === "raw" ? "active" : ""}`}
                  onClick={() => setViewMode("raw")}
                  disabled={busy}
                >
                  Raw
                </button>
              </div>
              {viewMode === "decoded" ? (
                renderTypedData(typedRaw)
              ) : (
                <pre className="code-block">{typedRaw}</pre>
              )}
            </div>
          )}

          {!isTx && !isTyped && (
            <div className="approval-details">
              <pre className="code-block">{JSON.stringify(params, null, 2)}</pre>
            </div>
          )}
        </div>

        <div className="modal-actions">
          <button className="btn secondary" onClick={onReject} disabled={busy}>
            Reject
          </button>
          <button className="btn" onClick={onApprove} disabled={busy}>
            {busy ? "Processing..." : approveLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
