import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

// Validate and normalise environment once, at boot. Fail fast on misconfig.
const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  WEB_APP_URL: z.string().default('http://localhost:5173'),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  JWT_ACCESS_SECRET: z.string().min(16, 'JWT_ACCESS_SECRET too short'),
  JWT_REFRESH_SECRET: z.string().min(16, 'JWT_REFRESH_SECRET too short'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),

  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  CLOUDINARY_FOLDER: z.string().default('clearway'),

  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default('gpt-4o-mini'),

  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_REDIRECT_URI: z.string().optional(),

  COMPANY_NAME: z.string().default('Clearway'),
  COMPANY_EMAIL: z.string().default('billing@clearway.app'),
  COMPANY_ADDRESS: z.string().default(''),
  COMPANY_LOGO_URL: z.string().optional(),

  INVOICE_PREFIX: z.string().default('INV'),
  DEFAULT_COMMISSION_TYPE: z
    .enum(['FLAT', 'PERCENTAGE', 'PER_CONTAINER', 'NONE'])
    .default('PER_CONTAINER'),
  DEFAULT_COMMISSION_RATE: z.coerce.number().default(1400),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error('❌ Invalid environment configuration:');
  // eslint-disable-next-line no-console
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export const isProd = env.NODE_ENV === 'production';
export const isDev = env.NODE_ENV === 'development';

// Feature flags derived from whether integration creds are present.
export const features = {
  cloudinary: Boolean(env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY),
  openai: Boolean(env.OPENAI_API_KEY),
  gmail: Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET),
};
