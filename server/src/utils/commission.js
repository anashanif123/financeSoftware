// Commission engine — modeled directly from the NFK ledger, which charges
// roughly $1,400 PER CONTAINER (0.5 ctr → $700, 2 ctr → $2,800, 5 ctr → $7,000).
// We also support flat and percentage so the middleman can switch per invoice.

import { round2 } from './money.js';

/**
 * @param {Object} args
 * @param {number} args.baseCost        duties + freight + broker charges
 * @param {'FLAT'|'PERCENTAGE'|'PER_CONTAINER'|'NONE'} args.type
 * @param {number} args.rate            flat amount | percent (0-100) | per-container amount
 * @param {number} [args.containerCount] required for PER_CONTAINER
 * @returns {{ commissionAmount: number, totalAmount: number }}
 */
export function computeCommission({ baseCost = 0, type = 'NONE', rate = 0, containerCount = 1 }) {
  const base = Number(baseCost) || 0;
  const r = Number(rate) || 0;
  let commissionAmount = 0;

  switch (type) {
    case 'FLAT':
      commissionAmount = r;
      break;
    case 'PERCENTAGE':
      commissionAmount = base * (r / 100);
      break;
    case 'PER_CONTAINER':
      commissionAmount = r * (Number(containerCount) || 0);
      break;
    case 'NONE':
    default:
      commissionAmount = 0;
  }

  commissionAmount = round2(commissionAmount);
  return {
    commissionAmount,
    totalAmount: round2(base + commissionAmount),
  };
}
