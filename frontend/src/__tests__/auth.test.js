import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useDeviceAuth } from '../hooks/useDeviceAuth.js';

vi.mock('../api/auth.js', () => ({
  requestDeviceToken: vi.fn((deviceId) => Promise.resolve({
    token: `jwt-${deviceId}`,
    access_token: `jwt-${deviceId}`,
  })),
}));

describe('useDeviceAuth', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('device_a/bの選択が保存される', async () => {
    const { result } = renderHook(() => useDeviceAuth());
    await act(async () => {
      await result.current.selectDevice('device_a');
    });
    expect(localStorage.getItem('ghost_control_device_id')).toBe('device_a');
    await act(async () => {
      await result.current.selectDevice('device_b');
    });
    expect(localStorage.getItem('ghost_control_device_id')).toBe('device_b');
  });

  it('JWTが正しく保存される', async () => {
    const { result } = renderHook(() => useDeviceAuth());
    await act(async () => {
      await result.current.selectDevice('device_a');
    });
    await waitFor(() => expect(localStorage.getItem('ghost_control_jwt')).toBe('jwt-device_a'));
  });
});
