import { useCallback, useEffect, useState } from 'react';
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
const STOCK_HISTORY_KEY = 'ghost_control_stock_history';

function thisMonth() {
  return new Date().toISOString().slice(0, 7);
}

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
  const [selectedMonth, setSelectedMonth] = useState(thisMonth());
  const [products, setProducts] = useState(() => loadStored(PRODUCTS_KEY, seedProducts));
  const [salesRecords, setSalesRecords] = useState(() => loadStored(SALES_KEY, seedSales));
  const [stockHistory, setStockHistory] = useState(() => loadStored(STOCK_HISTORY_KEY, []) || []);
  const auth = useDeviceAuth();
  const socket = useGhostSocket(auth.deviceId, auth.token);
  const monthlyProfit = salesRecords.reduce((sum, item) => sum + item.grossProfit, 0);
  const { notify, NotificationCenter } = useNotification({
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

  useEffect(() => {
    localStorage.setItem(STOCK_HISTORY_KEY, JSON.stringify(stockHistory));
  }, [stockHistory]);

  useEffect(() => {
    const handleUpdate = () => notify('\u65b0\u3057\u3044\u30d0\u30fc\u30b8\u30e7\u30f3\u304c\u914d\u4fe1\u3055\u308c\u307e\u3057\u305f\u3002\u518d\u8d77\u52d5\u3059\u308b\u3068\u53cd\u6620\u3055\u308c\u307e\u3059', 'info', 'pwa-update');
    window.addEventListener('ghost-control-sw-update', handleUpdate);
    return () => window.removeEventListener('ghost-control-sw-update', handleUpdate);
  }, [notify]);

  const exportLocalData = useCallback(() => {
    const payload = {
      exportedAt: new Date().toISOString(),
      deviceId: auth.deviceId,
      products,
      salesRecords,
      stockHistory,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `ghost-control-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }, [auth.deviceId, products, salesRecords, stockHistory]);

  const resetLocalData = useCallback(() => {
    const ok = window.confirm('\u5546\u54c1\u30fb\u58f2\u4e0a\u30fb\u5728\u5eab\u5c65\u6b74\u3092\u7aef\u672b\u5185\u3067\u521d\u671f\u5316\u3057\u307e\u3059\u3002\u3088\u308d\u3057\u3044\u3067\u3059\u304b\uff1f');
    if (!ok) return;
    localStorage.removeItem(PRODUCTS_KEY);
    localStorage.removeItem(SALES_KEY);
    localStorage.removeItem(STOCK_HISTORY_KEY);
    setProducts(seedProducts);
    setSalesRecords(seedSales);
    setStockHistory([]);
    notify('\u30ed\u30fc\u30ab\u30eb\u30c7\u30fc\u30bf\u3092\u521d\u671f\u5316\u3057\u307e\u3057\u305f', 'warning', `reset-${Date.now()}`);
  }, [notify]);

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
    SALES: (
      <SalesPage
        deviceId={auth.deviceId}
        products={products}
        salesRecords={salesRecords}
        selectedMonth={selectedMonth}
        setProducts={setProducts}
        setSalesRecords={setSalesRecords}
        setSelectedMonth={setSelectedMonth}
      />
    ),
    STOCK: <StockPage products={products} setProducts={setProducts} setStockHistory={setStockHistory} stockHistory={stockHistory} />,
    KPI: <KpiPage salesRecords={salesRecords} selectedMonth={selectedMonth} setSelectedMonth={setSelectedMonth} />,
    CTRL: (
      <CtrlPage
        authError={auth.error}
        authStatus={auth.status}
        deviceId={auth.deviceId}
        onLock={() => setUnlocked(false)}
        onExportData={exportLocalData}
        onReconnectSocket={socket.reconnect}
        onRefreshToken={auth.refreshToken}
        onResetLocalData={resetLocalData}
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
