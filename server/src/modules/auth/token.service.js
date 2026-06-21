import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';
import { env } from '../../config/env.js';
import { prisma } from '../../config/db.js';

function parseDurationToMs(str) {
  const m = /^(\d+)([smhd])$/.exec(str);
  if (!m) return 15 * 60 * 1000;
  const n = Number(m[1]);
  return { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }[m[2]] * n;
}

export function signAccessToken(user) {
  return jwt.sign({ sub: user.id, role: user.role, email: user.email }, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN,
  });
}

// Refresh tokens are opaque, stored hashed-by-uniqueness in DB so they can be revoked.
export async function issueRefreshToken(userId) {
  const token = jwt.sign({ sub: userId, jti: randomUUID() }, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN,
  });
  const expiresAt = new Date(Date.now() + parseDurationToMs(env.JWT_REFRESH_EXPIRES_IN));
  await prisma.refreshToken.create({ data: { token, userId, expiresAt } });
  return token;
}

export async function rotateRefreshToken(oldToken) {
  let payload;
  try {
    payload = jwt.verify(oldToken, env.JWT_REFRESH_SECRET);
  } catch {
    return null;
  }
  const existing = await prisma.refreshToken.findUnique({ where: { token: oldToken } });
  if (!existing || existing.revokedAt || existing.expiresAt < new Date()) return null;

  // Rotate: revoke the old, issue a new one.
  await prisma.refreshToken.update({
    where: { id: existing.id },
    data: { revokedAt: new Date() },
  });
  const fresh = await issueRefreshToken(payload.sub);
  return { userId: payload.sub, refreshToken: fresh };
}

export async function revokeRefreshToken(token) {
  await prisma.refreshToken
    .updateMany({ where: { token, revokedAt: null }, data: { revokedAt: new Date() } })
    .catch(() => {});
}
