import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import pg from "pg";
import { z } from "zod";

const { Pool } = pg;

const optionalEnvString = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().min(1).optional(),
);

const databaseEnvSchema = z.object({
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: optionalEnvString,
  SUPABASE_DATABASE_URL: optionalEnvString,
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

export interface CompanyRecord {
  id: string;
  slug: string;
  name: string;
  industry: string | null;
  description: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface MemoryEntryRecord {
  id: string;
  companyId: string;
  category: string;
  claim: string;
  details: string | null;
  confidence: string;
  status: string;
  sourceId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TaskRecord {
  id: string;
  companyId: string;
  projectSlug: string | null;
  requestedBy: string;
  goal: string;
  status: string;
  priority: string;
  assignedAgentRecipeId: string | null;
  context: Record<string, unknown>;
  expectedOutput: string | null;
  resultSummary: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMemoryEntryInput {
  companySlug: string;
  category: string;
  claim: string;
  details?: string;
  confidence?: "low" | "medium" | "high";
  status?: "draft" | "approved" | "deprecated";
}

export interface CreateTaskInput {
  companySlug: string;
  requestedBy: string;
  goal: string;
  projectSlug?: string;
  priority?: "low" | "normal" | "high" | "urgent";
  context?: Record<string, unknown>;
  expectedOutput?: string;
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

export function createPostgresPool(env: NodeJS.ProcessEnv = process.env): pg.Pool {
  const config = readDatabaseEnv(env);

  if (!config.databaseUrl) {
    throw new Error("SUPABASE_DATABASE_URL is required for direct Postgres access.");
  }

  return new Pool({
    connectionString: config.databaseUrl,
    ssl: {
      rejectUnauthorized: false,
    },
  });
}

export class CompanyOsRepository {
  constructor(private readonly pool: pg.Pool) {}

  async listCompanies(): Promise<CompanyRecord[]> {
    const result = await this.pool.query<CompanyRow>(`
      select id, slug, name, industry, description, status, created_at, updated_at
      from public.companies
      order by name;
    `);

    return result.rows.map(mapCompanyRow);
  }

  async getCompanyBySlug(slug: string): Promise<CompanyRecord | null> {
    const result = await this.pool.query<CompanyRow>(
      `
        select id, slug, name, industry, description, status, created_at, updated_at
        from public.companies
        where slug = $1;
      `,
      [slug],
    );

    return result.rows[0] ? mapCompanyRow(result.rows[0]) : null;
  }

  async listMemoryEntries(companySlug: string, status = "draft"): Promise<MemoryEntryRecord[]> {
    const result = await this.pool.query<MemoryEntryRow>(
      `
        select m.id, m.company_id, m.category, m.claim, m.details, m.confidence, m.status,
          m.source_id, m.created_at, m.updated_at
        from public.memory_entries m
        join public.companies c on c.id = m.company_id
        where c.slug = $1
          and ($2::text is null or m.status = $2)
        order by m.created_at desc;
      `,
      [companySlug, status],
    );

    return result.rows.map(mapMemoryEntryRow);
  }

  async createMemoryEntry(input: CreateMemoryEntryInput): Promise<MemoryEntryRecord> {
    const result = await this.pool.query<MemoryEntryRow>(
      `
        insert into public.memory_entries (
          company_id,
          category,
          claim,
          details,
          confidence,
          status
        )
        select c.id, $2, $3, $4, $5, $6
        from public.companies c
        where c.slug = $1
        returning id, company_id, category, claim, details, confidence, status,
          source_id, created_at, updated_at;
      `,
      [
        input.companySlug,
        input.category,
        input.claim,
        input.details ?? null,
        input.confidence ?? "medium",
        input.status ?? "draft",
      ],
    );

    if (!result.rows[0]) {
      throw new Error(`Company not found: ${input.companySlug}`);
    }

    return mapMemoryEntryRow(result.rows[0]);
  }

  async listTasks(companySlug: string, status?: string): Promise<TaskRecord[]> {
    const result = await this.pool.query<TaskRow>(
      `
        select t.id, t.company_id, t.project_slug, t.requested_by, t.goal, t.status,
          t.priority, t.assigned_agent_recipe_id, t.context, t.expected_output,
          t.result_summary, t.created_at, t.updated_at
        from public.tasks t
        join public.companies c on c.id = t.company_id
        where c.slug = $1
          and ($2::text is null or t.status = $2)
        order by t.created_at desc;
      `,
      [companySlug, status ?? null],
    );

    return result.rows.map(mapTaskRow);
  }

  async createTask(input: CreateTaskInput): Promise<TaskRecord> {
    const result = await this.pool.query<TaskRow>(
      `
        insert into public.tasks (
          company_id,
          project_slug,
          requested_by,
          goal,
          priority,
          context,
          expected_output
        )
        select c.id, $2, $3, $4, $5, $6::jsonb, $7
        from public.companies c
        where c.slug = $1
        returning id, company_id, project_slug, requested_by, goal, status,
          priority, assigned_agent_recipe_id, context, expected_output,
          result_summary, created_at, updated_at;
      `,
      [
        input.companySlug,
        input.projectSlug ?? null,
        input.requestedBy,
        input.goal,
        input.priority ?? "normal",
        JSON.stringify(input.context ?? {}),
        input.expectedOutput ?? null,
      ],
    );

    if (!result.rows[0]) {
      throw new Error(`Company not found: ${input.companySlug}`);
    }

    return mapTaskRow(result.rows[0]);
  }
}

interface CompanyRow {
  id: string;
  slug: string;
  name: string;
  industry: string | null;
  description: string | null;
  status: string;
  created_at: Date;
  updated_at: Date;
}

interface MemoryEntryRow {
  id: string;
  company_id: string;
  category: string;
  claim: string;
  details: string | null;
  confidence: string;
  status: string;
  source_id: string | null;
  created_at: Date;
  updated_at: Date;
}

interface TaskRow {
  id: string;
  company_id: string;
  project_slug: string | null;
  requested_by: string;
  goal: string;
  status: string;
  priority: string;
  assigned_agent_recipe_id: string | null;
  context: Record<string, unknown>;
  expected_output: string | null;
  result_summary: string | null;
  created_at: Date;
  updated_at: Date;
}

function mapCompanyRow(row: CompanyRow): CompanyRecord {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    industry: row.industry,
    description: row.description,
    status: row.status,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

function mapMemoryEntryRow(row: MemoryEntryRow): MemoryEntryRecord {
  return {
    id: row.id,
    companyId: row.company_id,
    category: row.category,
    claim: row.claim,
    details: row.details,
    confidence: row.confidence,
    status: row.status,
    sourceId: row.source_id,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

function mapTaskRow(row: TaskRow): TaskRecord {
  return {
    id: row.id,
    companyId: row.company_id,
    projectSlug: row.project_slug,
    requestedBy: row.requested_by,
    goal: row.goal,
    status: row.status,
    priority: row.priority,
    assignedAgentRecipeId: row.assigned_agent_recipe_id,
    context: row.context,
    expectedOutput: row.expected_output,
    resultSummary: row.result_summary,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}
