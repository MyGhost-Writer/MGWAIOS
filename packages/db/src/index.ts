import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

const databaseEnvSchema = z.object({
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  SUPABASE_DATABASE_URL: z.string().min(1).optional(),
});

export interface DatabaseConfig {
  supabaseUrl: string;
  hasAnonKey: boolean;
  hasServiceRoleKey: boolean;
  hasDatabaseUrl: boolean;
}

export interface DatabaseEnv {
  supabaseUrl: string;
  anonKey: string;
  serviceRoleKey?: string;
  databaseUrl?: string;
}

export function readDatabaseConfig(env: NodeJS.ProcessEnv = process.env): DatabaseConfig {
  return {
    supabaseUrl: env.SUPABASE_URL ?? "",
    hasAnonKey: Boolean(env.SUPABASE_ANON_KEY),
    hasServiceRoleKey: Boolean(env.SUPABASE_SERVICE_ROLE_KEY),
    hasDatabaseUrl: Boolean(env.SUPABASE_DATABASE_URL),
  };
}

export function readDatabaseEnv(env: NodeJS.ProcessEnv = process.env): DatabaseEnv {
  const parsed = databaseEnvSchema.parse(env);

  return {
    supabaseUrl: parsed.SUPABASE_URL,
    anonKey: parsed.SUPABASE_ANON_KEY,
    serviceRoleKey: parsed.SUPABASE_SERVICE_ROLE_KEY,
    databaseUrl: parsed.SUPABASE_DATABASE_URL,
  };
}

export function createSupabaseAnonClient(env: NodeJS.ProcessEnv = process.env): SupabaseClient {
  const config = readDatabaseEnv(env);

  return createClient(config.supabaseUrl, config.anonKey);
}

export function createSupabaseServiceClient(env: NodeJS.ProcessEnv = process.env): SupabaseClient {
  const config = readDatabaseEnv(env);

  if (!config.serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for server-side write access.");
  }

  return createClient(config.supabaseUrl, config.serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
