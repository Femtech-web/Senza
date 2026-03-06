# Senza Feature Matrix

This matrix reflects what is implemented now.

| Area | Capability | Implementation | Status |
|---|---|---|---|
| Wallet | Password-protected encrypted vault | `WalletProvider` + `vaultCrypto` (AES-GCM + PBKDF2) | Implemented |
| Wallet | Multi-account create/import/switch | Popup account manager | Implemented |
| Wallet | Auto-lock + manual lock | Session lock subsystem | Implemented |
| Networks | Hardhat/Sepolia/Mainnet support | Network config + runtime switch | Implemented |
| Networks | Add enabled network from allowlist | Networks view (`hardhat`,`sepolia`,`mainnet`) | Implemented |
| dApp | EIP-6963 provider discovery | `inpage.js` announcement | Implemented |
| dApp | EIP-1193 request handling | service worker + provider bridge | Implemented |
| dApp | Origin-based connect/permission approvals | Permissions/approval UI + storage | Implemented |
| Signing | `personal_sign`, `eth_sign` | Provider bridge signing flow | Implemented |
| Signing | `eth_signTypedData*` (EIP-712) | Provider bridge typed data signing | Implemented |
| Signing | SIWE framing normalization | Provider bridge message normalization | Implemented |
| RPC | `eth_chainId`, `net_version` | Provider bridge | Implemented |
| RPC | `wallet_switchEthereumChain` | Bridge + in-wallet network switch | Implemented |
| RPC | `wallet_addEthereumChain` (allowlisted) | Bridge + network switch behavior | Implemented |
| RPC | `wallet_watchAsset` | Bridge response path | Implemented |
| Confidential Tokens | cUSDC/cUSDT balance handle fetch | Contract read calls | Implemented |
| Confidential Tokens | `wrap` | Direct token call | Implemented |
| Confidential Tokens | `unwrap` | Direct token call + finalize-aware refresh | Implemented |
| Confidential Tokens | `confidentialTransfer` | Direct token call | Implemented |
| Confidential Tokens | On-demand decrypt (`userDecrypt`) | FHE provider + relayer SDK | Implemented |
| Activity | Pending tx tracking | Local pending queue | Implemented |
| Activity | Confirmed tx history | Subgraph + GraphQL + SWR | Implemented |
| Contracts | ERC-7984 wrappers on Senza hardhat | `ConfidentialUSDC/USDT` | Implemented |
| Contracts | `SenzaWalletHelper` utility contract | `IERC7984` detection + favorites | Implemented |
| Tests | Wrapper and helper test suites | Hardhat tests | Implemented |
