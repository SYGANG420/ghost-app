import { useMemo, useState } from 'react';
import { sales } from '../data/mockData.js';

export default function KpiPage() {
  const [dailyUnits, setDailyUnits] = useState(4);
  const [unitProfit, setUnitProfit] = useState(42000);
  const actualProfit = sales.reduce((sum, item) => sum + item.price - item.cost - item.expense, 0);
  const forecast = useMemo(() => dailyUnits * unitProfit * 30, [dailyUnits, unitProfit]);

  return (
    <section className="form-grid">
      <div className="metric-card">
        <span>ACTUAL PROFIT</span>
        <strong>¥{actualProfit.toLocaleString()}</strong>
      </div>
      <div className="metric-card">
        <span>30D FORECAST</span>
        <strong>¥{forecast.toLocaleString()}</strong>
      </div>
      <div className="wide-panel">
        <h2>SIMULATION</h2>
        <label>DAILY UNITS<input type="range" min="1" max="20" value={dailyUnits} onChange={(event) => setDailyUnits(Number(event.target.value))} /></label>
        <label>UNIT PROFIT<input type="range" min="5000" max="120000" step="1000" value={unitProfit} onChange={(event) => setUnitProfit(Number(event.target.value))} /></label>
      </div>
      <div className="wide-panel">
        <h2>INVESTOR LEDGER</h2>
        <div className="feed-row"><span>POOL</span><strong>¥1,200,000</strong></div>
        <div className="feed-row"><span>DISTRIBUTED</span><strong>¥320,000</strong></div>
      </div>
    </section>
  );
}
