import { useMemo, useState } from 'react';

const keys = ['C', 'DEL', '%', '/', '7', '8', '9', '*', '4', '5', '6', '-', '1', '2', '3', '+', '0', '.', '='];

function calculate(expression) {
  if (!/^[\d+\-*/%. ]+$/.test(expression)) return 'Error';
  const result = Function(`"use strict"; return (${expression})`)();
  return Number.isFinite(result) ? String(Number(result.toFixed(8))) : 'Error';
}

export default function CalculatorDecoy({ onUnlock }) {
  const [display, setDisplay] = useState('0');
  const [trail, setTrail] = useState('');

  const expression = useMemo(() => (display === '0' ? '' : display), [display]);

  const press = (key) => {
    if (key === 'C') {
      setDisplay('0');
      setTrail('');
      return;
    }

    if (key === 'DEL') {
      setDisplay((current) => (current.length > 1 ? current.slice(0, -1) : '0'));
      return;
    }

    if (key === '=') {
      if (expression === '1984') {
        setDisplay('0');
        setTrail('');
        onUnlock();
        return;
      }

      setTrail(expression);
      setDisplay(calculate(expression));
      return;
    }

    setDisplay((current) => (current === '0' || current === 'Error' ? key : `${current}${key}`));
  };

  return (
    <main className="calculator-shell">
      <section className="calculator">
        <div className="calc-status">Calculator</div>
        <div className="calc-display">
          <span>{trail}</span>
          <strong>{display}</strong>
        </div>
        <div className="calc-grid">
          {keys.map((key) => (
            <button
              className={key === '=' ? 'calc-key calc-key-equals' : 'calc-key'}
              key={key}
              type="button"
              onClick={() => press(key)}
            >
              {key}
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}
