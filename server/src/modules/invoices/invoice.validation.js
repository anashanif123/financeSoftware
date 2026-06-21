import { z } from 'zod';

const itemSchema = z.object({
  description: z.string().min(1),
  category: z.string().optional().nullable(),
  quantity: z.coerce.number().default(1),
  unitPrice: z.coerce.number().default(0),
  amount: z.coerce.number().optional(),
  sourceDocumentId: z.string().optional().nullable(),
});

export const createInvoiceSchema = {
  body: z.object({
    customerId: z.string().optional().nullable(),
    projectId: z.string().optional().nullable(),
    shipmentId: z.string().optional().nullable(),
    currency: z.string().default('USD'),
    baseCost: z.coerce.number().optional(),
    containerCount: z.coerce.number().optional(),
    commissionType: z.enum(['FLAT', 'PERCENTAGE', 'PER_CONTAINER', 'NONE']).optional(),
    commissionRate: z.coerce.number().optional(),
    dueDate: z.coerce.date().optional().nullable(),
    notes: z.string().optional().nullable(),
    items: z.array(itemSchema).optional(),
  }),
};

export const updateInvoiceSchema = {
  body: z.object({
    status: z.enum(['DRAFT', 'PENDING', 'SENT', 'PARTIALLY_PAID', 'PAID', 'CANCELLED', 'OVERDUE']).optional(),
    dueDate: z.coerce.date().optional().nullable(),
    notes: z.string().optional().nullable(),
    currency: z.string().optional(),
  }),
};

export const commissionSchema = {
  body: z.object({
    commissionType: z.enum(['FLAT', 'PERCENTAGE', 'PER_CONTAINER', 'NONE']).optional(),
    commissionRate: z.coerce.number().optional(),
  }),
};
