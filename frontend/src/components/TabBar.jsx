import { BarChart3, Boxes, Calculator, Gauge, Map, SlidersHorizontal } from 'lucide-react';

const icons = {
  HOME: Gauge,
  MAP: Map,
  SALES: Calculator,
  STOCK: Boxes,
  KPI: BarChart3,
  CTRL: SlidersHorizontal,
};

const labels = {
  HOME: 'ホーム',
  MAP: '地図',
  SALES: '売上',
  STOCK: '在庫',
  KPI: '実績',
  CTRL: '制御',
};

export default function TabBar({ tabs, activeTab, onChange }) {
  return (
    <nav className="tabbar">
      {tabs.map((tab) => {
        const Icon = icons[tab];
        return (
          <button className={tab === activeTab ? 'active' : ''} key={tab} type="button" onClick={() => onChange(tab)}>
            <Icon size={18} />
            <span>{labels[tab]}</span>
          </button>
        );
      })}
    </nav>
  );
}
