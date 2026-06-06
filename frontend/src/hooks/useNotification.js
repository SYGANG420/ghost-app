import { createElement, useCallback, useEffect, useMemo, useRef, useState } from 'react';

function getPermission() {
  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission;
}

export function useNotification({ stockItems = [], monthlyProfit = 0, monthlyTarget = 0, socketState, deviceId, vpnConnected }) {
  const [messages, setMessages] = useState([]);
  const firedRef = useRef(new Set());

  const dismiss = useCallback((id) => {
    setMessages((current) => current.filter((message) => message.id !== id));
  }, []);

  const notify = useCallback(
    async (text, level = 'info', key = text) => {
      if (firedRef.current.has(key)) return;
      firedRef.current.add(key);

      const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      setMessages((current) => [{ id, text, level }, ...current].slice(0, 4));

      if (getPermission() === 'default') {
        await Notification.requestPermission();
      }

      if (getPermission() === 'granted') {
        new Notification('GHOST CONTROL', { body: text });
      }

      window.setTimeout(() => dismiss(id), 6500);
    },
    [dismiss]
  );

  useEffect(() => {
    stockItems
      .filter((item) => item.quantity <= item.threshold)
      .forEach((item) => notify(`⚠️ ${item.name}の在庫が少なくなっています`, 'warning', `stock-${item.id}-${item.quantity}`));
  }, [notify, stockItems]);

  useEffect(() => {
    if (monthlyTarget > 0 && monthlyProfit >= monthlyTarget) {
      notify('🎉 今月の目標達成！', 'success', `target-${monthlyTarget}`);
    }
  }, [monthlyProfit, monthlyTarget, notify]);

  useEffect(() => {
    if (deviceId && socketState === 'offline') {
      notify(`📵 端末${deviceId}が切断されました`, 'warning', `offline-${deviceId}`);
    }
  }, [deviceId, notify, socketState]);

  useEffect(() => {
    if (vpnConnected === false) {
      notify('🔴 VPN未接続の可能性があります', 'danger', 'vpn-disconnected');
    }
  }, [notify, vpnConnected]);

  const NotificationCenter = useMemo(
    () =>
      function NotificationCenterComponent() {
        if (messages.length === 0) return null;

        return createElement(
          'div',
          { className: 'notification-stack' },
          messages.map((message) =>
            createElement(
              'button',
              {
                className: `notification-toast ${message.level}`,
                key: message.id,
                type: 'button',
                onClick: () => dismiss(message.id),
              },
              message.text
            )
          )
        );
      },
    [dismiss, messages]
  );

  return { notify, messages, dismiss, NotificationCenter };
}
