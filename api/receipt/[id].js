import { getReceiptById } from '../_lib/db.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const { id } = req.query;
  
  if (!id) {
    return res.status(400).json({ error: 'Receipt ID required' });
  }
  
  const receipt = await getReceiptById(id);
  
  if (!receipt) {
    return res.status(404).json({ error: 'Receipt not found' });
  }
  
  return res.status(200).json({
    id: receipt.id,
    txid: receipt.txid,
    userAddress: receipt.user_address,
    proofHash: receipt.proof_hash,
    blockHeight: receipt.block_height,
    submissionId: receipt.submission_id,
    timestamp: receipt.timestamp,
    verifyUrl: `https://explorer.hiro.so/txid/${receipt.txid}?chain=mainnet`
  });
}
