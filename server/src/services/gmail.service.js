import { google } from 'googleapis';
import { env, features } from '../config/env.js';
import { prisma } from '../config/db.js';
import { ApiError } from '../utils/ApiError.js';
import { logger } from '../config/logger.js';

// ── Gmail integration (Modules 3, 4, 12, 13) ──
// OAuth2 connect/disconnect, incremental inbox sync, attachment fetch, send.

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.modify',
];

export function oauthClient() {
  if (!features.gmail) throw ApiError.internal('Gmail OAuth is not configured');
  return new google.auth.OAuth2(env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET, env.GOOGLE_REDIRECT_URI);
}

export function getAuthUrl(state) {
  return oauthClient().generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: SCOPES,
    state,
  });
}

// Exchange the OAuth code, persist tokens against the user.
export async function connectAccount(code, userId) {
  const client = oauthClient();
  const { tokens } = await client.getToken(code);
  client.setCredentials(tokens);

  const profile = await google.gmail({ version: 'v1', auth: client }).users.getProfile({ userId: 'me' });
  const emailAddress = profile.data.emailAddress;

  const data = {
    emailAddress,
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    tokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
    scopes: SCOPES.join(' '),
    historyId: profile.data.historyId ? String(profile.data.historyId) : null,
    isActive: true,
  };
  return prisma.gmailConnection.upsert({
    where: { userId },
    create: { userId, ...data },
    update: data,
  });
}

export async function disconnectAccount(userId) {
  await prisma.gmailConnection.deleteMany({ where: { userId } });
}

// Build an authed Gmail client from the stored connection, refreshing if needed.
async function clientForConnection(connection) {
  const client = oauthClient();
  client.setCredentials({
    access_token: connection.accessToken,
    refresh_token: connection.refreshToken,
    expiry_date: connection.tokenExpiry?.getTime(),
  });
  client.on('tokens', async (tokens) => {
    await prisma.gmailConnection
      .update({
        where: { id: connection.id },
        data: {
          accessToken: tokens.access_token ?? connection.accessToken,
          tokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : connection.tokenExpiry,
        },
      })
      .catch(() => {});
  });
  return google.gmail({ version: 'v1', auth: client });
}

function decodeBody(payload) {
  if (!payload) return '';
  if (payload.body?.data) return Buffer.from(payload.body.data, 'base64').toString('utf8');
  if (payload.parts) {
    const text = payload.parts.find((p) => p.mimeType === 'text/plain');
    const html = payload.parts.find((p) => p.mimeType === 'text/html');
    const target = text || html;
    if (target?.body?.data) return Buffer.from(target.body.data, 'base64').toString('utf8');
    // Recurse into nested multiparts
    for (const part of payload.parts) {
      const nested = decodeBody(part);
      if (nested) return nested;
    }
  }
  return '';
}

function headerValue(headers = [], name) {
  return headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value || '';
}

// Walk the full MIME tree — attachments can be nested several levels deep
// (multipart/mixed → multipart/related → …), not just at the top level.
function collectAttachments(part, out = []) {
  if (!part) return out;
  if (part.filename && part.body?.attachmentId) {
    out.push({ filename: part.filename, mimeType: part.mimeType, attachmentId: part.body.attachmentId });
  }
  for (const child of part.parts || []) collectAttachments(child, out);
  return out;
}

// Fetch recent messages (default: last 7 days). Returns normalised records.
export async function fetchMessages(connection, { query = 'newer_than:7d', max = 25 } = {}) {
  const gmail = await clientForConnection(connection);
  const list = await gmail.users.messages.list({ userId: 'me', q: query, maxResults: max });
  const messages = list.data.messages || [];

  const results = [];
  for (const { id } of messages) {
    const full = await gmail.users.messages.get({ userId: 'me', id, format: 'full' });
    const { payload, snippet, internalDate, threadId } = full.data;
    const headers = payload?.headers || [];
    const fromRaw = headerValue(headers, 'From');
    const fromMatch = /<(.+?)>/.exec(fromRaw);

    const attachments = collectAttachments(payload);

    results.push({
      gmailMessageId: id,
      threadId,
      fromAddress: fromMatch ? fromMatch[1] : fromRaw,
      fromName: fromRaw.replace(/<.+?>/, '').replace(/"/g, '').trim() || null,
      toAddress: headerValue(headers, 'To'),
      subject: headerValue(headers, 'Subject'),
      snippet,
      body: decodeBody(payload),
      receivedAt: new Date(Number(internalDate)),
      attachments,
    });
  }
  return results;
}

export async function downloadAttachment(connection, messageId, attachmentId) {
  const gmail = await clientForConnection(connection);
  const res = await gmail.users.messages.attachments.get({ userId: 'me', messageId, id: attachmentId });
  return Buffer.from(res.data.data, 'base64');
}

// Send an email (used by invoice delivery). `attachments`: [{ filename, content(base64), mimeType }]
export async function sendEmail(connection, { to, subject, html, attachments = [] }) {
  const gmail = await clientForConnection(connection);
  const boundary = `clearway_${Date.now()}`;
  const lines = [
    `From: ${connection.emailAddress}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    '',
    html,
  ];
  for (const att of attachments) {
    lines.push(
      `--${boundary}`,
      `Content-Type: ${att.mimeType}; name="${att.filename}"`,
      'Content-Transfer-Encoding: base64',
      `Content-Disposition: attachment; filename="${att.filename}"`,
      '',
      att.content,
    );
  }
  lines.push(`--${boundary}--`);

  const raw = Buffer.from(lines.join('\r\n'))
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const res = await gmail.users.messages.send({ userId: 'me', requestBody: { raw } });
  logger.info({ messageId: res.data.id }, 'Email sent via Gmail');
  return { messageId: res.data.id };
}

export async function getActiveConnection() {
  return prisma.gmailConnection.findFirst({ where: { isActive: true }, orderBy: { updatedAt: 'desc' } });
}
