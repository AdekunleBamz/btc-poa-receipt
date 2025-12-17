// Simple in-memory storage with Vercel Blob fallback
// For production, connect Vercel KV or use a database

let memoryStore = new Map();

// Generate short ID
function generateId() {
  return Math.random().toString(36).substring(2, 14);
}

// Store a new receipt
export async function storeReceipt(data) {
  const { txid, userAddress, proofHash, blockHeight, submissionId } = data;
  
  // Check if already exists
  for (const [key, receipt] of memoryStore) {
    if (receipt.txid === txid) return receipt;
  }
  
  const id = generateId();
  const timestamp = new Date().toISOString();
  
  const receipt = {
    id,
    txid,
    user_address: userAddress,
    proof_hash: proofHash,
    block_height: blockHeight,
    submission_id: submissionId,
    timestamp,
  };
  
  // Store with multiple keys for lookup
  memoryStore.set(`receipt:${id}`, receipt);
  memoryStore.set(`txid:${txid}`, receipt);
  memoryStore.set(`hash:${proofHash}`, receipt);
  
  return receipt;
}

// Get receipt by ID
export async function getReceiptById(id) {
  return memoryStore.get(`receipt:${id}`) || null;
}

// Get receipt by txid
export async function getReceiptByTxid(txid) {
  return memoryStore.get(`txid:${txid}`) || null;
}

// Get receipt by proof hash
export async function getReceiptByHash(proofHash) {
  return memoryStore.get(`hash:${proofHash}`) || null;
}

// Get receipts by user address
export async function getReceiptsByUser(userAddress, limit = 50) {
  const receipts = [];
  for (const [key, receipt] of memoryStore) {
    if (key.startsWith('receipt:') && receipt.user_address === userAddress) {
      receipts.push(receipt);
    }
  }
  return receipts.slice(0, limit);
}

// Verify a proof exists
export async function verifyProof(proofHash) {
  const receipt = await getReceiptByHash(proofHash);
  return receipt ? { verified: true, receipt } : { verified: false };
}
