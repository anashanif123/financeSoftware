import { Router } from 'express';
import { writeAccess } from '../../middleware/rbac.js';
import { validate } from '../../middleware/validate.js';
import * as ctrl from './invoice.controller.js';
import { createInvoiceSchema, updateInvoiceSchema, commissionSchema } from './invoice.validation.js';

export const router = Router();

router.get('/', ctrl.list);
router.get('/:id', ctrl.get);
router.post('/', writeAccess, validate(createInvoiceSchema), ctrl.create);
router.patch('/:id', writeAccess, validate(updateInvoiceSchema), ctrl.update);
router.delete('/:id', writeAccess, ctrl.remove);

// Commission controls (Module 10)
router.patch('/:id/commission', writeAccess, validate(commissionSchema), ctrl.setCommission);
router.post('/:id/commission/toggle', writeAccess, ctrl.toggleCommission);

// PDF + delivery (Modules 11–12)
router.post('/:id/pdf', writeAccess, ctrl.generatePdf);
router.post('/:id/send', writeAccess, ctrl.send);
