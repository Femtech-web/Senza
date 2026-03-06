# Senza

Confidential token wallet extension built on Zama FHEVM.

## Vision

Senza is a lightweight browser wallet focused on ERC-7984 confidential tokens.  
It gives users practical privacy controls for balances, transfers, and token activity, without trying to replicate every MetaMask feature.

## Architecture

- `extension-react/`: React + Vite Chrome extension app (popup UI + FHE hooks/providers).
- `hardhat/`: contract workspace (compile, test, deploy, export addresses).
- `SenzaWalletHelper` in `hardhat/` is utility-focused (favorites + token-type checks), not payment execution.
- `contracts/`: top-level contract mirror for quick reference.
- `fhevm/`: copied FHE toolkit source from Hushroll (base utilities/hooks).

## Planned MVP

- Connect EOA and detect supported network.
- View `cUSDC` and `cUSDT` balances with decrypt-on-demand.
- Wrap and unwrap base tokens.
- Send confidential transfers.
- Activity feed for wrap, unwrap, and confidential transfer actions.

## Current Extension Milestone

- React/Vite extension popup using provider/hooks pattern.
- Real wallet connect (injected wallet provider).
- Real `Approve + Wrap` transaction flow (direct token call).
- Real `unwrap` transaction with automatic FHE encrypted amount generation (direct token call).
- Real `confidentialTransfer` transaction with automatic FHE encrypted amount generation (direct token call).
- Token config persistence in extension local storage.
- Local bundled Relayer SDK + WASM assets for MV3-safe FHE init.
- Senza has its own local token stack: `MockUSDC/MockUSDT` + `ConfidentialUSDC/ConfidentialUSDT`.

## Project Layout

```text
Senza/
├── extension-react/   # React + Vite extension app
├── hardhat/           # Senza contract workspace (deploy/test/export)
├── contracts/         # Contract mirror
├── fhevm/             # FHE toolkit copy from Hushroll
└── docs/              # Documentation
```

## Quick Start (React Extension)

1. Install dependencies:
   - `cd extension-react`
   - `npm install`
2. Build:
   - `npm run build`
3. Open `chrome://extensions`.
4. Enable `Developer mode`.
5. Click `Load unpacked`.
6. Select `Senza/extension-react/dist`.

## Quick Start (Contracts / Hardhat)

1. `cd hardhat`
2. `npm install`
3. `npm run compile`
4. Start local node:
   - `npm run node`
5. In another terminal:
   - `npm run deploy:localhost`
6. Export helper address:
   - `npm run export:deployments`

## Local Default Addresses

After a clean local deploy in `Senza/hardhat` with the current deploy order:

- `MockUSDC`: `0x5FbDB2315678afecb367f032d93F642f64180aa3`
- `MockUSDT`: `0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512`
- `ConfidentialUSDC`: `0x9fE46736679d2d9a65F0992F2272dE9f3c7fa6e0`
- `ConfidentialUSDT`: `0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9`

## Notes on Confidential Send/Unwrap

Senza now encrypts clear amount inputs inside the popup and sends generated `handle + inputProof` under the hood.
No manual handle/proof paste is required.

## Current Status

- React/Vite extension implementation is active.
- FHE provider/hooks are wired into popup flows.
- Hardhat workspace is ready with contract, deploy script, and tests.

<!-- USDC SEPOLIA ADDRESS -->

0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238

<!-- USDT SEPOLIA ADDRESS -->

0x93C5d30a7509E60871B77A3548a5BD913334cd35
