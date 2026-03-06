import { GraphQLClient } from "graphql-request";

const DEFAULT_SUBGRAPH_URL =
  "http://localhost:8000/subgraphs/name/senza";

export const SUBGRAPH_URL =
  (import.meta as { env?: { VITE_SUBGRAPH_URL?: string } }).env?.VITE_SUBGRAPH_URL ||
  DEFAULT_SUBGRAPH_URL;

export const subgraphClient = new GraphQLClient(SUBGRAPH_URL);
