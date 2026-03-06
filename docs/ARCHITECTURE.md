# Senza Architecture

## Goal

Deliver a lightweight browser extension wallet for confidential token operations on Zama FHEVM.

## Components

1. Extension UI (`extension/popup`)
- Portfolio view
- Wrap/unwrap/send actions
- Token activity stream

2. Extension runtime (`extension/service-worker.js`)
- Local settings persistence
- Network/session hooks

3. Smart contract helper (`contracts/SenzaWalletHelper.sol`)
- Wrap helper path
- User token preferences
- Event surface for indexing

4. Data layer (next step)
- Subgraph for wallet activity entities
- Frontend query hooks for activity/history

## Target Flows

1. User connects wallet.
2. User wraps USDC/USDT to confidential tokens.
3. User decrypts and views permitted balances.
4. User sends confidential transfer.
5. Activity feed updates from indexed events.

