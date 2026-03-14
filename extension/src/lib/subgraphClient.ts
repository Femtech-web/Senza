import { GraphQLClient } from "graphql-request";

const DEFAULT_SUBGRAPH_URL =
  " https://api.studio.thegraph.com/query/1744337/senza/v0.0.1";

export const SUBGRAPH_URL =
  (import.meta as { env?: { VITE_SUBGRAPH_URL?: string } }).env?.VITE_SUBGRAPH_URL ||
  DEFAULT_SUBGRAPH_URL;

export const subgraphClient = new GraphQLClient(SUBGRAPH_URL);
