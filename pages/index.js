import { useEffect, useState } from 'react';

async function fetchPrices(tickers) {
  const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${tickers.join(',')}`;
  const res = await fetch(url);
  const json = await res.json();
  const prices = {};
  json.quoteResponse.result.forEach(q => {
    prices[q.symbol] = q.regularMarketPrice;
  });
  return prices;
}

export default function Home() {
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [form, setForm] = useState({ ticker: '', quantity: '', price: '', date: '', type: 'buy' });

  useEffect(() => {
    loadTransactions();
  }, []);

  useEffect(() => {
    buildSummary();
  }, [transactions]);

  async function loadTransactions() {
    const res = await fetch('/api/transactions');
    const data = await res.json();
    setTransactions(data);
  }

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    await fetch('/api/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setForm({ ticker: '', quantity: '', price: '', date: '', type: 'buy' });
    loadTransactions();
  }

  async function buildSummary() {
    if (!transactions.length) {
      setSummary([]);
      return;
    }
    const byTicker = {};
    for (const tx of transactions) {
      const t = tx.ticker;
      if (!byTicker[t]) byTicker[t] = { quantity: 0, totalCost: 0, realized: 0 };
      const item = byTicker[t];
      if (tx.type === 'buy') {
        item.quantity += tx.quantity;
        item.totalCost += tx.quantity * tx.price;
      } else {
        const avg = item.quantity ? item.totalCost / item.quantity : 0;
        item.quantity -= tx.quantity;
        item.totalCost -= avg * tx.quantity;
        item.realized += (tx.price - avg) * tx.quantity;
      }
    }
    const tickers = Object.keys(byTicker);
    const prices = await fetchPrices(tickers);
    const rows = tickers.map(t => {
      const item = byTicker[t];
      const avg = item.quantity ? item.totalCost / item.quantity : 0;
      const price = prices[t] || 0;
      const unrealized = item.quantity * (price - avg);
      return {
        ticker: t,
        quantity: item.quantity,
        avg,
        price,
        unrealized,
        realized: item.realized,
      };
    });
    setSummary(rows);
  }

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Portfolio Tracker</h1>
      <form onSubmit={handleSubmit} className="grid grid-cols-6 gap-2 mb-6">
        <input name="ticker" value={form.ticker} onChange={handleChange} placeholder="Ticker" className="border p-2 col-span-1" required />
        <input name="quantity" type="number" step="any" value={form.quantity} onChange={handleChange} placeholder="Cantidad" className="border p-2 col-span-1" required />
        <input name="price" type="number" step="any" value={form.price} onChange={handleChange} placeholder="Precio" className="border p-2 col-span-1" required />
        <input name="date" type="date" value={form.date} onChange={handleChange} className="border p-2 col-span-1" />
        <select name="type" value={form.type} onChange={handleChange} className="border p-2 col-span-1">
          <option value="buy">Compra</option>
          <option value="sell">Venta</option>
        </select>
        <button type="submit" className="bg-blue-500 text-white rounded col-span-1">Agregar</button>
      </form>

      <h2 className="text-xl font-semibold mb-2">Resumen</h2>
      <table className="w-full text-sm mb-4">
        <thead>
          <tr className="border-b text-left">
            <th>Ticker</th>
            <th>Cantidad</th>
            <th>Promedio</th>
            <th>Precio</th>
            <th>PNL no realiz.</th>
            <th>PNL realiz.</th>
          </tr>
        </thead>
        <tbody>
          {summary.map(row => (
            <tr key={row.ticker} className="border-b">
              <td>{row.ticker}</td>
              <td>{row.quantity.toFixed(4)}</td>
              <td>{row.avg.toFixed(2)}</td>
              <td>{row.price.toFixed(2)}</td>
              <td className={row.unrealized >= 0 ? 'text-green-600' : 'text-red-600'}>{row.unrealized.toFixed(2)}</td>
              <td className={row.realized >= 0 ? 'text-green-600' : 'text-red-600'}>{row.realized.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <button onClick={() => setShowHistory(!showHistory)} className="bg-gray-200 px-4 py-2 rounded mb-4">
        {showHistory ? 'Ocultar histórico' : 'Ver histórico'}
      </button>

      {showHistory && (
        <div>
          <h2 className="text-xl font-semibold mb-2">Histórico</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th>Ticker</th>
                <th>Tipo</th>
                <th>Cantidad</th>
                <th>Precio</th>
                <th>Fecha</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map(tx => (
                <tr key={tx.id} className="border-b">
                  <td>{tx.ticker}</td>
                  <td>{tx.type}</td>
                  <td>{tx.quantity}</td>
                  <td>{tx.price}</td>
                  <td>{tx.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
