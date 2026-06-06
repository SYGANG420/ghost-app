import { useEffect, useState } from 'react';
import CalculatorDecoy from './components/CalculatorDecoy.jsx';
import DeviceSetup from './components/DeviceSetup.jsx';
import Header from './components/Header.jsx';
import TabBar from './components/TabBar.jsx';
import { useDeviceAuth } from './hooks/useDeviceAuth.js';
import { useGhostSocket } from './hooks/useGhostSocket.js';
import { useNotification } from './hooks/useNotification.js';
import { products as seedProducts, sales as seedSales } from './data/mockData.js';
import CtrlPage from './pages/CtrlPage.jsx';
import HomePage from './pages/HomePage.jsx';
import KpiPage from './pages/KpiPage.jsx';
import MapPage from './pages/MapPage.jsx';
import SalesPage from './pages/SalesPage.jsx';
import StockPage from './pages/StockPage.jsx';

const tabs = ['HOME', 'MAP', 'SALES', 'STOCK', 'KPI', 'CTRL'];
const PRODUCTS_KEY = 'ghost_control_products';
const SALES_KEY = 'ghost_control_sales_records';

function loadStored(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export default function App() {
  const [unlocked, setUnlocked] = useState(false);
  const [activeTab, setActiveTab] = useState('HOME');
  const [products, setProducts] = useState(() => loadStored(PRODUCTS_KEY, seedProducts));
  const [salesRecords, setSalesRecords] = useState(() => loadStored(SALES_KEY, seedSales));
  const auth = useDeviceAuth();
  const socket = useGhostSocket(auth.deviceId, auth.token);
  const monthlyProfit = salesRecords.reduce((sum, item) => sum + item.grossProfit, 0);
  const { NotificationCenter } = useNotification({
    stockItems: unlocked ? products : [],
    monthlyProfit,
    monthlyTarget: 180000,
    socketState: socket.state,
    deviceId: auth.deviceId,
  });

  useEffect(() => {
    localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem(SALES_KEY, JSON.stringify(salesRecords));
  }, [salesRecords]);

  if (!unlocked) {
    return <CalculatorDecoy onUnlock={() => setUnlocked(true)} />;
  }

  if (!auth.hasDevice) {
    return <DeviceSetup auth={auth} />;
  }

  const pages = {
    HOME: <HomePage socketState={socket.state} deviceId={auth.deviceId} salesRecords={salesRecords} products={products} />,
    MAP: (
      <MapPage
        socketState={socket.state}
        socketMessage={socket.lastMessage}
        sendSocketMessage={socket.sendJson}
        deviceId={auth.deviceId}
      />
    ),
    SALES: <SalesPage deviceId={auth.deviceId} products={products} setProducts={setProducts} salesRecords={salesRecords} setSalesRecords={setSalesRecords} />,
    STOCK: <StockPage products={products} setProducts={setProducts} />,
    KPI: <KpiPage salesRecords={salesRecords} />,
    CTRL: (
      <CtrlPage
        authError={auth.error}
        authStatus={auth.status}
        deviceId={auth.deviceId}
        onLock={() => setUnlocked(false)}
        socketDiagnostics={socket.diagnostics}
        socketState={socket.state}
      />
    ),
  };

  return (
    <div className="app-stage">
      <div className="app-shell">
        <Header activeTab={activeTab} deviceId={auth.deviceId} socketState={socket.state} />
        <TabBar tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
        <NotificationCenter />
        <main className="content">{pages[activeTab]}</main>
      </div>
    </div>
  );
}
