import React, { useEffect, useState } from "react";
import { Check, Copy } from "lucide-react";

type Account = {
  address: string;
  createdAt: number;
};

export function AccountMenu({
  open,
  accounts,
  activeIndex,
  onSelect,
  onClose,
  onAdd,
}: {
  open: boolean;
  accounts: Account[];
  activeIndex: number;
  onSelect: (index: number) => void;
  onClose: () => void;
  onAdd: () => void;
}) {
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);
  const [copyError, setCopyError] = useState<string | null>(null);

  useEffect(() => {
    if (!copiedAddress) return;
    const timeout = window.setTimeout(() => {
      setCopiedAddress(null);
    }, 1400);
    return () => window.clearTimeout(timeout);
  }, [copiedAddress]);

  if (!open) return null;

  return (
    <div className="account-sheet">
      <div className="account-sheet-header">
        <button
          className="icon-button close"
          onClick={onClose}
          aria-label="Back"
        >
          ←
        </button>
        <h2 className="sheet-title">Accounts</h2>
        <div className="sheet-spacer" />
      </div>
      <div className="account-sheet-body">
        <div className="search-bar">
          <span className="search-icon">🔍</span>
          <input className="search-input" placeholder="Search your accounts" />
        </div>
        <p className="sheet-label">Wallet 1</p>
        <div className="account-list">
          {accounts.map((acct, index) => (
            <div
              key={acct.address}
              className={`account-row ${index === activeIndex ? "active" : ""}`}
              role="button"
              tabIndex={0}
              onClick={() => onSelect(index)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelect(index);
                }
              }}
            >
              {/* <div className="account-avatar">{index + 1}</div> */}
              <div className="account-info">
                <p className="account-name">Account {index + 1}</p>
                <p className="account-address mono">{acct.address}</p>
              </div>
              <button
                className={`icon-button copy ${copiedAddress === acct.address ? "copied" : ""}`}
                type="button"
                onClick={async (event) => {
                  event.stopPropagation();
                  setCopyError(null);
                  try {
                    await navigator.clipboard.writeText(acct.address);
                    setCopiedAddress(acct.address);
                  } catch {
                    setCopyError("Clipboard blocked");
                  }
                }}
                aria-label="Copy address"
              >
                {copiedAddress === acct.address ? <Check size={16} /> : <Copy size={16} />}
              </button>
            </div>
          ))}
        </div>
        {copyError && <p className="note">{copyError}</p>}
      </div>
      <div className="account-sheet-footer">
        <button className="btn secondary" onClick={onAdd}>
          Add wallet
        </button>
      </div>
    </div>
  );
}
