export default function DeviceSetup({ auth }) {
  const statusLabels = {
    idle: '待機中',
    loading: '取得中',
    ready: '準備完了',
    mock: '仮接続',
  };

  return (
    <main className="setup-screen">
      <section className="setup-panel cyber-card">
        <p className="eyebrow">端末初期設定</p>
        <h1>ゴーストコントロール</h1>
        <p className="muted">端末を選択して認証トークンを取得します。</p>
        <div className="device-options">
          <button type="button" onClick={() => auth.selectDevice('device_a')}>端末A</button>
          <button type="button" onClick={() => auth.selectDevice('device_b')}>端末B</button>
        </div>
        <p className="setup-note">
          状態: {statusLabels[auth.status] || auth.status}
          {auth.error ? ' / 仮トークン使用中' : ''}
        </p>
      </section>
    </main>
  );
}
