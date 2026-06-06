export default function DeviceSetup({ auth }) {
  return (
    <main className="setup-screen">
      <section className="setup-panel cyber-card">
        <p className="eyebrow">INITIALIZE DEVICE</p>
        <h1>GHOST CONTROL</h1>
        <p className="muted">Select device identity and request a JWT token.</p>
        <div className="device-options">
          <button type="button" onClick={() => auth.selectDevice('device_a')}>DEVICE_A</button>
          <button type="button" onClick={() => auth.selectDevice('device_b')}>DEVICE_B</button>
        </div>
        <p className="setup-note">
          STATUS: {auth.status.toUpperCase()}
          {auth.error ? ` / MOCK TOKEN ACTIVE` : ''}
        </p>
      </section>
    </main>
  );
}
