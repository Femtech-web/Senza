import React from "react";

type Props = {
  unlockPassword: string;
  busy: boolean;
  onUnlockPassword: (value: string) => void;
  onUnlock: () => void;
};

export function WalletUnlockView({
  unlockPassword,
  busy,
  onUnlockPassword,
  onUnlock,
}: Props) {
  return (
    <section className="unlock-card">
      <div className="card">
        <p className="section-title">Unlock Wallet</p>
        <div className="field">
          <label className="label">Password</label>
          <input
            className="input"
            type="password"
            value={unlockPassword}
            onChange={(e) => onUnlockPassword(e.target.value)}
            placeholder="Vault password"
          />
        </div>
        <button className="btn" onClick={onUnlock} disabled={busy}>
          {busy ? "Unlocking..." : "Unlock"}
        </button>
      </div>
    </section>
  );
}
