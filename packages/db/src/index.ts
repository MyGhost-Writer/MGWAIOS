export interface DatabaseConfig {
  supabaseUrl: string;
  hasServiceRoleKey: boolean;
}

export function readDatabaseConfig(env: NodeJS.ProcessEnv = process.env): DatabaseConfig {
  return {
    supabaseUrl: env.SUPABASE_URL ?? "",
    hasServiceRoleKey: Boolean(env.SUPABASE_SERVICE_ROLE_KEY),
  };
}
