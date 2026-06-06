import { useState } from 'react';
import CalculatorDecoy from './components/CalculatorDecoy.jsx';
import DeviceSetup from './components/DeviceSetup.jsx';
import Header from './components/Header.jsx';
import TabBar from './components/TabBar.jsx';
import { useDeviceAuth } from './hooks/useDeviceAuth.js';
import { useGhostSocket } from './hooks/useGhostSocket.js';
import CtrlPage from './pages/CtrlPage.jsx';
import HomePage from './pages/HomePage.jsx';
import KpiPage from './pages/KpiPage.jsx';
import MapPage from './pages/MapPage.jsx';
import SalesPage from './pages/SalesPage.jsx';
import StockPage from './pages/StockPage.jsx';

const tabs = ['HOME', 'MAP', 'SALES', 'STOCK', 'KPI', 'CTRL'];

export default function App() {
  const [unlocked, setUnlocked] = useState(false);
  const [activeTab, setActiveTab] = useState('HOME');
  const auth = useDeviceAuth();
  const socket = useGhostSocket(auth.deviceId, auth.token);

  if (!unlocked) {
    return <CalculatorDecoy onUnlock={() => setUnlocked(true)} />;
  }

  if (!auth.hasDevice) {
    return <DeviceSetup auth={auth} />;
  }

  const pages = {
    HOME: <HomePage socketState={socket.state} />,
    MAP: <MapPage socketState={socket.state} />,
    SALES: <SalesPage />,
    STOCK: <StockPage />,
    KPI: <KpiPage />,
    CTRL: <CtrlPage socketState={socket.state} onLock={() => setUnlocked(false)} />,
  };

  return (
    <div className="app-shell">
      <Header activeTab={activeTab} deviceId={auth.deviceId} socketState={socket.state} />
      <main className="content">{pages[activeTab]}</main>
      <TabBar tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
    </div>
  );
}
