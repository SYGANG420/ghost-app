import { FileDown, Lock, Power, ShieldAlert, TimerReset } from 'lucide-react';
import { investments, monthlyReport } from '../data/mockData.js';
import { yen } from '../utils/format.js';

export default function CtrlPage({ onLock, socketState }) {
  const totalInvestment = investments.reduce((sum, item) => sum + item.amount, 0);
  const totalA = investments.filter((item) => item.investor === 'A').reduce((sum, item) => sum + item.amount, 0);
  const ratioA = totalInvestment > 0 ? Math.round((totalA / totalInvestment) * 100) : 50;
  const ratioB = 100 - ratioA;

  const savePdf = async () => {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF();

    doc.setFont('helvetica', 'bold');
    doc.text('月次レポート', 14, 18);
    doc.setFont('helvetica', 'normal');
    doc.text(`売上: ${yen(monthlyReport.lastMonthSales)}`, 14, 34);
    doc.text(`粗利: ${yen(monthlyReport.lastMonthGross)}`, 14, 44);
    doc.text(`A手取り: ${yen(monthlyReport.takeHomeA)}`, 14, 54);
    doc.text(`B手取り: ${yen(monthlyReport.takeHomeB)}`, 14, 64);
    doc.text(`出資比率: A ${ratioA}% / B ${ratioB}%`, 14, 74);
    doc.text(`基準日: ${monthlyReport.snapshotDate}`, 14, 84);
    doc.save('ghost-control-monthly-report.pdf');
  };

  return (
    <section className="page-stack">
      <div className="ctrl-grid">
        <button className="control-tile danger" type="button">
          <ShieldAlert size={24} />
          <span>リモート消去</span>
          <strong>待機中</strong>
        </button>
        <button className="control-tile warning" type="button">
          <TimerReset size={24} />
          <span>デッドマン</span>
          <strong>72時間</strong>
        </button>
        <button className="control-tile" type="button">
          <Power size={24} />
          <span>VPN状態</span>
          <strong>{socketState === 'online' ? '接続中' : '不明'}</strong>
        </button>
        <button className="control-tile lock" type="button" onClick={onLock}>
          <Lock size={24} />
          <span>電卓へ戻る</span>
          <strong>即時ロック</strong>
        </button>
      </div>
      <div className="wide-panel monthly-report cyber-card">
        <div className="panel-title-row">
          <h2>月次レポート</h2>
          <button type="button" onClick={savePdf}><FileDown size={16} /> 保存</button>
        </div>
        <div className="report-grid">
          <div><span>先月売上</span><strong>{yen(monthlyReport.lastMonthSales)}</strong></div>
          <div><span>粗利</span><strong>{yen(monthlyReport.lastMonthGross)}</strong></div>
          <div><span>A手取り</span><strong>{yen(monthlyReport.takeHomeA)}</strong></div>
          <div><span>B手取り</span><strong>{yen(monthlyReport.takeHomeB)}</strong></div>
          <div><span>出資比率</span><strong>A {ratioA}% / B {ratioB}%</strong></div>
          <div><span>基準日</span><strong>{monthlyReport.snapshotDate}</strong></div>
        </div>
      </div>
    </section>
  );
}
