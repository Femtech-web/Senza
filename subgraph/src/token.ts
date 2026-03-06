import {
  ConfidentialTransfer,
  UnwrapFinalized,
  UnwrapRequested,
} from "../generated/ConfidentialUSDC_Official/ConfidentialToken";
import { TokenActivity } from "../generated/schema";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

function makeActivityId(txHash: string, logIndex: string): string {
  return txHash + "-" + logIndex;
}

export function handleConfidentialTransfer(event: ConfidentialTransfer): void {
  const txHash = event.transaction.hash.toHexString();
  const logIndex = event.logIndex.toString();
  const from = event.params.from.toHexString();
  const to = event.params.to.toHexString();

  if (from == ZERO_ADDRESS) {
    let id = makeActivityId(txHash, logIndex);
    let activity = new TokenActivity(id);
    activity.actor = event.params.to;
    activity.token = event.address;
    activity.activityType = "WRAP";
    activity.counterparty = event.params.from;
    activity.encryptedAmount = event.params.amount;
    activity.timestamp = event.block.timestamp;
    activity.transactionHash = event.transaction.hash;
    activity.blockNumber = event.block.number;
    activity.save();
    return;
  }

  if (to == ZERO_ADDRESS) {
    let id = makeActivityId(txHash, logIndex);
    let activity = new TokenActivity(id);
    activity.actor = event.params.from;
    activity.token = event.address;
    activity.activityType = "BURN";
    activity.counterparty = event.params.to;
    activity.encryptedAmount = event.params.amount;
    activity.timestamp = event.block.timestamp;
    activity.transactionHash = event.transaction.hash;
    activity.blockNumber = event.block.number;
    activity.save();
    return;
  }

  let idOut = makeActivityId(txHash, logIndex + "-out");
  let out = new TokenActivity(idOut);
  out.actor = event.params.from;
  out.token = event.address;
  out.activityType = "CONFIDENTIAL_TRANSFER_OUT";
  out.counterparty = event.params.to;
  out.encryptedAmount = event.params.amount;
  out.timestamp = event.block.timestamp;
  out.transactionHash = event.transaction.hash;
  out.blockNumber = event.block.number;
  out.save();

  let idIn = makeActivityId(txHash, logIndex + "-in");
  let incoming = new TokenActivity(idIn);
  incoming.actor = event.params.to;
  incoming.token = event.address;
  incoming.activityType = "CONFIDENTIAL_TRANSFER_IN";
  incoming.counterparty = event.params.from;
  incoming.encryptedAmount = event.params.amount;
  incoming.timestamp = event.block.timestamp;
  incoming.transactionHash = event.transaction.hash;
  incoming.blockNumber = event.block.number;
  incoming.save();
}

export function handleUnwrapRequested(event: UnwrapRequested): void {
  let id = makeActivityId(
    event.transaction.hash.toHexString(),
    event.logIndex.toString()
  );
  let activity = new TokenActivity(id);
  activity.actor = event.params.receiver;
  activity.token = event.address;
  activity.activityType = "UNWRAP_REQUEST";
  activity.encryptedAmount = event.params.amount;
  activity.timestamp = event.block.timestamp;
  activity.transactionHash = event.transaction.hash;
  activity.blockNumber = event.block.number;
  activity.save();
}

export function handleUnwrapFinalized(event: UnwrapFinalized): void {
  let id = makeActivityId(
    event.transaction.hash.toHexString(),
    event.logIndex.toString()
  );
  let activity = new TokenActivity(id);
  activity.actor = event.params.receiver;
  activity.token = event.address;
  activity.activityType = "UNWRAP_FINALIZED";
  activity.encryptedAmount = event.params.encryptedAmount;
  activity.clearAmount = event.params.cleartextAmount;
  activity.timestamp = event.block.timestamp;
  activity.transactionHash = event.transaction.hash;
  activity.blockNumber = event.block.number;
  activity.save();
}
