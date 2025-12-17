import { verifyProof } from './_lib/db.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const { hash } = req.query;
  
  if (!hash) {
    return res.status(400).json({ error: 'hash parameter required' });
  }
  
  const result = await verifyProof(hash);
  return res.status(200).json(result);
}
