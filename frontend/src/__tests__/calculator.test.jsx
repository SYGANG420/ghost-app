import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import CalculatorDecoy from '../components/CalculatorDecoy.jsx';

function press(label) {
  fireEvent.click(screen.getByRole('button', { name: label }));
}

describe('CalculatorDecoy', () => {
  it('数字ボタンが正しく動く', () => {
    render(<CalculatorDecoy onUnlock={vi.fn()} />);
    press('1');
    press('2');
    press('3');
    expect(screen.getByText('123')).toBeInTheDocument();
  });

  it('四則演算が正しい', () => {
    render(<CalculatorDecoy onUnlock={vi.fn()} />);
    press('1');
    press('+');
    press('2');
    press('=');
    expect(within(document.querySelector('.calc-display')).getByText('3')).toBeInTheDocument();
  });

  it('1984=でGHOST CONTROLが起動する', () => {
    vi.useFakeTimers();
    const onUnlock = vi.fn();
    render(<CalculatorDecoy onUnlock={onUnlock} />);
    ['1', '9', '8', '4', '='].forEach(press);
    expect(screen.getByText('GHOST CONTROL')).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(900));
    expect(onUnlock).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it('他の数字では起動しない', () => {
    const onUnlock = vi.fn();
    render(<CalculatorDecoy onUnlock={onUnlock} />);
    ['1', '2', '3', '4', '='].forEach(press);
    expect(onUnlock).not.toHaveBeenCalled();
  });
});
