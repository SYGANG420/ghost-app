import { Activity, CircleDollarSign, PackageOpen, RadioTower } from 'lucide-react';
import { statusJa, yen } from '../utils/format.js';
import { useState } from 'react';

function deviceLabel(deviceId) {
  return deviceId === 'device_b' ? 'B' : 'A';
}

export default function HomePage({ socketState, deviceId, salesRecords, products }) {
  const [range, setRange] = useState('month');
  const today = new Date().toISOString().slice(0, 10);
  const month = today.slice(0, 7);
  const ownSales = salesRecords.filter((item) => {
    if (item.deviceId !== deviceId) return false;
    if (range === 'today') return item.date === today;
    return String(item.date || '').startsWith(month);
  });
  const revenue = ownSales.reduce((sum, item) => sum + item.revenue, 0);
  const takeHome = ownSales.reduce((sum, item) => sum + item.grossProfit * 0.75 + item.deliveryFee, 0);
  const alerts = products.filter((item) => item.quantity <= item.threshold);
  const label = deviceLabel(deviceId);

  return (
    <section className="page-stack">
      <div className="alert-strip">
        <span className="signal-dot" />
        <strong>&#x7aef;&#x672b;{label} &#x30c0;&#x30c3;&#x30b7;&#x30e5;&#x30dc;&#x30fc;&#x30c9;</strong>
        <span>&#x3053;&#x306e;&#x30c7;&#x30d0;&#x30a4;&#x30b9;&#x5206;&#x306e;&#x58f2;&#x4e0a;&#x3068;&#x624b;&#x53d6;&#x308a;</span>
      </div>
      <div className="segmented-row wide-panel compact-segment">
        <button className={range === 'today' ? 'active' : ''} type="button" onClick={() => setRange('today')}>&#x4eca;&#x65e5;</button>
        <button className={range === 'month' ? 'active' : ''} type="button" onClick={() => setRange('month')}>&#x4eca;&#x6708;</button>
      </div>
      <div className="metric-grid">
        <article className="metric-card">
          <CircleDollarSign />
          <span>&#x81ea;&#x5206;&#x306e;&#x58f2;&#x4e0a;</span>
          <strong>{yen(revenue)}</strong>
        </article>
        <article className="metric-card">
          <Activity />
          <span>&#x81ea;&#x5206;&#x306e;&#x624b;&#x53d6;&#x308a;</span>
          <strong>{yen(takeHome)}</strong>
        </article>
        <article className="metric-card danger">
          <PackageOpen />
          <span>&#x5728;&#x5eab;&#x30a2;&#x30e9;&#x30fc;&#x30c8;</span>
          <strong>{alerts.length}</strong>
        </article>
        <article className="metric-card">
          <RadioTower />
          <span>&#x901a;&#x4fe1;&#x72b6;&#x614b;</span>
          <strong>{statusJa(socketState)}</strong>
        </article>
      </div>
    </section>
  );
}
