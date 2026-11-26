export async function api(path, options = {}) {
  const res = await fetch(`/api${path}`, {credentials: 'include', ...options, headers: {'Content-Type': 'application/json', ...options.headers}, ...(options.body ? {body: JSON.stringify(options.body)} : {})});
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error([data.error || 'No se pudo completar la solicitud.', ...(data.details || []).map(d => `${d.field}: ${d.message}`)].join(' '));
    error.status = res.status;
    if (res.status === 401 && !['/auth/login', '/auth/register', '/auth/me', '/auth/password-reset/request', '/auth/password-reset/confirm'].includes(path)) window.dispatchEvent(new Event('session-expired'));
    throw error;
  }
  return data;
}
export const money = n => new Intl.NumberFormat('es-CO', {style: 'currency', currency: 'COP', maximumFractionDigits: 2}).format(n || 0);
export const date = value => new Date(value).toLocaleString('es-CO', {timeZone: 'America/Bogota', dateStyle: 'medium', timeStyle: 'short'});
export const round = value => Math.round((value + Number.EPSILON) * 100) / 100;
export const suggested = p => round(round(Number(p.netPrice) * (1 + (Number(p.vat) + Number(p.tax)) / 100)) * (1 + Number(p.margin) / 100));
export const totals = (lines, discount = 0) => {
  const subtotal = round(lines.reduce((s, l) => s + round(l.salePrice * l.quantity), 0));
  const net = round(lines.reduce((s, l) => s + round(l.salePrice * l.quantity * (1 - l.discount / 100)), 0));
  return {subtotal, total: round(net * (1 - discount / 100))};
};
