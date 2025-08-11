import fs from 'fs/promises';
import path from 'path';

const dataFile = path.join(process.cwd(), 'data', 'transactions.json');

async function readTransactions() {
  try {
    const data = await fs.readFile(dataFile, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    if (err.code === 'ENOENT') {
      await fs.mkdir(path.dirname(dataFile), { recursive: true });
      await fs.writeFile(dataFile, '[]');
      return [];
    }
    throw err;
  }
}

async function writeTransactions(txs) {
  await fs.writeFile(dataFile, JSON.stringify(txs, null, 2));
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const txs = await readTransactions();
    res.status(200).json(txs);
  } else if (req.method === 'POST') {
    const { ticker, quantity, price, date, type } = req.body;
    const txs = await readTransactions();
    const newTx = {
      id: Date.now(),
      ticker: ticker.toUpperCase(),
      quantity: Number(quantity),
      price: Number(price),
      date: date || new Date().toISOString().slice(0, 10),
      type,
    };
    txs.push(newTx);
    await writeTransactions(txs);
    res.status(201).json(newTx);
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end('Method Not Allowed');
  }
}
