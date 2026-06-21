import bcrypt from 'bcryptjs';
import { prisma } from '../../config/db.js';
import { ApiError } from '../../utils/ApiError.js';
import { logActivity } from '../../services/activity.service.js';
import {
  signAccessToken,
  issueRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
} from './token.service.js';

const publicUser = (u) => ({
  id: u.id,
  email: u.email,
  name: u.name,
  role: u.role,
  avatarUrl: u.avatarUrl,
});

export async function register({ email, password, name, role }) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw ApiError.conflict('An account with this email already exists');

  // First user becomes ADMIN automatically; subsequent created with given role.
  const count = await prisma.user.count();
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { email, passwordHash, name, role: count === 0 ? 'ADMIN' : role || 'VIEWER' },
  });

  const accessToken = signAccessToken(user);
  const refreshToken = await issueRefreshToken(user.id);
  return { user: publicUser(user), accessToken, refreshToken };
}

export async function login({ email, password }) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.isActive) throw ApiError.unauthorized('Invalid credentials');

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw ApiError.unauthorized('Invalid credentials');

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await logActivity({
    type: 'USER_LOGIN',
    description: `${user.name} signed in`,
    actorId: user.id,
  });

  const accessToken = signAccessToken(user);
  const refreshToken = await issueRefreshToken(user.id);
  return { user: publicUser(user), accessToken, refreshToken };
}

export async function refresh(token) {
  if (!token) throw ApiError.unauthorized('Missing refresh token');
  const rotated = await rotateRefreshToken(token);
  if (!rotated) throw ApiError.unauthorized('Invalid refresh token');

  const user = await prisma.user.findUnique({ where: { id: rotated.userId } });
  if (!user || !user.isActive) throw ApiError.unauthorized('Account disabled');

  return { accessToken: signAccessToken(user), refreshToken: rotated.refreshToken };
}

export async function logout(token) {
  if (token) await revokeRefreshToken(token);
}

export async function changePassword(userId, currentPassword, newPassword) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) throw ApiError.badRequest('Current password is incorrect');
  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
}

// Password reset is stubbed to issue a one-time token; wiring it to the email
// service is a small extension (see docs/ROADMAP.md).
export async function requestPasswordReset(email) {
  const user = await prisma.user.findUnique({ where: { email } });
  // Always succeed silently to avoid leaking which emails exist.
  if (!user) return;
  // TODO: generate signed reset token + send via email.service.js
}
