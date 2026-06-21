import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { authenticate } from '../../middleware/auth.js';
import { adminOnly } from '../../middleware/rbac.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok } from '../../utils/response.js';
import { env } from '../../config/env.js';
import { prisma } from '../../config/db.js';
import { getAuthUrl, connectAccount, disconnectAccount } from '../../services/gmail.service.js';

export const router = Router();

// Connection status (Module 3).
router.get(
  '/status',
  authenticate,
  asyncHandler(async (req, res) => {
    const connection = await prisma.gmailConnection.findUnique({
      where: { userId: req.user.id },
      select: { emailAddress: true, isActive: true, lastSyncAt: true, createdAt: true },
    });
    ok(res, { connected: Boolean(connection?.isActive), connection: connection || null });
  }),
);

// Begin OAuth — returns the Google consent URL. We sign a short-lived state
// token carrying the user id so the callback can attribute the connection.
router.get(
  '/connect',
  authenticate,
  adminOnly,
  asyncHandler(async (req, res) => {
    const state = jwt.sign({ sub: req.user.id }, env.JWT_ACCESS_SECRET, { expiresIn: '10m' });
    ok(res, { url: getAuthUrl(state) });
  }),
);

// OAuth redirect target (public — validated via signed state).
router.get(
  '/oauth/callback',
  asyncHandler(async (req, res) => {
    const { code, state } = req.query;
    let userId;
    try {
      userId = jwt.verify(state, env.JWT_ACCESS_SECRET).sub;
    } catch {
      return res.redirect(`${env.WEB_APP_URL}/settings/gmail?error=invalid_state`);
    }
    await connectAccount(code, userId);
    res.redirect(`${env.WEB_APP_URL}/settings/gmail?connected=1`);
  }),
);

router.post(
  '/disconnect',
  authenticate,
  adminOnly,
  asyncHandler(async (req, res) => {
    await disconnectAccount(req.user.id);
    ok(res, { connected: false });
  }),
);
