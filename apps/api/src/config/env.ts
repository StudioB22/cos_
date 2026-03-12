import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_PORT: z.coerce.number().int().positive().default(3001),
  SQLITE_PATH: z.string().default('./apps/api/data/cos.sqlite'),
  COOKIE_SECRET: z.string().min(8).default('change-me-now'),
  ALLOWED_ORIGIN: z.string().url().default('http://localhost:5173'),
});

export type Env = z.infer<typeof envSchema>;

export const loadEnv = (): Env => envSchema.parse(process.env);
