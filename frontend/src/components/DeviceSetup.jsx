import { statusJa } from '../utils/format.js';

export default function DeviceSetup({ auth }) {
  return (
    <main className="setup-screen">
      <section className="setup-panel cyber-card">
        <p className="eyebrow">&#x7aef;&#x672b;&#x521d;&#x671f;&#x8a2d;&#x5b9a;</p>
        <h1>GHOST CONTROL</h1>
        <p className="muted">&#x7aef;&#x672b;&#x3092;&#x9078;&#x629e;&#x3057;&#x3066;&#x8a8d;&#x8a3c;&#x30c8;&#x30fc;&#x30af;&#x30f3;&#x3092;&#x53d6;&#x5f97;&#x3057;&#x307e;&#x3059;</p>
        <div className="device-options">
          <button type="button" onClick={() => auth.selectDevice('device_a')}>&#x7aef;&#x672b;A</button>
          <button type="button" onClick={() => auth.selectDevice('device_b')}>&#x7aef;&#x672b;B</button>
        </div>
        <p className="setup-note">
          &#x72b6;&#x614b;: {statusJa(auth.status)}
          {auth.error ? ' / \u4eee\u30c8\u30fc\u30af\u30f3\u4f7f\u7528\u4e2d' : ''}
        </p>
      </section>
    </main>
  );
}
