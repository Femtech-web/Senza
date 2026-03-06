# Senza 2-Minute Demo Script

Target length: **1:55 to 2:00**  
Submission context: **Zama Developer Program Builder Track**  
Deadline reminder: **March 15, 2026, 23:59 AOE**

## Demo Goal

Show, in one continuous flow, that Senza is:

1. a functioning dApp using Zama confidential primitives,
2. a real-world FHE use case (private wallet operations),
3. full-stack (smart contracts + frontend extension),
4. documented and deployable on Sepolia.

## Pre-Demo Checklist (do before recording)

- Open these tabs/windows:
  - `chrome://extensions` (to show Senza installed)
  - Sepolia explorer tab for one tx hash (optional proof)
  - Hushroll (or any dApp) connect modal to show EIP-6963 detection
  - Senza popup unlocked and funded account selected
- Ensure wallet has:
  - small ETH on Sepolia
  - some USDC/USDT
  - existing cUSDC/cUSDT handles visible
- Keep extension network on **Sepolia**.
- Keep activity panel clean enough so new actions are obvious.

## Timestamped Script (Voice + Action)

### 0:00 - 0:12 | Hook

Voice:
"This is Senza, a confidential asset wallet on Ethereum using Zama FHEVM and ERC-7984. It brings privacy-preserving token operations into a wallet UX."

Action:
- Show Senza popup overview quickly.
- Highlight `USDC/USDT` and confidential assets.

### 0:12 - 0:28 | Real-world problem

Voice:
"In normal wallets, all balances and transfers are public by default. Senza lets users manage confidential balances and transfers while staying EVM-compatible."

Action:
- Open asset page.
- Point to confidential handle + decrypt control.

### 0:28 - 0:46 | Decrypt-on-demand

Voice:
"Balances are not shown as plaintext until the owner runs authorized decrypt flow."

Action:
- Click decrypt for `cUSDC` (or `cUSDT`).
- Show result appears only after decrypt step.

### 0:46 - 1:10 | Wrap and unwrap

Voice:
"Here I wrap USDC into confidential USDC, then unwrap back. The extension generates encrypted inputs and proofs for confidential methods automatically."

Action:
- Wrap a small amount.
- Show tx review/approval and success.
- Unwrap a small amount.
- Show post-action refresh and activity item.

### 1:10 - 1:28 | Confidential send

Voice:
"Now I send confidential tokens to another address. The amount is encrypted in-wallet before submission."

Action:
- Enter recipient + amount.
- Confirm send.
- Show pending then confirmed activity entry.

### 1:28 - 1:42 | dApp interoperability

Voice:
"Senza is also dApp-connectable through EIP-6963 and provider request approvals."

Action:
- Open dApp connect modal showing Senza in wallet list.
- Click Senza and show connect approval screen in extension.

### 1:42 - 1:54 | Full-stack proof

Voice:
"Under the hood: OpenZeppelin confidential wrappers, Zama config, tested Hardhat contracts, and subgraph-indexed activity powering fast history."

Action:
- Flash README + `hardhat/test` + `subgraph` folder quickly.

### 1:54 - 2:00 | Close

Voice:
"Senza makes confidential wallet operations practical on Ethereum today."

Action:
- Return to clean overview screen with logo and key balances.

## Recording Advice (to stay within 2 minutes)

- Record in one take with rehearsed clicks.
- Use fixed test amounts (`1`, `2`, `3`) to avoid typing delays.
- Keep voice pace steady, no long pauses.
- If a transaction waits too long, cut to already confirmed state (prepare fallback clip).
- Avoid scrolling unless necessary.
- Keep only one core story: **private wallet operations that still work like Web3 wallets**.

## Backup Plan If Network Is Slow

If Sepolia is congested:

- Keep one pre-confirmed tx in Activity as proof.
- Still execute one live action (e.g., decrypt or connect approval) during recording.
- Mention: "Tx confirmation can vary by network conditions; activity reflects final state once mined."
