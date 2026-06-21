import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { router as authRouter } from './auth/auth.routes.js';
import { router as customerRouter } from './customers/customer.routes.js';
import { router as projectRouter } from './projects/project.routes.js';
import { router as shipmentRouter } from './shipments/shipment.routes.js';
import { router as invoiceRouter } from './invoices/invoice.routes.js';
import { router as documentRouter } from './documents/document.routes.js';
import { router as emailRouter } from './emails/email.routes.js';
import { router as paymentRouter } from './payments/payment.routes.js';
import { router as disputeRouter } from './disputes/dispute.routes.js';
import { router as activityRouter } from './activities/activity.routes.js';
import { router as dashboardRouter } from './dashboard/dashboard.routes.js';
import { router as settingsRouter } from './settings/settings.routes.js';
import { router as reportRouter } from './reports/report.routes.js';
import { router as gmailRouter } from './gmail/gmail.routes.js';

export const router = Router();

// Public
router.use('/auth', authRouter);
// Gmail OAuth callback is partially public (handled inside its router)
router.use('/gmail', gmailRouter);

// Everything below requires a valid access token
router.use(authenticate);
router.use('/dashboard', dashboardRouter);
router.use('/customers', customerRouter);
router.use('/projects', projectRouter);
router.use('/shipments', shipmentRouter);
router.use('/invoices', invoiceRouter);
router.use('/documents', documentRouter);
router.use('/emails', emailRouter);
router.use('/payments', paymentRouter);
router.use('/disputes', disputeRouter);
router.use('/activities', activityRouter);
router.use('/settings', settingsRouter);
router.use('/reports', reportRouter);
