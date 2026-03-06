import React from "react";

type SetPasswordProps = {
  password: string;
  confirmPassword: string;
  busy: boolean;
  onPassword: (value: string) => void;
  onConfirmPassword: (value: string) => void;
  onContinue: () => void;
};

export function SetPasswordView({
  password,
  confirmPassword,
  busy,
  onPassword,
  onConfirmPassword,
  onContinue,
}: SetPasswordProps) {
  return (
    <section className="card onboarding">
      <p className="section-title">Set your password</p>
      <p className="note">This password unlocks your Senza wallet.</p>
      <div className="field">
        <label className="label">Password</label>
        <input
          className="input input-round"
          type="password"
          value={password}
          onChange={(e) => onPassword(e.target.value)}
          placeholder="Minimum 8 characters"
        />
      </div>
      <div className="field">
        <label className="label">Confirm password</label>
        <input
          className="input input-round"
          type="password"
          value={confirmPassword}
          onChange={(e) => onConfirmPassword(e.target.value)}
          placeholder="Re-enter password"
        />
      </div>
      <button className="btn" onClick={onContinue} disabled={busy}>
        Continue
      </button>
    </section>
  );
}

type CreateImportProps = {
  importMode: "privateKey" | "mnemonic";
  importValue: string;
  busy: boolean;
  onCreate: () => void;
  onImport: () => void;
  onBack: () => void;
  onImportMode: (value: "privateKey" | "mnemonic") => void;
  onImportValue: (value: string) => void;
};

export function CreateImportView({
  importMode,
  importValue,
  busy,
  onCreate,
  onImport,
  onBack,
  onImportMode,
  onImportValue,
}: CreateImportProps) {
  return (
    <section className="card onboarding">
      <p className="section-title">Create your wallet</p>
      <p className="note">Start by creating your first account.</p>
      {/* Use your password to encrypt */}
      <button className="btn" onClick={onCreate} disabled={busy}>
        {busy ? "Creating..." : "Create wallet"}
      </button>
      <div className="divider" />
      <p className="section-title">Import wallet</p>
      <div className="field">
        <label className="label">Import method</label>
        <select
          className="input input-round"
          value={importMode}
          onChange={(e) =>
            onImportMode(e.target.value as "privateKey" | "mnemonic")
          }
        >
          <option value="privateKey">Private key</option>
          <option value="mnemonic">Seed phrase</option>
        </select>
      </div>
      <div className="field">
        <label className="label">Key or phrase</label>
        <input
          className="input mono input-round"
          value={importValue}
          onChange={(e) => onImportValue(e.target.value)}
          placeholder={
            importMode === "privateKey" ? "0x... private key" : "12 or 24 words"
          }
        />
      </div>
      <button className="btn secondary" onClick={onImport} disabled={busy}>
        {busy ? "Importing..." : "Import into vault"}
      </button>
      <button className="btn ghost-link" onClick={onBack} disabled={busy}>
        Back
      </button>
    </section>
  );
}
