import { useMemo, useState } from 'react';

const keys = [
  { label: 'AC', value: 'C', type: 'func' },
  { label: '+/-', value: 'SIGN', type: 'func' },
  { label: '%', value: '%', type: 'func' },
  { label: '/', value: '/', type: 'op' },
  { label: '7', value: '7', type: 'num' },
  { label: '8', value: '8', type: 'num' },
  { label: '9', value: '9', type: 'num' },
  { label: 'x', value: '*', type: 'op' },
  { label: '4', value: '4', type: 'num' },
  { label: '5', value: '5', type: 'num' },
  { label: '6', value: '6', type: 'num' },
  { label: '-', value: '-', type: 'op' },
  { label: '1', value: '1', type: 'num' },
  { label: '2', value: '2', type: 'num' },
  { label: '3', value: '3', type: 'num' },
  { label: '+', value: '+', type: 'op' },
  { label: '0', value: '0', type: 'zero' },
  { label: '.', value: '.', type: 'num' },
  { label: '=', value: '=', type: 'op' },
];

function calculate(expression) {
  if (!expression) return '0';
  if (!/^[\d+\-*/%. ]+$/.test(expression)) return 'Error';
  try {
    const result = Function(`"use strict"; return (${expression})`)();
    return Number.isFinite(result) ? String(Number(result.toFixed(8))) : 'Error';
  } catch {
    return 'Error';
  }
}

export default function CalculatorDecoy({ onUnlock }) {
  const [display, setDisplay] = useState('0');
  const [trail, setTrail] = useState('');
  const [unlockInput, setUnlockInput] = useState('');
  const [launching, setLaunching] = useState(false);
  const expression = useMemo(() => (display === '0' ? '' : display), [display]);

  const press = (key) => {
    if (key === 'C') {
      setDisplay('0');
      setTrail('');
      setUnlockInput('');
      return;
    }
    if (key === 'SIGN') {
      setDisplay((current) => (current === '0' ? current : current.startsWith('-') ? current.slice(1) : `-${current}`));
      return;
    }
    if (key === '%') {
      setDisplay((current) => String(Number(current) / 100));
      return;
    }
    if (key === '=') {
      if (unlockInput === '1984') {
        setLaunching(true);
        setDisplay('0');
        setTrail('');
        setUnlockInput('');
        window.setTimeout(onUnlock, 900);
        return;
      }
      setTrail(expression);
      setDisplay(calculate(expression));
      return;
    }
    if (/^\d$/.test(key)) {
      setUnlockInput((current) => `${current}${key}`.slice(-4));
    } else if (key !== '.') {
      setUnlockInput('');
    }
    setDisplay((current) => (current === '0' || current === 'Error' ? key : `${current}${key}`));
  };

  if (launching) {
    return (
      <main className="calculator-shell">
        <section className="ghost-launch">
          <div className="brand-mark large">GC</div>
          <strong>GHOST CONTROL</strong>
        </section>
      </main>
    );
  }

  return (
    <main className="calculator-shell">
      <section className="calculator">
        <div className="calc-display">
          <span>{trail}</span>
          <strong>{display}</strong>
        </div>
        <div className="calc-grid">
          {keys.map((key) => (
            <button
              className={`calc-key ${key.type === 'op' ? 'calc-key-op' : ''} ${key.type === 'func' ? 'calc-key-func' : ''} ${key.type === 'zero' ? 'calc-key-zero' : ''}`}
              key={key.label}
              type="button"
              onClick={() => press(key.value)}
            >
              {key.label}
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}
