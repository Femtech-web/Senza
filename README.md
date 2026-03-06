# Senza

**A confidential-asset wallet extension for Ethereum, built with Zama FHEVM and ERC-7984.**

Senza is a Chrome extension wallet that combines familiar Ethereum wallet behavior with confidential token workflows (`cUSDC`, `cUSDT`): wrap, unwrap, confidential send, and decrypt-on-demand balances.

---

## Table of Contents

- [What Senza Is](#what-senza-is)
- [Core Capabilities](#core-capabilities)
- [Standards and Protocols](#standards-and-protocols)
- [How Senza Works (End-to-End)](#how-senza-works-end-to-end)
- [Architecture](#architecture)
- [Security Model](#security-model)
- [Repository Structure](#repository-structure)
- [Quick Start](#quick-start)
- [Deployment](#deployment)
- [Testing](#testing)
- [Configuration and Addresses](#configuration-and-addresses)
- [Subgraph (Activity Indexing)](#subgraph-activity-indexing)
- [Roadmap](#roadmap)
- [Troubleshooting](#troubleshooting)
- [Current Scope](#current-scope)

---

## What Senza Is

Senza is a wallet-first product for managing confidential ERC-7984 tokens in real workflows:

- Manage multiple accounts in one encrypted local vault.
- Track ETH, USDC/USDT, and confidential balances.
- Wrap/unwrap between underlying and confidential tokens.
- Send confidential transfers with FHE-encrypted inputs.
- Connect to dApps through injected wallet provider support.

The design goal is practical privacy, not a “demo-only” interface.

---

## Core Capabilities

### Wallet and account management

- Password-based encrypted vault.
- Create new accounts.
- Import accounts via private key or mnemonic.
- Account switcher in-wallet.
- Auto-lock session control (default: 7 days) + manual lock.

### Confidential token operations

- `wrap(to, amount)` for USDC/USDT -> cUSDC/cUSDT.
- `unwrap(from, to, encryptedAmount, inputProof)` with encrypted amount generation in-wallet.
- `confidentialTransfer(to, encryptedAmount, inputProof)` with encrypted input generation in-wallet.
- On-demand `userDecrypt` flow for confidential balances.
- Auto-refresh/decrypt flow after actions.

### dApp interoperability

- Wallet discovery via EIP-6963.
- Injected provider interface for dApps.
- Connection approvals + per-origin connection management.
- Request approval flows for sign/send/network operations.

### Activity and observability

- Activity feed (pending + confirmed).
- Graph-indexed token events via The Graph subgraph.
- Explorer deep-links for transaction inspection.

---

## Standards and Protocols

Senza currently implements or integrates with:

- `ERC-7984` confidential token standard (OpenZeppelin Confidential Contracts).
- `IERC7984` + `ERC165` interface detection (`SenzaWalletHelper`).
- `Zama FHEVM` stack (`@fhevm/solidity`, relayer SDK flows).
- `EIP-1193` provider-style request/response model.
- `EIP-6963` provider announcement/discovery.
- `EIP-712` typed data signing (`eth_signTypedData*`).
- `EIP-191` message signing (`personal_sign`, `eth_sign` handling).
- `EIP-4361` SIWE-style message framing support for sign-in payloads.
- Wallet RPCs: `eth_chainId`, `net_version`, `wallet_watchAsset`, `wallet_switchEthereumChain`, `wallet_addEthereumChain`, `wallet_requestPermissions`, `wallet_getPermissions`.

---

## How Senza Works (End-to-End)

1. User unlocks/creates/imports an account in Senza.
2. Senza connects to selected network RPC (Hardhat / Sepolia / Mainnet).
3. For confidential actions:
   - user enters clear amount in UI,
   - Senza generates encrypted input (`handle + proof`) in wallet,
   - contract call is sent (`wrap`/`unwrap`/`confidentialTransfer`).
4. Token and vault state update in popup.
5. Activity is shown from pending tx + indexed on-chain events.
6. For confidential balances, Senza performs authorized user decrypt flow and renders clear value only in wallet UI.

---

## Architecture

```text
Senza/
├── extension-react/      # Chrome extension (React + Vite, popup + provider bridge)
├── hardhat/              # Contracts, deploy scripts, tests, deployment export
├── subgraph/             # Token activity indexing (The Graph)
└── docs/                 # Supplemental docs
```

### Extension layer (`extension-react`)

- UI: popup wallet app.
- Wallet engine: encrypted vault + account/session handling.
- FHE engine: FHE provider/hooks + relayer SDK integration.
- Provider bridge: dApp request queue, approvals, signing, tx forwarding, chain/account broadcasts.
- Activity client: SWR + GraphQL query path to subgraph.

### Contract layer (`hardhat/contracts`)

- `tokens/ConfidentialUSDC.sol`, `tokens/ConfidentialUSDT.sol`
  - OpenZeppelin ERC7984 wrapper contracts using `ZamaEthereumConfig`.
- `SenzaWalletHelper.sol`
  - Confidential-token interface checks and favorite-token utility.

### Data layer (`subgraph`)

- Indexes:
  - `ConfidentialTransfer`
  - `UnwrapRequested`
  - `UnwrapFinalized`
- Serves wallet activity queries for UX responsiveness and pagination.

---

## Security Model

- Vault encryption:
  - AES-256-GCM for private key ciphertext.
  - PBKDF2-SHA256 key derivation (`310000` iterations).
  - Per-wallet random salt + IV.
- Storage:
  - Chrome local extension storage.
  - No backend custody of private keys.
- Session model:
  - Lock/unlock gate for signer usage.
  - Auto-lock timeout policy.
  - Manual lock at any time.
- Transaction safety UX:
  - explicit approval modals for sensitive request classes.
  - per-origin dApp permission controls.

`Important`: This project is under active development and not security-audited.

---

## Repository Structure

```text
Senza/
├── README.md
├── docs/
│   ├── ARCHITECTURE.md
│   ├── FEATURE_MATRIX.md
│   └── SECURITY_MODEL.md
├── extension-react/
│   ├── src/
│   ├── public/
│   └── dist/
├── hardhat/
│   ├── contracts/
│   ├── deploy/
│   ├── test/
│   └── scripts/
└── subgraph/
    ├── src/
    ├── schema.graphql
    └── subgraph.yaml
```

---

## Quick Start

### Prerequisites

- Node.js 20+
- npm
- Docker (for local subgraph stack)
- Chrome (for loading unpacked extension)

### 1) Contracts (local)

```bash
cd hardhat
npm install
npm run compile
```

Start local node:

```bash
npm run node
```

In a second terminal:

```bash
cd hardhat
npm run deploy:localhost
npm run export:deployments
```

### 2) Extension

```bash
cd extension-react
npm install
npm run build
```

Load extension:

1. Open `chrome://extensions`
2. Enable `Developer mode`
3. Click `Load unpacked`
4. Select `Senza/extension-react/dist`

### 3) (Optional) Local subgraph

```bash
cd subgraph
docker compose up -d
npm install
npm run codegen
npm run build
npm run create-local
npm run deploy-local
```

By default, extension subgraph URL is:

- `http://localhost:8000/subgraphs/name/senza`

Override with `extension-react/.env`:

```env
VITE_SUBGRAPH_URL=http://localhost:8000/subgraphs/name/senza
```

---

## Deployment

### Sepolia deploy (official USDC/USDT wrappers + helper)

From `hardhat/.env`, set:

```env
SEPOLIA_PRIVATE_KEY=your_private_key_without_0x_prefix
```

Deploy:

```bash
cd hardhat
npx hardhat deploy --network sepolia --tags WrappersSepolia,SenzaWalletHelper,Export
```

Export addresses:

```bash
npm run export:deployments:sepolia
```

Output files:

- `hardhat/deployments.json`
- `hardhat/deployments.sepolia.json`

---

## Testing

From `hardhat/`:

```bash
npm test
```

Contract test suites:

- `test/ConfidentialWrappers.test.ts`
- `test/SenzaWalletHelper.test.ts`

### Contract Test Coverage

`ConfidentialWrappers.test.ts` covers:

- wrapper deployment metadata and underlying token wiring
- successful `wrap` flow from underlying token to confidential balance
- confidential transfer execution with encrypted input
- unwrap request flow and expected `UnwrapRequested` event emission

`SenzaWalletHelper.test.ts` covers:

- favorite token update success path for ERC-7984-compatible token
- event emission validation for favorite updates
- revert behavior for invalid token address (`InvalidToken`)
- revert behavior for non-ERC-7984 token (`UnsupportedToken`)

---

## Configuration and Addresses

### Network/token defaults (extension)

Defined in:

- `extension-react/src/config/tokens.ts`

Supported networks in-wallet:

- Hardhat local (`31337`)
- Sepolia (`11155111`)
- Ethereum Mainnet (`1`)

### Current Sepolia references

Underlying tokens:

- USDC: `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238`
- USDT: `0x93C5d30a7509E60871B77A3548a5BD913334cd35`

Confidential wrappers (official-pair deployment):

- cUSDC: `0xbd7793f531643208Dc8117cd7Ed9a4c4B95311E1`
- cUSDT: `0xf51fE73BB97340401ae1815A96B3B5C7D501cfA0`

Helper:

- SenzaWalletHelper: `0xDb97af3cc33D7806c709A0C2160afE2C06703069`

---

## Subgraph (Activity Indexing)

Subgraph config:

- `subgraph/subgraph.yaml`
- `subgraph/src/token.ts`
- `subgraph/schema.graphql`

Docker graph node uses:

- `ETHEREUM_RPC` from shell/`.env` if provided.
- fallback local host RPC when not set.

Example:

```bash
export ETHEREUM_RPC=https://ethereum-sepolia-rpc.publicnode.com
```

---

## Roadmap

Near-term product roadmap:

1. Improve dApp compatibility coverage for broader connector ecosystems.
2. Expand activity UX with richer tx state and filtering.
3. Add clearer network management and RPC diagnostics.
4. Deepen confidential token portfolio support beyond initial pairs.
5. Harden security posture with dedicated review/audit cycle.

---

## Troubleshooting

### FHE status stuck in error

- Reload extension after new build.
- Confirm selected network RPC is reachable.
- Confirm confidential token addresses are correct for active network.

### Decrypt errors

- Ensure balance handle is non-zero.
- Ensure decrypt request is authorized for the connected account.
- Run a balance refresh after transaction finalization.

### dApp connect prompt not appearing

- Re-open extension popup manually.
- Check pending requests in Permissions.
- Reload target dApp tab after extension reload.

---

## Current Scope

Senza currently focuses on Ethereum-compatible confidential token wallet UX:

- account security,
- confidential token execution,
- dApp interoperability,
- and operational visibility.

Future additions (advanced network support, deeper analytics, and broader asset surface) can be layered on top of this foundation.
