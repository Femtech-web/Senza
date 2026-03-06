# Senza Architecture

Senza is an extension-first confidential wallet architecture with four runtime layers:

1. popup application (`extension-react/src`)
2. injected provider bridge (`inpage.js`, `content-script.js`, `service-worker.js`)
3. confidential token contracts (`hardhat/contracts`)
4. indexed activity data layer (`subgraph`)

## System Overview

```text
dApp
  |
  | EIP-6963 discovery + EIP-1193 requests
  v
Injected provider (inpage.js)
  |
  | window.postMessage
  v
Content script
  |
  | chrome.runtime messaging
  v
Service worker
  |
  | queues approvals / routes requests
  v
Popup UI (React)
  |
  | signer + ethers + FHE relayer SDK
  v
Ethereum RPC (Hardhat / Sepolia / Mainnet)
  |
  +--> ERC20 (USDC/USDT)
  +--> ERC7984 wrappers (cUSDC/cUSDT)
  +--> SenzaWalletHelper
  |
  v
Subgraph indexer -> GraphQL -> Activity panel
```

## Component Responsibilities

### 1) Popup app

- account creation/import/switch and lock lifecycle
- vault encryption/decryption flow
- network and token configuration
- wrap/unwrap/confidential send transaction UX
- decryption UX (`userDecrypt`) and balance display
- approval UIs (internal actions + dApp-origin requests)

### 2) Provider bridge

- provider announcement (`eip6963:announceProvider`)
- request handling for connection/signing/network methods
- pending request queue and resolution
- `accountsChanged` / `chainChanged` broadcast
- dApp connection state persistence

### 3) Contract layer

- `ConfidentialUSDC.sol` and `ConfidentialUSDT.sol`
  - OpenZeppelin `ERC7984ERC20Wrapper`
  - `ZamaEthereumConfig`
- `SenzaWalletHelper.sol`
  - confidential token interface detection (`IERC7984` + `ERC165`)
  - user favorite token registry

### 4) Data/indexing layer

- subgraph listens to:
  - `ConfidentialTransfer`
  - `UnwrapRequested`
  - `UnwrapFinalized`
- extension consumes indexed activity through GraphQL
- pending local tx state is merged with confirmed indexed records in UI

## Operational Flows

### A) dApp connection flow

1. dApp discovers Senza through EIP-6963.
2. dApp calls `eth_requestAccounts`.
3. service worker queues request.
4. popup approval UI opens.
5. user approves/rejects; result is sent back to dApp.

### B) confidential transaction flow

1. user enters clear amount.
2. popup generates encrypted input handle + proof.
3. contract call executes (`wrap`, `unwrap`, `confidentialTransfer`).
4. activity updates (pending then indexed confirmed).
5. optional decrypt updates visible confidential balance.

### C) network switching flow

1. user selects enabled network in topbar.
2. popup updates RPC/provider and persists chain context.
3. provider bridge emits `chainChanged`.
4. dApps and UI state refresh to active network context.
