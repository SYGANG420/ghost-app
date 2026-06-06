export function yen(value) {
  return `\u00a5${Math.round(Number(value) || 0).toLocaleString()}`;
}

export function statusJa(status) {
  const table = {
    online: '\u63a5\u7d9a',
    offline: '\u5207\u65ad',
    connecting: '\u63a5\u7d9a\u4e2d',
    error: '\u30a8\u30e9\u30fc',
    ready: '\u6e96\u5099\u5b8c\u4e86',
    idle: '\u5f85\u6a5f\u4e2d',
    loading: '\u53d6\u5f97\u4e2d',
    cached: '\u30ad\u30e3\u30c3\u30b7\u30e5',
    mock: '\u4eee\u63a5\u7d9a',
  };
  return table[String(status).toLowerCase()] || String(status);
}
