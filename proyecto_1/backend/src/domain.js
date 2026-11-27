export const round = value => {
  if (!Number.isFinite(value) || Math.abs(value) > 1000000000000) throw new ApiError(400, 'El importe supera el límite de un billón de pesos por operación.');
  return Math.round((value + Number.EPSILON) * 100) / 100;
};
export const cost = (netPrice, vat, tax) => round(netPrice * (1 + (vat + tax) / 100));
export const suggested = (netPrice, vat, tax, margin) => round(cost(netPrice, vat, tax) * (1 + margin / 100));
export function saleTotals(lines, discount) {
  const subtotal = round(lines.reduce((sum, l) => sum + round(l.unitPrice * l.quantity), 0));
  const afterLines = round(lines.reduce((sum, l) => sum + round(l.unitPrice * l.quantity * (1 - l.discount / 100)), 0));
  return {subtotal, total: round(afterLines * (1 - discount / 100))};
}
export class ApiError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
