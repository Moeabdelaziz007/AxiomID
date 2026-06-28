import { createHash } from "crypto";
import * as StellarSdk from "stellar-sdk";
import { canonicalize } from "./sanitize";

/**
 * Computes a deterministic SHA-256 hash of a signed Verifiable Credential.
 * The VC is canonicalized (sorted keys) before hashing to ensure determinism.
 */
export function computeVcHash(signedVc: Record<string, unknown>): string {
  const canonical = canonicalize(signedVc);
  const json = JSON.stringify(canonical, null, 0);
  return createHash("sha256").update(json).digest("hex");
}

const HORIZON_URLS = {
  testnet: "https://horizon-testnet.stellar.org",
  mainnet: "https://horizon.stellar.org",
} as const;

function getNetworkPassphrase(): string {
  return process.env.STELLAR_NETWORK === "mainnet"
    ? StellarSdk.Networks.PUBLIC
    : StellarSdk.Networks.TESTNET;
}

export function getStellarServer(): StellarSdk.Horizon.Server {
  const network = process.env.STELLAR_NETWORK === "mainnet" ? "mainnet" : "testnet";
  return new StellarSdk.Horizon.Server(HORIZON_URLS[network]);
}

/**
 * Builds a minimum-XLM transaction with the VC hash as a text memo.
 * The transaction must be signed by the user's Stellar keypair before submission.
 */
export async function buildAnchorTransaction(
  stellarAddress: string,
  vcHash: string,
): Promise<StellarSdk.Transaction> {
  const server = getStellarServer();
  const account = await server.loadAccount(stellarAddress);
  const passphrase = getNetworkPassphrase();

  // Stellar memo max 28 bytes — truncate if needed
  const memoText = vcHash.slice(0, 28);

  const transaction = new StellarSdk.TransactionBuilder(account, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: passphrase,
  })
    .addOperation(
      StellarSdk.Operation.payment({
        destination: stellarAddress,
        asset: StellarSdk.Asset.native(),
        amount: "0.00001",
      }),
    )
    .addMemo(StellarSdk.Memo.text(memoText))
    .setTimeout(180)
    .build();

  return transaction;
}

/**
 * Submits a signed Stellar transaction to the network.
 * Returns the transaction hash and memo.
 */
export async function submitAnchorTransaction(
  signedTx: StellarSdk.Transaction,
): Promise<{ stellarTxId: string; memo: string }> {
  const server = getStellarServer();
  const result = await server.submitTransaction(signedTx);
  const memo =
    signedTx.memo.type === "text" && typeof signedTx.memo.value === "string"
      ? signedTx.memo.value
      : "";
  return { stellarTxId: result.hash, memo };
}
