const STORAGE_KEY = 'transactions';
let transactions = [];

function loadTransactions() {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
        try {
            transactions = JSON.parse(data);
        } catch (e) {
            console.error('Error al parsear datos', e);
            transactions = [];
        }
    }
}

function saveTransactions() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
}

function addTransaction(ticker, quantity, price, date) {
    transactions.push({ ticker, quantity: Number(quantity), price: Number(price), date });
    saveTransactions();
    render();
}

function groupedByTicker() {
    const groups = {};
    for (const tx of transactions) {
        if (!groups[tx.ticker]) groups[tx.ticker] = [];
        groups[tx.ticker].push(tx);
    }
    return groups;
}

async function fetchPrices(tickers) {
    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${tickers.join(',')}`;
    const res = await fetch(url);
    const json = await res.json();
    const prices = {};
    for (const q of json.quoteResponse.result) {
        prices[q.symbol] = q.regularMarketPrice;
    }
    return prices;
}

function renderHistory() {
    const tbody = document.querySelector('#history-table tbody');
    tbody.innerHTML = '';
    for (const tx of transactions) {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${tx.ticker}</td><td>${tx.quantity}</td><td>${tx.price}</td><td>${tx.date || ''}</td>`;
        tbody.appendChild(tr);
    }
}

async function renderPortfolio() {
    const groups = groupedByTicker();
    const tickers = Object.keys(groups);
    const prices = tickers.length ? await fetchPrices(tickers) : {};
    const tbody = document.querySelector('#portfolio-table tbody');
    tbody.innerHTML = '';

    let totalInvested = 0;
    let currentValue = 0;

    for (const ticker of tickers) {
        const txs = groups[ticker];
        let qty = 0;
        let invested = 0;
        for (const tx of txs) {
            qty += tx.quantity;
            invested += tx.quantity * tx.price;
        }
        const avg = invested / qty;
        const price = prices[ticker] || 0;
        const value = price * qty;
        const pl = value - invested;
        const change = invested ? (pl / invested) * 100 : 0;

        totalInvested += invested;
        currentValue += value;

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${ticker}</td>
            <td>${qty.toFixed(4)}</td>
            <td>${avg.toFixed(2)}</td>
            <td>${price.toFixed(2)}</td>
            <td>${value.toFixed(2)}</td>
            <td class="${pl >= 0 ? 'gain' : 'loss'}">${pl.toFixed(2)}</td>
            <td class="${pl >= 0 ? 'gain' : 'loss'}">${change.toFixed(2)}%</td>
        `;
        tbody.appendChild(tr);
    }

    const totalPL = currentValue - totalInvested;
    const totalReturn = totalInvested ? (totalPL / totalInvested) * 100 : 0;

    document.getElementById('total-invested').textContent = totalInvested.toFixed(2);
    document.getElementById('current-value').textContent = currentValue.toFixed(2);
    document.getElementById('total-pl').textContent = totalPL.toFixed(2);
    document.getElementById('total-return').textContent = totalReturn.toFixed(2) + '%';
}

function exportData() {
    const blob = new Blob([JSON.stringify(transactions, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'portfolio.json';
    a.click();
    URL.revokeObjectURL(url);
}

function importData(file) {
    const reader = new FileReader();
    reader.onload = () => {
        try {
            const data = JSON.parse(reader.result);
            if (Array.isArray(data)) {
                transactions = data;
                saveTransactions();
                render();
            }
        } catch (e) {
            console.error('Archivo inválido', e);
        }
    };
    reader.readAsText(file);
}

function render() {
    renderHistory();
    renderPortfolio();
}

// Event listeners

const form = document.getElementById('transaction-form');
form.addEventListener('submit', e => {
    e.preventDefault();
    const ticker = document.getElementById('ticker').value.trim().toUpperCase();
    const qty = document.getElementById('cantidad').value;
    const price = document.getElementById('precio').value;
    const date = document.getElementById('fecha').value;
    addTransaction(ticker, qty, price, date);
    form.reset();
});

document.getElementById('exportar').addEventListener('click', exportData);

const importBtn = document.getElementById('importar-btn');
const importInput = document.getElementById('importar');
importBtn.addEventListener('click', () => importInput.click());
importInput.addEventListener('change', e => {
    if (e.target.files.length) {
        importData(e.target.files[0]);
    }
});

window.addEventListener('load', () => {
    loadTransactions();
    render();
});
