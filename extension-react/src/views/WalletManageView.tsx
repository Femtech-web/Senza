import React from "react";

type Props = {
  address?: string;
  busy: boolean;
  addPrivateKey: string;
  addMnemonic: string;
  onCreateNew: () => void;
  onAddPrivateKey: (value: string) => void;
  onAddMnemonic: (value: string) => void;
  onImportPrivateKey: () => void;
  onImportMnemonic: () => void;
};

export function WalletManageView({
  address,
  busy,
  addPrivateKey,
  addMnemonic,
  onCreateNew,
  onAddPrivateKey,
  onAddMnemonic,
  onImportPrivateKey,
  onImportMnemonic,
}: Props) {
  return (
    <section className="card">
      <p className="section-title">Account</p>
      <p className="mono muted">{address}</p>
      <div className="divider" />
      <p className="section-title">Add account</p>
      <div className="field">
        <label className="label">Create new</label>
        <button className="btn" onClick={onCreateNew} disabled={busy}>
          Create account
        </button>
      </div>
      <div className="field">
        <label className="label">Import private key</label>
        <input
          className="input mono input-round"
          value={addPrivateKey}
          onChange={(e) => onAddPrivateKey(e.target.value)}
          placeholder="0x... private key"
        />
        <button className="btn secondary" onClick={onImportPrivateKey} disabled={busy}>
          Import
        </button>
      </div>
      <div className="field">
        <label className="label">Import seed phrase</label>
        <input
          className="input mono input-round"
          value={addMnemonic}
          onChange={(e) => onAddMnemonic(e.target.value)}
          placeholder="12 or 24 words"
        />
        <button className="btn secondary" onClick={onImportMnemonic} disabled={busy}>
          Import
        </button>
      </div>
    </section>
  );
}
