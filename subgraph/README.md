# Senza Subgraph

Minimal subgraph for confidential token activity (wrap/unwrap/confidential transfers).

## Local setup

1) Set RPC target (pick one):

```bash
# Local hardhat node (default if ETHEREUM_RPC is not set)
unset ETHEREUM_RPC

# Or Sepolia RPC
export ETHEREUM_RPC="https://ethereum-sepolia-rpc.publicnode.com"
```

2) Start graph services:

```bash
docker compose up -d
```

3) Build/deploy subgraph:

```bash
npm install
npm run codegen
npm run build
npm run create-local
npm run deploy-local
```

## Data sources

- cUSDC (Sepolia): `0xbd7793f531643208Dc8117cd7Ed9a4c4B95311E1`
- cUSDT (Sepolia): `0xf51fE73BB97340401ae1815A96B3B5C7D501cfA0`

Update these in `subgraph.yaml` if you redeploy tokens.
