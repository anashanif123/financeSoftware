import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok, created } from '../../utils/response.js';
import * as service from './auth.service.js';

export const register = asyncHandler(async (req, res) => {
  const result = await service.register(req.body);
  created(res, result);
});

export const login = asyncHandler(async (req, res) => {
  const result = await service.login(req.body);
  ok(res, result);
});

export const refresh = asyncHandler(async (req, res) => {
  const result = await service.refresh(req.body.refreshToken);
  ok(res, result);
});

export const logout = asyncHandler(async (req, res) => {
  await service.logout(req.body?.refreshToken);
  ok(res, { message: 'Logged out' });
});

export const me = asyncHandler(async (req, res) => {
  ok(res, { user: req.user });
});

export const changePassword = asyncHandler(async (req, res) => {
  await service.changePassword(req.user.id, req.body.currentPassword, req.body.newPassword);
  ok(res, { message: 'Password updated' });
});

export const forgotPassword = asyncHandler(async (req, res) => {
  await service.requestPasswordReset(req.body.email);
  ok(res, { message: 'If that account exists, a reset link has been sent.' });
});
