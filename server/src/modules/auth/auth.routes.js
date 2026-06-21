import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { authRateLimiter } from '../../middleware/rateLimit.js';
import { validate } from '../../middleware/validate.js';
import * as ctrl from './auth.controller.js';
import {
  registerSchema,
  loginSchema,
  refreshSchema,
  changePasswordSchema,
  forgotPasswordSchema,
} from './auth.validation.js';

export const router = Router();

router.post('/register', authRateLimiter, validate(registerSchema), ctrl.register);
router.post('/login', authRateLimiter, validate(loginSchema), ctrl.login);
router.post('/refresh', validate(refreshSchema), ctrl.refresh);
router.post('/logout', ctrl.logout);
router.post('/forgot-password', authRateLimiter, validate(forgotPasswordSchema), ctrl.forgotPassword);

router.get('/me', authenticate, ctrl.me);
router.post('/change-password', authenticate, validate(changePasswordSchema), ctrl.changePassword);
