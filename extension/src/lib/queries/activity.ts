import { gql } from "graphql-request";

export const ACTIVITY_QUERY = gql`
  query TokenActivity($actor: Bytes!, $first: Int!, $skip: Int!) {
    tokenActivities(
      where: { actor: $actor }
      orderBy: timestamp
      orderDirection: desc
      first: $first
      skip: $skip
    ) {
      id
      actor
      token
      activityType
      counterparty
      encryptedAmount
      clearAmount
      timestamp
      transactionHash
      blockNumber
    }
  }
`;

export const ACTIVITY_COUNT_QUERY = gql`
  query TokenActivityCount($actor: Bytes!) {
    tokenActivities(where: { actor: $actor }) {
      id
    }
  }
`;
