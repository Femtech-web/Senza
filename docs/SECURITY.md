# Senza Security Model

This document describes Senza's current security posture and trust boundaries.

## Security Goals

- Keep private keys encrypted at rest in extension storage.
- Restrict signing/sending actions behind explicit approval.
- Prevent silent dApp access to user accounts.
- Limit supported network surface for safer operation.

## Trust Boundaries

1. Browser extension runtime
- popup UI
- service worker
- content script / injected provider

2. Chain and RPC
- user-selected RPC endpoints
- smart contracts on active network

3. Local storage
- encrypted vault data
- session and permission state

## Key Management

- Private keys are encrypted before persistence.
- Encryption algorithm: `AES-256-GCM`.
- KDF: `PBKDF2-SHA256` with `310000` iterations.
- Each wallet entry includes unique salt and IV.
- Vault supports multiple accounts under one encrypted store.

## Session and Access Control

- Unlock is required before signer operations.
- Auto-lock timeout is configurable (default 7 days).
- Manual lock is always available.
- dApp access is origin-scoped and approval-based.

## Approval Controls

- Connection requests are queued and require user action.
- Sensitive request classes are gated:
  - account access
  - transaction sending
  - message signing
  - typed data signing
  - chain switching/addition
- Connection permissions can be revoked per origin.

## Network Safety

- Wallet is intentionally constrained to:
  - Hardhat local
  - Sepolia
  - Ethereum Mainnet
- Unsupported networks are blocked in current UX flow.

## Confidential Token Safety

- Wrap/unwrap/send use encrypted input generation in-wallet.
- Confidential balances are only shown after explicit decrypt flow.
- Decrypted values are display-layer data, not persisted as plaintext secrets in vault.

## Known Risks and Limitations

- Not yet formally security-audited.
- Browser extension threat model still applies:
  - malicious extensions
  - compromised browser profile
  - user device compromise
- RPC trust is external; malicious RPC can degrade UX/reliability.

## Recommended Operational Practices

- Use dedicated browser profile for wallet testing.
- Use hardware/device separation for production-value keys.
- Prefer reputable RPC endpoints.
- Rotate and back up secrets safely.
- Re-verify contract addresses when switching networks or deployments.
