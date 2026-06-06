import { useMemo, useState } from 'react';
import { investments as seedInvestments, sales } from '../data/mockData.js';

const emptyInvestment = {
  investor: 'A',
  date: new Date().toISOString().slice(0, 10),
  amount: 100000,
  memo: '',
};

export default function KpiPage() {
  const [subTab, setSubTab] = useState('PERFORMANCE');
  const [dailyUnits, setDailyUnits] = useState(4);
  const [unitProfit, setUnitProfit] = useState(42000);
  const [settlementPool, setSettlementPool] = useState(940000);
  const [investments, setInvestments] = useState(seedInvestments);
  const [draft, setDraft] = useState(emptyInvestment);
  const actualProfit = sales.reduce((sum, item) => sum + item.price - item.cost - item.expense, 0);
  const forecast = useMemo(() => dailyUnits * unitProfit * 30, [dailyUnits, unitProfit]);
  const totalInvestment = investments.reduce((sum, item) => sum + item.amount, 0);
  const totals = investments.reduce(
    (acc, item) => ({ ...acc, [item.investor]: (acc[item.investor] || 0) + item.amount }),
    { A: 0, B: 0 }
  );
  const ratioA = totalInvestment > 0 ? Math.round((totals.A / totalInvestment) * 100) : 50;
  const ratioB = 100 - ratioA;
  const settlementA = Math.round(settlementPool * (ratioA / 100));
  const settlementB = settlementPool - settlementA;

  const addInvestment = (event) => {
    event.preventDefault();
    setInvestments((current) => [{ ...draft, id: Date.now(), amount: Number(draft.amount) }, ...current]);
    setDraft(emptyInvestment);
  };

  return (
    <section className="form-grid">
      <div className="subtabs wide-panel">
        {['PERFORMANCE', 'INVESTMENT'].map((tab) => (
          <button className={subTab === tab ? 'active' : ''} key={tab} type="button" onClick={() => setSubTab(tab)}>
            {tab}
          </button>
        ))}
      </div>

      {subTab === 'PERFORMANCE' ? (
        <>
          <div className="metric-card">
            <span>ACTUAL PROFIT</span>
            <strong>JPY {actualProfit.toLocaleString()}</strong>
          </div>
          <div className="metric-card">
            <span>30D FORECAST</span>
            <strong>JPY {forecast.toLocaleString()}</strong>
          </div>
          <div className="wide-panel">
            <h2>SIMULATION</h2>
            <label>DAILY UNITS<input type="range" min="1" max="20" value={dailyUnits} onChange={(event) => setDailyUnits(Number(event.target.value))} /></label>
            <label>UNIT PROFIT<input type="range" min="5000" max="120000" step="1000" value={unitProfit} onChange={(event) => setUnitProfit(Number(event.target.value))} /></label>
          </div>
        </>
      ) : (
        <>
          <div className="metric-card">
            <span>TOTAL INVESTMENT</span>
            <strong>JPY {totalInvestment.toLocaleString()}</strong>
          </div>
          <div className="metric-card">
            <span>A / B RATIO</span>
            <strong>{ratioA}% / {ratioB}%</strong>
          </div>
          <div className="wide-panel">
            <h2>INVESTMENT RATIO</h2>
            <div className="ratio-bar" aria-label="Investment ratio">
              <span style={{ width: `${ratioA}%` }}>A {ratioA}%</span>
              <span style={{ width: `${ratioB}%` }}>B {ratioB}%</span>
            </div>
          </div>
          <form className="wide-panel compact-form" onSubmit={addInvestment}>
            <h2>NEW INVESTMENT</h2>
            <label>INVESTOR
              <select value={draft.investor} onChange={(event) => setDraft({ ...draft, investor: event.target.value })}>
                <option value="A">A</option>
                <option value="B">B</option>
              </select>
            </label>
            <label>DATE<input type="date" value={draft.date} onChange={(event) => setDraft({ ...draft, date: event.target.value })} /></label>
            <label>AMOUNT<input type="number" value={draft.amount} onChange={(event) => setDraft({ ...draft, amount: event.target.value })} /></label>
            <label>MEMO<input value={draft.memo} onChange={(event) => setDraft({ ...draft, memo: event.target.value })} /></label>
            <button type="submit">REGISTER</button>
          </form>
          <div className="wide-panel">
            <h2>INVESTMENT HISTORY</h2>
            {investments.map((item) => (
              <div className="investment-row" key={item.id}>
                <span>{item.date}</span>
                <strong>{item.investor}</strong>
                <span>JPY {item.amount.toLocaleString()}</span>
                <span>{item.memo || 'NO MEMO'}</span>
              </div>
            ))}
          </div>
          <div className="wide-panel">
            <h2>SETTLEMENT SIMULATOR</h2>
            <label>POOL<input type="range" min="100000" max="3000000" step="10000" value={settlementPool} onChange={(event) => setSettlementPool(Number(event.target.value))} /></label>
            <div className="feed-row"><span>A PAYOUT</span><strong>JPY {settlementA.toLocaleString()}</strong></div>
            <div className="feed-row"><span>B PAYOUT</span><strong>JPY {settlementB.toLocaleString()}</strong></div>
          </div>
        </>
      )}
    </section>
  );
}
