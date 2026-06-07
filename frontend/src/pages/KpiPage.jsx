import { useState } from 'react';
import { investments as seedInvestments } from '../data/mockData.js';
import { yen } from '../utils/format.js';

const emptyInvestment = { investor: 'A', date: new Date().toISOString().slice(0, 10), amount: 100000, memo: '' };
const MONTHLY_REVENUE_TARGET = 1500000;
const TAKE_HOME_TARGET = 500000;
const FINAL_TARGET = 10000000;

function percent(value, max) {
  return max ? Math.min(Math.round((value / max) * 100), 100) : 0;
}

export default function KpiPage({ salesRecords, selectedMonth, setSelectedMonth, kpiSummary }) {
  const [subTab, setSubTab] = useState('actual');
  const [settlementPool, setSettlementPool] = useState(940000);
  const [elapsedMonths, setElapsedMonths] = useState(1);
  const [investments, setInvestments] = useState(seedInvestments);
  const [draft, setDraft] = useState(emptyInvestment);
  const monthRecords = salesRecords.filter((item) => String(item.date || '').startsWith(selectedMonth));
  const totalRevenue = kpiSummary?.revenue ?? monthRecords.reduce((sum, item) => sum + item.revenue, 0);
  const grossProfit = kpiSummary?.gross ?? monthRecords.reduce((sum, item) => sum + item.grossProfit, 0);
  const commissionPool = Math.round(grossProfit * 0.75);
  const restockPool = Math.round(grossProfit * 0.15);
  const expenseReserve = grossProfit - commissionPool - restockPool;
  const productBreakdown = monthRecords.reduce((acc, item) => ({ ...acc, [item.productName]: (acc[item.productName] || 0) + item.revenue }), {});
  const productGrossBreakdown = monthRecords.reduce((acc, item) => ({ ...acc, [item.productName]: (acc[item.productName] || 0) + item.grossProfit }), {});
  const dailyBreakdown = monthRecords.reduce((acc, item) => ({ ...acc, [item.date]: (acc[item.date] || 0) + item.revenue }), {});
  const staffGross = monthRecords.reduce((acc, item) => ({ ...acc, [item.staff]: (acc[item.staff] || 0) + item.grossProfit }), { A: 0, B: 0 });
  const staffDelivery = monthRecords.reduce((acc, item) => ({ ...acc, [item.staff]: (acc[item.staff] || 0) + item.deliveryFee }), { A: 0, B: 0 });
  const staffCount = monthRecords.reduce((acc, item) => ({ ...acc, [item.staff]: (acc[item.staff] || 0) + 1 }), { A: 0, B: 0 });
  const takeHomeA = Math.round(kpiSummary?.take_home?.A ?? (staffGross.A * 0.75 + staffDelivery.A));
  const takeHomeB = Math.round(kpiSummary?.take_home?.B ?? (staffGross.B * 0.75 + staffDelivery.B));
  const totalInvestment = investments.reduce((sum, item) => sum + item.amount, 0);
  const investmentTotals = investments.reduce((acc, item) => ({ ...acc, [item.investor]: (acc[item.investor] || 0) + item.amount }), { A: 0, B: 0 });
  const ratioA = totalInvestment > 0 ? Math.round((investmentTotals.A / totalInvestment) * 100) : 50;
  const ratioB = 100 - ratioA;
  const settlementA = Math.round(settlementPool * (ratioA / 100));
  const settlementB = settlementPool - settlementA;

  const addInvestment = (event) => {
    event.preventDefault();
    setInvestments((current) => [{ ...draft, id: Date.now(), amount: Number(draft.amount) }, ...current]);
    setDraft(emptyInvestment);
  };

  const renderProgress = (value, max) => (
    <div className="bar-track"><span style={{ width: `${percent(value, max)}%` }} /></div>
  );
  const remainingMonths = Math.max(18 - elapsedMonths, 1);

  return (
    <section className="page-stack">
      <div className="subtabs wide-panel">
        <button className={subTab === 'actual' ? 'active' : ''} type="button" onClick={() => setSubTab('actual')}>&#x5b9f;&#x7e3e;</button>
        <button className={subTab === 'investment' ? 'active' : ''} type="button" onClick={() => setSubTab('investment')}>&#x51fa;&#x8cc7;</button>
      </div>

      {subTab === 'actual' ? (
        <>
          <div className="wide-panel cyber-card">
            <div className="panel-title-row">
              <h2>&#x6708;&#x9593;&#x58f2;&#x4e0a;</h2>
              <input className="month-input-inline" type="month" value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)} />
            </div>
            <div className="kpi-total">{yen(totalRevenue)}</div>
            {renderProgress(totalRevenue, MONTHLY_REVENUE_TARGET)}
            <div className="mini-chart">
              {Object.entries(dailyBreakdown).slice(-10).map(([date, value]) => (
                <span key={date} style={{ height: `${Math.max(8, percent(value, Math.max(...Object.values(dailyBreakdown), 1)))}%` }} title={`${date} ${yen(value)}`} />
              ))}
            </div>
            <div className="report-grid">
              {Object.entries(productBreakdown).map(([name, value]) => (
                <div key={name}><span>{name}</span><strong>{yen(value)}</strong></div>
              ))}
              {Object.keys(productBreakdown).length === 0 && <div><span>&#x58f2;&#x4e0a;</span><strong>{yen(0)}</strong></div>}
            </div>
          </div>
          <div className="wide-panel cyber-card">
            <h2>&#x7c97;&#x5229;&#x5185;&#x8a33;</h2>
            <div className="allocation-bar">
              <span style={{ width: '75%' }}>75%</span>
              <span style={{ width: '15%' }}>15%</span>
              <span style={{ width: '10%' }}>10%</span>
            </div>
            <div className="report-grid">
              <div><span>&#x7c97;&#x5229;&#x5408;&#x8a08;</span><strong>{yen(grossProfit)}</strong></div>
              <div><span>&#x6b69;&#x5408;&#x30d7;&#x30fc;&#x30eb; 75%</span><strong>{yen(commissionPool)}</strong></div>
              <div><span>&#x518d;&#x4ed5;&#x5165;&#x308c; 15%</span><strong>{yen(restockPool)}</strong></div>
              <div><span>&#x7d4c;&#x8cbb;&#x7a4d;&#x7acb; 10%</span><strong>{yen(expenseReserve)}</strong></div>
            </div>
            <div className="wide-panel embedded-panel">
              <h2>&#x5546;&#x54c1;&#x5225;&#x7c97;&#x5229;&#x30e9;&#x30f3;&#x30ad;&#x30f3;&#x30b0;</h2>
              {Object.entries(productGrossBreakdown).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, value]) => (
                <div className="feed-row" key={name}><span>{name}</span><strong>{yen(value)}</strong></div>
              ))}
            </div>
          </div>
          <div className="wide-panel cyber-card">
            <h2>&#x4eca;&#x6708;&#x306e;&#x624b;&#x53d6;&#x308a;</h2>
            <div className="payout-row"><span>A&#x3055;&#x3093;</span><strong>{yen(Math.round(staffGross.A * 0.75))} + {yen(staffDelivery.A)} = {yen(takeHomeA)}</strong></div>
            {renderProgress(takeHomeA, TAKE_HOME_TARGET)}
            <div className="payout-row"><span>B&#x3055;&#x3093;</span><strong>{yen(Math.round(staffGross.B * 0.75))} + {yen(staffDelivery.B)} = {yen(takeHomeB)}</strong></div>
            {renderProgress(takeHomeB, TAKE_HOME_TARGET)}
            <div className="report-grid">
              {['A', 'B'].map((name) => (
                <div key={name}>
                  <span>{name}&#x3055;&#x3093;&#x8a73;&#x7d30;</span>
                  <strong>{staffCount[name]}&#x4ef6; / &#x7c97;&#x5229; {yen(staffGross[name])} / &#x914d;&#x9054; {yen(staffDelivery[name])}</strong>
                </div>
              ))}
            </div>
          </div>
          <div className="wide-panel cyber-card">
            <h2>&#xa5;1000&#x4e07; &#x9054;&#x6210;&#x9032;&#x6357;</h2>
            <label>
              &#x7d4c;&#x904e;&#x6708;: {elapsedMonths}&#x30f6;&#x6708;&#x76ee; / &#x6b8b;&#x308a;{remainingMonths}&#x30f6;&#x6708;
              <input type="range" min="1" max="17" value={elapsedMonths} onChange={(event) => setElapsedMonths(Number(event.target.value))} />
            </label>
            {[
              ['A', takeHomeA],
              ['B', takeHomeB],
            ].map(([name, total]) => {
              const remaining = Math.max(FINAL_TARGET - total, 0);
              const monthlyNeeded = Math.ceil(remaining / remainingMonths);
              return (
                <div className="target-block" key={name}>
                  <div className="payout-row"><span>{name}&#x3055;&#x3093;&#x7d2f;&#x8a08;</span><strong>{yen(total)}</strong></div>
                  {renderProgress(total, FINAL_TARGET)}
                  <div className="report-grid">
                    <div><span>&#x6b8b;&#x308a;&#x984d;</span><strong>{yen(remaining)}</strong></div>
                    <div><span>&#x6708;&#x5fc5;&#x8981;&#x984d;</span><strong>{yen(monthlyNeeded)}</strong></div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <>
          <div className="metric-card"><span>&#x7d2f;&#x8a08;&#x51fa;&#x8cc7;</span><strong>{yen(totalInvestment)}</strong></div>
          <div className="metric-card"><span>A / B &#x6bd4;&#x7387;</span><strong>{ratioA}% / {ratioB}%</strong></div>
          <div className="wide-panel">
            <h2>&#x51fa;&#x8cc7;&#x6bd4;&#x7387;</h2>
            <div className="ratio-bar" aria-label="Investment ratio"><span style={{ width: `${ratioA}%` }}>A {ratioA}%</span><span style={{ width: `${ratioB}%` }}>B {ratioB}%</span></div>
          </div>
          <form className="wide-panel compact-form" onSubmit={addInvestment}>
            <h2>&#x65b0;&#x898f;&#x51fa;&#x8cc7;</h2>
            <label>&#x51fa;&#x8cc7;&#x8005;<select value={draft.investor} onChange={(event) => setDraft({ ...draft, investor: event.target.value })}><option value="A">A</option><option value="B">B</option></select></label>
            <label>&#x65e5;&#x4ed8;<input type="date" value={draft.date} onChange={(event) => setDraft({ ...draft, date: event.target.value })} /></label>
            <label>&#x91d1;&#x984d;<input type="number" value={draft.amount} onChange={(event) => setDraft({ ...draft, amount: event.target.value })} /></label>
            <label>&#x30e1;&#x30e2;<input value={draft.memo} onChange={(event) => setDraft({ ...draft, memo: event.target.value })} /></label>
            <button type="submit">&#x767b;&#x9332;</button>
          </form>
          <div className="wide-panel">
            <h2>&#x51fa;&#x8cc7;&#x5c65;&#x6b74;</h2>
            {investments.map((item) => (
              <div className="investment-row" key={item.id}><span>{item.date}</span><strong>{item.investor}</strong><span>{yen(item.amount)}</span><span>{item.memo || '\u30e1\u30e2\u306a\u3057'}</span></div>
            ))}
          </div>
          <div className="wide-panel">
            <h2>&#x6e05;&#x7b97;&#x30b7;&#x30df;&#x30e5;&#x30ec;&#x30fc;&#x30bf;&#x30fc;</h2>
            <label>&#x6e05;&#x7b97;&#x539f;&#x8cc7;<input type="range" min="100000" max="3000000" step="10000" value={settlementPool} onChange={(event) => setSettlementPool(Number(event.target.value))} /></label>
            <div className="feed-row"><span>A&#x6e05;&#x7b97;&#x984d;</span><strong>{yen(settlementA)}</strong></div>
            <div className="feed-row"><span>B&#x6e05;&#x7b97;&#x984d;</span><strong>{yen(settlementB)}</strong></div>
          </div>
        </>
      )}
    </section>
  );
}
