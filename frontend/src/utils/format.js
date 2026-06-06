export function yen(value) {
  return `¥${Math.round(Number(value) || 0).toLocaleString()}`;
}

export function statusJa(status) {
  const table = {
    online: '接続中',
    offline: '切断',
    connecting: '接続中',
    error: 'エラー',
    ready: '準備完了',
    idle: '待機中',
    loading: '取得中',
    cached: 'キャッシュ',
    mock: '仮接続',
  };
  return table[String(status).toLowerCase()] || String(status);
}
