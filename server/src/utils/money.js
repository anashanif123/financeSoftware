// Money helpers. Prisma returns Decimal objects; normalise to numbers for math
// and rounding, but persist back as strings/Decimal to avoid float drift.

export function round2(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

export function toNumber(decimal) {
  if (decimal == null) return 0;
  // Prisma.Decimal has toNumber(); plain numbers/strings are coerced.
  return typeof decimal === 'object' && typeof decimal.toNumber === 'function'
    ? decimal.toNumber()
    : Number(decimal);
}

export function formatCurrency(amount, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(
    toNumber(amount),
  );
}
