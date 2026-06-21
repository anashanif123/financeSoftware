import { z } from 'zod';

export const registerSchema = {
  body: z.object({
    email: z.string().email(),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    name: z.string().min(2),
    role: z.enum(['ADMIN', 'OPS', 'VIEWER']).optional(),
  }),
};

export const loginSchema = {
  body: z.object({
    email: z.string().email(),
    password: z.string().min(1),
  }),
};

export const refreshSchema = {
  body: z.object({ refreshToken: z.string().min(1) }),
};

export const changePasswordSchema = {
  body: z.object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8),
  }),
};

export const forgotPasswordSchema = {
  body: z.object({ email: z.string().email() }),
};
