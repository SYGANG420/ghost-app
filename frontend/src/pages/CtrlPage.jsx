import { FileDown, Lock, Power, ShieldAlert, TimerReset } from 'lucide-react';
import { investments, monthlyReport } from '../data/mockData.js';

export default function CtrlPage({ onLock, socketState }) {
  const totalInvestment = investments.reduce((sum, item) => sum + item.amount, 0);
  const totalA = investments.filter((item) => item.investor === 'A').reduce((sum, item) => sum + item.amount, 0);
  const ratioA = totalInvestment > 0 ? Math.round((totalA / totalInvestment) * 100) : 50;
  const ratioB = 100 - ratioA;

  const savePdf = async () => {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF();

    doc.setFont('helvetica', 'bold');
    doc.text('GHOST CONTROL Monthly Report', 14, 18);
    doc.setFont('helvetica', 'normal');
    doc.text(`Sales: JPY ${monthlyReport.lastMonthSales.toLocaleString()}`, 14, 34);
    doc.text(`Gross Profit: JPY ${monthlyReport.lastMonthGross.toLocaleString()}`, 14, 44);
    doc.text(`Take Home A: JPY ${monthlyReport.takeHomeA.toLocaleString()}`, 14, 54);
    doc.text(`Take Home B: JPY ${monthlyReport.takeHomeB.toLocaleString()}`, 14, 64);
    doc.text(`Investment Ratio: A ${ratioA}% / B ${ratioB}%`, 14, 74);
    doc.text(`Snapshot: ${monthlyReport.snapshotDate}`, 14, 84);
    doc.save('ghost-control-monthly-report.pdf');
  };

  return (
    <section className="page-stack">
      <div className="ctrl-grid">
        <button className="control-tile danger" type="button">
          <ShieldAlert size={24} />
          <span>REMOTE WIPE</span>
          <strong>ARMED</strong>
        </button>
        <button className="control-tile warning" type="button">
          <TimerReset size={24} />
          <span>DEAD MAN SWITCH</span>
          <strong>72H</strong>
        </button>
        <button className="control-tile" type="button">
          <Power size={24} />
          <span>VPN STATE</span>
          <strong>{socketState === 'online' ? 'LINKED' : 'UNKNOWN'}</strong>
        </button>
        <button className="control-tile lock" type="button" onClick={onLock}>
          <Lock size={24} />
          <span>LOCK TO CALC</span>
          <strong>LOCK NOW</strong>
        </button>
      </div>
      <div className="wide-panel monthly-report cyber-card">
        <div className="panel-title-row">
          <h2>MONTHLY REPORT</h2>
          <button type="button" onClick={savePdf}><FileDown size={16} /> PDF SAVE</button>
        </div>
        <div className="report-grid">
          <div><span>LAST MONTH SALES</span><strong>JPY {monthlyReport.lastMonthSales.toLocaleString()}</strong></div>
          <div><span>GROSS PROFIT</span><strong>JPY {monthlyReport.lastMonthGross.toLocaleString()}</strong></div>
          <div><span>A TAKE HOME</span><strong>JPY {monthlyReport.takeHomeA.toLocaleString()}</strong></div>
          <div><span>B TAKE HOME</span><strong>JPY {monthlyReport.takeHomeB.toLocaleString()}</strong></div>
          <div><span>INVESTMENT SNAPSHOT</span><strong>A {ratioA}% / B {ratioB}%</strong></div>
          <div><span>SNAPSHOT DATE</span><strong>{monthlyReport.snapshotDate}</strong></div>
        </div>
      </div>
    </section>
  );
}
