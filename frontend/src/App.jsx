import { useCallback, useEffect, useRef, useState } from 'react';
import CalculatorDecoy from './components/CalculatorDecoy.jsx';
import DeviceSetup from './components/DeviceSetup.jsx';
import Header from './components/Header.jsx';
import TabBar from './components/TabBar.jsx';
import { getKpiSummary } from './api/kpi.js';
import { sendHeartbeat } from './api/location.js';
import { createSale, deleteSale as deleteSaleApi, listSales, updateSale } from './api/sales.js';
import { createStockItem, deleteStockItem, inventoryAdjust, listStock, listStockHistory, restockItem, updateStockItem } from './api/stock.js';
import { useDeviceAuth } from './hooks/useDeviceAuth.js';
import { useGhostSocket } from './hooks/useGhostSocket.js';
import { useNativeLocationService } from './hooks/useNativeLocationService.js';
import { useNotification } from './hooks/useNotification.js';
import { products as seedProducts, sales as seedSales } from './data/mockData.js';
import { normalizeProduct, normalizeSale, productPayload, salePayload } from './utils/apiMapping.js';
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
const OFFLINE_QUEUE_KEY = 'ghost_control_offline_queue';

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
  const [offlineQueue, setOfflineQueue] = useState(() => loadStored(OFFLINE_QUEUE_KEY, []) || []);
  const [apiStatus, setApiStatus] = useState({ loading: false, error: '', lastSync: '' });
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [kpiSummary, setKpiSummary] = useState(null);
  const authCloseRefreshRef = useRef('');
  const auth = useDeviceAuth();
  const socket = useGhostSocket(auth.deviceId, auth.token);
  const nativeLocation = useNativeLocationService(auth.deviceId, auth.token);
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
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(offlineQueue));
  }, [offlineQueue]);

  useEffect(() => {
    const code = Number(socket.diagnostics.lastCloseCode);
    const key = `${socket.diagnostics.closedAt}-${code}`;
    if (!key || authCloseRefreshRef.current === key) return;
    if ([1006, 1008, 1011].includes(code)) {
      authCloseRefreshRef.current = key;
      auth.refreshToken();
    }
  }, [auth.refreshToken, socket.diagnostics.closedAt, socket.diagnostics.lastCloseCode]);

  useEffect(() => {
    const handleUpdate = () => {
      setUpdateAvailable(true);
      notify('\u65b0\u3057\u3044\u30d0\u30fc\u30b8\u30e7\u30f3\u304c\u914d\u4fe1\u3055\u308c\u307e\u3057\u305f', 'info', 'pwa-update');
    };
    window.addEventListener('ghost-control-sw-update', handleUpdate);
    return () => window.removeEventListener('ghost-control-sw-update', handleUpdate);
  }, [notify]);

  const enqueueOffline = useCallback((type, payload) => {
    setOfflineQueue((current) => [...current, { id: Date.now(), type, payload, createdAt: new Date().toISOString() }]);
    setApiStatus((current) => ({ ...current, error: '\u901a\u4fe1\u5931\u6557: \u30aa\u30d5\u30e9\u30a4\u30f3\u30ad\u30e5\u30fc\u306b\u4fdd\u5b58\u3057\u307e\u3057\u305f' }));
  }, []);

  const refreshApiData = useCallback(async () => {
    if (!auth.token || auth.token.startsWith('dev.')) return;
    setApiStatus((current) => ({ ...current, loading: true, error: '' }));
    try {
      const [stockPayload, salesPayload, historyPayload, kpiPayload] = await Promise.all([
        listStock(),
        listSales(),
        listStockHistory().catch(() => ({ items: [] })),
        getKpiSummary({ month: selectedMonth }).catch(() => null),
      ]);
      const nextProducts = (stockPayload.items || []).map(normalizeProduct);
      const nextSales = (salesPayload.items || []).map((item) => normalizeSale(item, nextProducts));
      setProducts(nextProducts);
      setSalesRecords(nextSales);
      setStockHistory((historyPayload.items || []).map((item) => ({
        id: item.id,
        date: item.created_at,
        type: item.action,
        productName: item.memo || `#${item.stock_item_id || '-'}`,
        quantity: item.quantity,
      })));
      setKpiSummary(kpiPayload);
      setApiStatus({ loading: false, error: '', lastSync: new Date().toISOString() });
    } catch (error) {
      setApiStatus((current) => ({ ...current, loading: false, error: error.message || '\u30c7\u30fc\u30bf\u540c\u671f\u306b\u5931\u6557\u3057\u307e\u3057\u305f' }));
    }
  }, [auth.token, selectedMonth]);

  useEffect(() => {
    if (unlocked && auth.status === 'ready') refreshApiData();
  }, [auth.status, refreshApiData, unlocked]);

  useEffect(() => {
    if (!auth.deviceId || !auth.token || auth.token.startsWith('dev.')) return undefined;
    const heartbeat = () => {
      const payload = { device_id: auth.deviceId, timestamp: new Date().toISOString() };
      socket.sendJson({ type: 'heartbeat', payload });
      sendHeartbeat(payload).catch(() => undefined);
    };
    heartbeat();
    const id = window.setInterval(heartbeat, 30_000);
    return () => window.clearInterval(id);
  }, [auth.deviceId, auth.token, socket.sendJson]);

  const replayOfflineQueue = useCallback(async () => {
    if (!offlineQueue.length || apiStatus.loading) return;
    setApiStatus((current) => ({ ...current, loading: true, error: '' }));
    const remaining = [];
    for (const entry of offlineQueue) {
      try {
        if (entry.type === 'createSale') await createSale(entry.payload);
        if (entry.type === 'updateSale') await updateSale(entry.payload.id, entry.payload.body);
        if (entry.type === 'deleteSale') await deleteSaleApi(entry.payload.id);
        if (entry.type === 'createProduct') await createStockItem(entry.payload);
        if (entry.type === 'updateProduct') await updateStockItem(entry.payload.id, entry.payload.body);
        if (entry.type === 'deleteProduct') await deleteStockItem(entry.payload.id);
        if (entry.type === 'restock') await restockItem(entry.payload);
        if (entry.type === 'inventory') await inventoryAdjust(entry.payload);
      } catch {
        remaining.push(entry);
      }
    }
    setOfflineQueue(remaining);
    setApiStatus({ loading: false, error: remaining.length ? '\u672a\u9001\u4fe1\u30ad\u30e5\u30fc\u304c\u6b8b\u3063\u3066\u3044\u307e\u3059' : '', lastSync: new Date().toISOString() });
    if (remaining.length === 0) refreshApiData();
  }, [apiStatus.loading, offlineQueue, refreshApiData]);

  useEffect(() => {
    if (socket.state === 'online' && offlineQueue.length) replayOfflineQueue();
  }, [offlineQueue.length, replayOfflineQueue, socket.state]);

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

  const saveSaleRecord = useCallback(async (sale, isEdit, previousSale) => {
    setApiStatus((current) => ({ ...current, loading: true, error: '' }));
    setSalesRecords((current) => (isEdit ? current.map((item) => (item.id === sale.id ? sale : item)) : [sale, ...current]));
    setProducts((current) =>
      current.map((item) => {
        let nextQuantity = item.quantity;
        if (previousSale && String(item.id) === String(previousSale.productId)) nextQuantity += previousSale.quantity;
        if (String(item.id) === String(sale.productId)) nextQuantity -= sale.quantity;
        return { ...item, quantity: nextQuantity };
      })
    );
    try {
      if (isEdit) await updateSale(sale.id, salePayload(sale));
      else await createSale(salePayload(sale));
      setApiStatus({ loading: false, error: '', lastSync: new Date().toISOString() });
      refreshApiData();
    } catch (error) {
      enqueueOffline(isEdit ? 'updateSale' : 'createSale', isEdit ? { id: sale.id, body: salePayload(sale) } : salePayload(sale));
      setApiStatus((current) => ({ ...current, loading: false, error: error.message || '\u58f2\u4e0a\u4fdd\u5b58\u306b\u5931\u6557' }));
    }
  }, [enqueueOffline, refreshApiData]);

  const removeSaleRecord = useCallback(async (sale) => {
    const ok = window.confirm('\u3053\u306e\u58f2\u4e0a\u5c65\u6b74\u3092\u524a\u9664\u3057\u307e\u3059\u304b\uff1f');
    if (!ok) return;
    setSalesRecords((current) => current.filter((item) => item.id !== sale.id));
    setProducts((current) => current.map((item) => (String(item.id) === String(sale.productId) ? { ...item, quantity: item.quantity + sale.quantity } : item)));
    try {
      await deleteSaleApi(sale.id);
      refreshApiData();
    } catch (error) {
      enqueueOffline('deleteSale', { id: sale.id });
      setApiStatus((current) => ({ ...current, error: error.message || '\u58f2\u4e0a\u524a\u9664\u306b\u5931\u6557' }));
    }
  }, [enqueueOffline, refreshApiData]);

  const saveProduct = useCallback(async (product, isEdit) => {
    setProducts((current) => (isEdit ? current.map((item) => (item.id === product.id ? product : item)) : [product, ...current]));
    try {
      if (isEdit) await updateStockItem(product.id, productPayload(product));
      else await createStockItem(productPayload(product));
      refreshApiData();
    } catch (error) {
      enqueueOffline(isEdit ? 'updateProduct' : 'createProduct', isEdit ? { id: product.id, body: productPayload(product) } : productPayload(product));
      setApiStatus((current) => ({ ...current, error: error.message || '\u5546\u54c1\u4fdd\u5b58\u306b\u5931\u6557' }));
    }
  }, [enqueueOffline, refreshApiData]);

  const removeProduct = useCallback(async (product) => {
    const ok = window.confirm(`${product.name}\u3092\u524a\u9664\u3057\u307e\u3059\u304b\uff1f`);
    if (!ok) return;
    setProducts((current) => current.filter((item) => item.id !== product.id));
    try {
      await deleteStockItem(product.id);
      refreshApiData();
    } catch (error) {
      enqueueOffline('deleteProduct', { id: product.id });
      setApiStatus((current) => ({ ...current, error: error.message || '\u5546\u54c1\u524a\u9664\u306b\u5931\u6557' }));
    }
  }, [enqueueOffline, refreshApiData]);

  const restockProduct = useCallback(async (product, quantity) => {
    setProducts((current) => current.map((item) => (item.id === product.id ? { ...item, quantity: item.quantity + quantity } : item)));
    try {
      await restockItem({ stock_item_id: product.id, quantity, memo: 'restock' });
      refreshApiData();
    } catch (error) {
      enqueueOffline('restock', { stock_item_id: product.id, quantity, memo: 'restock' });
      setApiStatus((current) => ({ ...current, error: error.message || '\u88dc\u5145\u306b\u5931\u6557' }));
    }
  }, [enqueueOffline, refreshApiData]);

  const inventoryProduct = useCallback(async (product, quantity) => {
    setProducts((current) => current.map((item) => (item.id === product.id ? { ...item, quantity } : item)));
    try {
      await inventoryAdjust({ stock_item_id: product.id, quantity, memo: 'inventory' });
      refreshApiData();
    } catch (error) {
      enqueueOffline('inventory', { stock_item_id: product.id, quantity, memo: 'inventory' });
      setApiStatus((current) => ({ ...current, error: error.message || '\u68da\u5378\u306b\u5931\u6557' }));
    }
  }, [enqueueOffline, refreshApiData]);

  if (!unlocked) {
    return <CalculatorDecoy onUnlock={() => setUnlocked(true)} />;
  }

  if (!auth.hasDevice) {
    return <DeviceSetup auth={auth} />;
  }

  const pages = {
    HOME: <HomePage apiStatus={apiStatus} offlineQueueCount={offlineQueue.length} socketState={socket.state} deviceId={auth.deviceId} salesRecords={salesRecords} products={products} />,
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
        onDeleteSale={removeSaleRecord}
        onSaveSale={saveSaleRecord}
        salesRecords={salesRecords}
        selectedMonth={selectedMonth}
        setSelectedMonth={setSelectedMonth}
        saving={apiStatus.loading}
      />
    ),
    STOCK: (
      <StockPage
        onDeleteProduct={removeProduct}
        onInventoryProduct={inventoryProduct}
        onRestockProduct={restockProduct}
        onSaveProduct={saveProduct}
        products={products}
        stockHistory={stockHistory}
      />
    ),
    KPI: <KpiPage kpiSummary={kpiSummary} salesRecords={salesRecords} selectedMonth={selectedMonth} setSelectedMonth={setSelectedMonth} />,
    CTRL: (
      <CtrlPage
        authError={auth.error}
        authStatus={auth.status}
        deviceId={auth.deviceId}
        onLock={() => setUnlocked(false)}
        onExportData={exportLocalData}
        onReconnectSocket={socket.reconnect}
        onResetDevice={auth.resetDevice}
        onRefreshToken={auth.refreshToken}
        onResetLocalData={resetLocalData}
        nativeLocation={nativeLocation}
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
        {(apiStatus.loading || apiStatus.error || offlineQueue.length > 0) && (
          <div className={apiStatus.error ? 'alert-strip danger-inline' : 'alert-strip'}>
            <span className={apiStatus.error ? 'signal-dot red' : 'signal-dot'} />
            <strong>{apiStatus.loading ? '\u540c\u671f\u4e2d' : apiStatus.error || '\u540c\u671f\u6e08\u307f'}</strong>
            <span>{offlineQueue.length ? `\u672a\u9001\u4fe1 ${offlineQueue.length}\u4ef6` : apiStatus.lastSync ? `\u6700\u7d42 ${new Date(apiStatus.lastSync).toLocaleTimeString('ja-JP')}` : ''}</span>
          </div>
        )}
        {updateAvailable && (
          <div className="alert-strip">
            <span className="signal-dot" />
            <strong>PWA&#x66f4;&#x65b0;&#x3042;&#x308a;</strong>
            <button type="button" onClick={() => window.location.reload()}>&#x4eca;&#x3059;&#x3050;&#x66f4;&#x65b0;</button>
          </div>
        )}
        <main className="content">{pages[activeTab]}</main>
      </div>
    </div>
  );
}
