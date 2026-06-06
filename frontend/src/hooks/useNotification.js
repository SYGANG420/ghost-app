import { createElement, useCallback, useEffect, useMemo, useRef, useState } from 'react';

function getPermission() {
  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission;
}

export function useNotification({ stockItems = [], monthlyProfit = 0, monthlyTarget = 0, socketState, deviceId }) {
  const [messages, setMessages] = useState([]);
  const [readMessages, setReadMessages] = useState([]);
  const firedRef = useRef(new Set());
  const messagesRef = useRef([]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const dismiss = useCallback((id) => {
    const target = messagesRef.current.find((message) => message.id === id);
    setMessages((current) => current.filter((message) => message.id !== id));
    if (target) setReadMessages((read) => [{ ...target, readAt: new Date().toISOString() }, ...read].slice(0, 12));
  }, []);

  const clearRead = useCallback(() => setReadMessages([]), []);

  const notify = useCallback(
    async (text, level = 'info', key = text) => {
      if (firedRef.current.has(key)) return;
      firedRef.current.add(key);
      const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      setMessages((current) => [{ id, text, level }, ...current].slice(0, 4));

      if (getPermission() === 'default') await Notification.requestPermission();
      if (getPermission() === 'granted') new Notification('GHOST CONTROL', { body: text });
      window.setTimeout(() => dismiss(id), 6500);
    },
    [dismiss]
  );

  useEffect(() => {
    stockItems
      .filter((item) => item.quantity <= item.threshold)
      .forEach((item) => notify(`\u26a0\ufe0f ${item.name}\u306e\u5728\u5eab\u304c\u5c11\u306a\u304f\u306a\u3063\u3066\u3044\u307e\u3059`, 'warning', `stock-${item.id}-${item.quantity}`));
  }, [notify, stockItems]);

  useEffect(() => {
    if (monthlyTarget > 0 && monthlyProfit >= monthlyTarget) {
      notify('\ud83c\udf89 \u4eca\u6708\u306e\u76ee\u6a19\u9054\u6210\uff01', 'success', `target-${monthlyTarget}`);
    }
  }, [monthlyProfit, monthlyTarget, notify]);

  useEffect(() => {
    if (deviceId && socketState === 'offline') {
      notify(`\ud83d\udcf5 \u7aef\u672b${deviceId}\u304c\u5207\u65ad\u3055\u308c\u307e\u3057\u305f`, 'warning', `offline-${deviceId}`);
    }
  }, [deviceId, notify, socketState]);

  const NotificationCenter = useMemo(
    () =>
      function NotificationCenterComponent() {
        if (messages.length === 0 && readMessages.length === 0) return null;
        return createElement(
          'div',
          { className: 'notification-stack' },
          [
            ...messages.map((message) =>
              createElement(
                'button',
                { className: `notification-toast ${message.level}`, key: message.id, type: 'button', onClick: () => dismiss(message.id) },
                message.text
              )
            ),
            readMessages.length > 0
              ? createElement(
                  'button',
                  { className: 'notification-toast read', key: 'read-log', type: 'button', onClick: clearRead },
                  `\u65e2\u8aad\u901a\u77e5 ${readMessages.length}\u4ef6 / \u30bf\u30c3\u30d7\u3067\u5c65\u6b74\u6d88\u53bb`
                )
              : null,
          ].filter(Boolean)
        );
      },
    [clearRead, dismiss, messages, readMessages]
  );

  return { notify, messages, readMessages, dismiss, clearRead, NotificationCenter };
}
