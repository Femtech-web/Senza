import React from "react";

type Props = {
  busy: boolean;
  addPrivateKey: string;
  addMnemonic: string;
  onCreateNew: () => void;
  onAddPrivateKey: (value: string) => void;
  onAddMnemonic: (value: string) => void;
  onImportPrivateKey: () => void;
  onImportMnemonic: () => void;
  onBack: () => void;
};

export function AddWalletView({
  busy,
  addPrivateKey,
  addMnemonic,
  onCreateNew,
  onAddPrivateKey,
  onAddMnemonic,
  onImportPrivateKey,
  onImportMnemonic,
  onBack,
}: Props) {
  return (
    <section className="card">
      <p className="section-title">Add wallet</p>
      <p className="note">Create a new account or import an existing one.</p>
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
      <button className="btn ghost-link" onClick={onBack} disabled={busy}>
        Back to overview
      </button>
    </section>
  );
}
