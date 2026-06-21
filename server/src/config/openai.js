import OpenAI from 'openai';
import { env, features } from './env.js';
import { logger } from './logger.js';

// Lazily exported client — null when no key is configured so callers can
// degrade gracefully (the AI features become no-ops with a clear message).
export const openai = features.openai
  ? new OpenAI({ apiKey: env.OPENAI_API_KEY })
  : null;

if (!features.openai) {
  logger.warn('OPENAI_API_KEY not set — AI extraction disabled');
}
