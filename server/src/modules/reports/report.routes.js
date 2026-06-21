import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok } from '../../utils/response.js';
import { ApiError } from '../../utils/ApiError.js';
import { buildReconciliation, buildLedger, exportCsv, exportXlsx } from './report.service.js';

export const router = Router();

// Broker-billed vs invoiced vs paid, with mismatch flags.
router.get(
  '/reconciliation',
  asyncHandler(async (_req, res) => {
    ok(res, await buildReconciliation());
  }),
);

// The "NFK, NEW ACCOUNT" ledger as structured rows + totals.
router.get(
  '/ledger',
  asyncHandler(async (_req, res) => {
    ok(res, await buildLedger());
  }),
);

// Download a report as CSV or Excel: /reports/:type/export?format=csv|xlsx
router.get(
  '/:type/export',
  asyncHandler(async (req, res) => {
    const { type } = req.params;
    const format = (req.query.format || 'csv').toLowerCase();
    if (!['ledger', 'reconciliation'].includes(type)) throw ApiError.badRequest('Unknown report type');

    const stamp = new Date().toISOString().slice(0, 10);
    if (format === 'xlsx') {
      const buffer = await exportXlsx(type);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${type}-${stamp}.xlsx"`);
      return res.send(Buffer.from(buffer));
    }
    if (format === 'csv') {
      const csv = await exportCsv(type);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${type}-${stamp}.csv"`);
      return res.send(csv);
    }
    throw ApiError.badRequest('Unsupported format (use csv or xlsx)');
  }),
);
