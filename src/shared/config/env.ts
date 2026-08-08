import { z } from "zod";

const DEFAULT_PORT = 3000;

const environmentSchema = z.object({
  DATABASE_URL: z.url(),
  REDIS_URL: z.url(),
  PORT: z.coerce.number().int().positive().default(DEFAULT_PORT),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

export function loadEnvironmentConfig(): z.infer<typeof environmentSchema> {
  const parsed = environmentSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(`Invalid environment configuration: ${z.prettifyError(parsed.error)}`);
  }
  return parsed.data;
}

export const environmentConfig = loadEnvironmentConfig();
