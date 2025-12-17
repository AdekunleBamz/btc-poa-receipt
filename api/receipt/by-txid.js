import { getReceiptByTxid } from '../_lib/db.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const { txid } = req.query;
  
  if (!txid) {
    return res.status(400).json({ error: 'txid parameter required' });
  }
  
  const receipt = await getReceiptByTxid(txid);
  
  if (!receipt) {
    return res.status(404).json({ error: 'Receipt not found' });
  }
  
  return res.status(200).json(receipt);
}
