import { Keypair, TransactionBuilder, Networks, Server, Transaction, Asset } from "@stellar/stellar-sdk";
import { signTransaction, isConnected, getPublicKey } from "@stellar/freighter-api";

const server = new Server("https://horizon-testnet.stellar.org");

/**
 * Heavy transaction operations module.
 * Verifies a transaction on the Stellar ledger using the official Stellar SDK.
 * @param hash The transaction hash to verify.
 */
export async function verifyOnLedger(hash?: string): Promise<boolean> {
  if (!hash) {
    throw new Error("Transaction hash is required for verification.");
  }
  
  console.log("Initializing secure ledger verification via Horizon...");
  try {
    const tx = await server.transactions().transaction(hash).call();
    console.log("Verification complete for hash:", tx.hash);
    return tx.successful;
  } catch (err) {
    console.error("Ledger verification failed:", err);
    return false;
  }
}

/**
 * Builds, signs (via Freighter), and submits a transaction to the Stellar network.
 * @param payload The staking allocations payload.
 */
export async function submitTransaction(payload: Record<string, number>): Promise<string> {
  console.log("Preparing transaction with payload:", payload);
  
  if (!(await isConnected())) {
    throw new Error("Freighter wallet is not connected. Please connect your wallet first.");
  }

  const publicKey = await getPublicKey();
  
  // Load account from Horizon to get the current sequence number
  const account = await server.loadAccount(publicKey);
  const fee = await server.fetchBaseFee();

  // Initialize TransactionBuilder
  const txBuilder = new TransactionBuilder(account, {
    fee: fee.toString(),
    networkPassphrase: Networks.TESTNET,
  });

  // A timebounds configuration is required for all transactions
  txBuilder.setTimeout(60); // 60 seconds timeout
  
  // Build the transaction
  const tx = txBuilder.build();

  // Request the user's signature via the Freighter extension
  const signedTxXdr = await signTransaction(tx.toXDR(), {
    network: "TESTNET",
    networkPassphrase: Networks.TESTNET,
  });

  // Reconstruct the transaction from the signed XDR
  const signedTx = TransactionBuilder.fromXDR(signedTxXdr, Networks.TESTNET) as Transaction;
  
  // Submit to the Stellar network
  const response = await server.submitTransaction(signedTx);
  
  if (!response.successful) {
    throw new Error("Transaction failed on the network");
  }

  return response.hash;
}
