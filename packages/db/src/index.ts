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
  agentProfileId: string | null;
  context: Record<string, unknown>;
  expectedOutput: string | null;
  resultSummary: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PersonalityPresetRecord {
  id: string;
  slug: string;
  name: string;
  description: string;
  tone: string;
  behaviorNotes: string;
  createdAt: string;
  updatedAt: string;
}

export interface AgentProfileRecord {
  id: string;
  companyId: string;
  personalityPresetId: string | null;
  personalityPreset: PersonalityPresetRecord | null;
  slug: string;
  name: string;
  department: string;
  mission: string;
  tone: string | null;
  status: string;
  memoryScope: string;
  allowedTasks: string[];
  approvalRules: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ArtifactRecord {
  id: string;
  companyId: string;
  taskId: string | null;
  artifactType: string;
  title: string;
  storagePath: string | null;
  bodyMarkdown: string | null;
  reviewStatus: string;
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
  agentProfileId?: string;
  requestedBy: string;
  goal: string;
  projectSlug?: string;
  priority?: "low" | "normal" | "high" | "urgent";
  context?: Record<string, unknown>;
  expectedOutput?: string;
}

export interface UpdateAgentProfileInput {
  name?: string;
  department?: string;
  mission?: string;
  tone?: string;
  status?: "active" | "paused";
  personalityPresetId?: string | null;
  memoryScope?: string;
  allowedTasks?: string[];
  approvalRules?: string[];
}

export interface CreateAgentTaskInput {
  agentProfileId: string;
  requestedBy: string;
  goal: string;
  priority?: "low" | "normal" | "high" | "urgent";
  expectedOutput?: string;
  context?: Record<string, unknown>;
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

  async listPersonalityPresets(): Promise<PersonalityPresetRecord[]> {
    const result = await this.pool.query<PersonalityPresetRow>(`
      select id, slug, name, description, tone, behavior_notes, created_at, updated_at
      from public.personality_presets
      order by name;
    `);

    return result.rows.map(mapPersonalityPresetRow);
  }

  async listAgentProfiles(companySlug: string): Promise<AgentProfileRecord[]> {
    const result = await this.pool.query<AgentProfileRow>(
      `
        select
          a.id, a.company_id, a.personality_preset_id, a.slug, a.name,
          a.department, a.mission, a.tone, a.status, a.memory_scope,
          a.allowed_tasks, a.approval_rules, a.created_at, a.updated_at,
          p.slug as preset_slug, p.name as preset_name, p.description as preset_description,
          p.tone as preset_tone, p.behavior_notes as preset_behavior_notes,
          p.created_at as preset_created_at, p.updated_at as preset_updated_at
        from public.agent_profiles a
        join public.companies c on c.id = a.company_id
        left join public.personality_presets p on p.id = a.personality_preset_id
        where c.slug = $1
        order by a.department, a.name;
      `,
      [companySlug],
    );

    return result.rows.map(mapAgentProfileRow);
  }

  async getAgentProfile(agentProfileId: string): Promise<AgentProfileRecord | null> {
    const result = await this.pool.query<AgentProfileRow>(
      `
        select
          a.id, a.company_id, a.personality_preset_id, a.slug, a.name,
          a.department, a.mission, a.tone, a.status, a.memory_scope,
          a.allowed_tasks, a.approval_rules, a.created_at, a.updated_at,
          p.slug as preset_slug, p.name as preset_name, p.description as preset_description,
          p.tone as preset_tone, p.behavior_notes as preset_behavior_notes,
          p.created_at as preset_created_at, p.updated_at as preset_updated_at
        from public.agent_profiles a
        left join public.personality_presets p on p.id = a.personality_preset_id
        where a.id = $1;
      `,
      [agentProfileId],
    );

    return result.rows[0] ? mapAgentProfileRow(result.rows[0]) : null;
  }

  async updateAgentProfile(
    agentProfileId: string,
    input: UpdateAgentProfileInput,
  ): Promise<AgentProfileRecord> {
    const current = await this.getAgentProfile(agentProfileId);

    if (!current) {
      throw new Error(`Agent profile not found: ${agentProfileId}`);
    }

    const result = await this.pool.query<{ id: string }>(
      `
        update public.agent_profiles
        set
          name = $2,
          department = $3,
          mission = $4,
          tone = $5,
          status = $6,
          personality_preset_id = $7,
          memory_scope = $8,
          allowed_tasks = $9,
          approval_rules = $10
        where id = $1
        returning id;
      `,
      [
        agentProfileId,
        input.name ?? current.name,
        input.department ?? current.department,
        input.mission ?? current.mission,
        input.tone ?? current.tone,
        input.status ?? (current.status as "active" | "paused"),
        input.personalityPresetId === undefined
          ? current.personalityPresetId
          : input.personalityPresetId,
        input.memoryScope ?? current.memoryScope,
        input.allowedTasks ?? current.allowedTasks,
        input.approvalRules ?? current.approvalRules,
      ],
    );

    return (await this.getAgentProfile(result.rows[0]!.id))!;
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
          t.priority, t.assigned_agent_recipe_id, t.agent_profile_id, t.context, t.expected_output,
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

  async getTaskById(taskId: string): Promise<TaskRecord | null> {
    const result = await this.pool.query<TaskRow>(
      `
        select id, company_id, project_slug, requested_by, goal, status,
          priority, assigned_agent_recipe_id, agent_profile_id, context, expected_output,
          result_summary, created_at, updated_at
        from public.tasks
        where id = $1;
      `,
      [taskId],
    );

    return result.rows[0] ? mapTaskRow(result.rows[0]) : null;
  }

  async listTaskMemory(taskId: string, limit = 8): Promise<MemoryEntryRecord[]> {
    const result = await this.pool.query<MemoryEntryRow>(
      `
        select m.id, m.company_id, m.category, m.claim, m.details, m.confidence, m.status,
          m.source_id, m.created_at, m.updated_at
        from public.memory_entries m
        join public.tasks t on t.company_id = m.company_id
        where t.id = $1
          and m.status = 'approved'
        order by
          case
            when lower(t.goal) like '%' || lower(m.category) || '%' then 0
            else 1
          end,
          m.created_at desc
        limit $2;
      `,
      [taskId, limit],
    );

    return result.rows.map(mapMemoryEntryRow);
  }

  async claimNextDraftTask(): Promise<TaskRecord | null> {
    const client = await this.pool.connect();

    try {
      await client.query("begin");

      const result = await client.query<TaskRow>(`
        select id, company_id, project_slug, requested_by, goal, status,
          priority, assigned_agent_recipe_id, agent_profile_id, context, expected_output,
          result_summary, created_at, updated_at
        from public.tasks
        where status = 'draft'
        order by
          case priority
            when 'urgent' then 0
            when 'high' then 1
            when 'normal' then 2
            when 'low' then 3
            else 4
          end,
          created_at
        limit 1
        for update skip locked;
      `);

      const task = result.rows[0];

      if (!task) {
        await client.query("commit");
        return null;
      }

      const updated = await client.query<TaskRow>(
        `
          update public.tasks
          set status = 'running'
          where id = $1
          returning id, company_id, project_slug, requested_by, goal, status,
            priority, assigned_agent_recipe_id, agent_profile_id, context, expected_output,
            result_summary, created_at, updated_at;
        `,
        [task.id],
      );

      await client.query("commit");

      return updated.rows[0] ? mapTaskRow(updated.rows[0]) : null;
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
  }

  async completeTaskWithArtifact(input: {
    taskId: string;
    title: string;
    bodyMarkdown: string;
    resultSummary: string;
    artifactType?: string;
    reviewStatus?: "draft" | "needs_review" | "approved";
  }): Promise<{ task: TaskRecord; artifact: ArtifactRecord }> {
    const client = await this.pool.connect();

    try {
      await client.query("begin");

      const taskResult = await client.query<TaskRow>(
        `
          update public.tasks
          set status = 'completed',
            result_summary = $2
          where id = $1
          returning id, company_id, project_slug, requested_by, goal, status,
            priority, assigned_agent_recipe_id, agent_profile_id, context, expected_output,
            result_summary, created_at, updated_at;
        `,
        [input.taskId, input.resultSummary],
      );

      const task = taskResult.rows[0];

      if (!task) {
        throw new Error(`Task not found: ${input.taskId}`);
      }

      const artifactResult = await client.query<ArtifactRow>(
        `
          insert into public.artifacts (
            company_id,
            task_id,
            artifact_type,
            title,
            body_markdown,
            review_status
          )
          values ($1, $2, $3, $4, $5, $6)
          returning id, company_id, task_id, artifact_type, title, storage_path,
            body_markdown, review_status, created_at, updated_at;
        `,
        [
          task.company_id,
          input.taskId,
          input.artifactType ?? "agent_output",
          input.title,
          input.bodyMarkdown,
          input.reviewStatus ?? "draft",
        ],
      );

      await client.query("commit");

      return {
        task: mapTaskRow(task),
        artifact: mapArtifactRow(artifactResult.rows[0]!),
      };
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
  }

  async failTask(taskId: string, resultSummary: string): Promise<TaskRecord> {
    const result = await this.pool.query<TaskRow>(
      `
        update public.tasks
        set status = 'failed',
          result_summary = $2
        where id = $1
        returning id, company_id, project_slug, requested_by, goal, status,
          priority, assigned_agent_recipe_id, agent_profile_id, context, expected_output,
          result_summary, created_at, updated_at;
      `,
      [taskId, resultSummary],
    );

    if (!result.rows[0]) {
      throw new Error(`Task not found: ${taskId}`);
    }

    return mapTaskRow(result.rows[0]);
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
          expected_output,
          agent_profile_id
        )
        select c.id, $2, $3, $4, $5, $6::jsonb, $7, $8::uuid
        from public.companies c
        where c.slug = $1
        returning id, company_id, project_slug, requested_by, goal, status,
          priority, assigned_agent_recipe_id, agent_profile_id, context, expected_output,
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
        input.agentProfileId ?? null,
      ],
    );

    if (!result.rows[0]) {
      throw new Error(`Company not found: ${input.companySlug}`);
    }

    return mapTaskRow(result.rows[0]);
  }

  async createTaskForAgent(input: CreateAgentTaskInput): Promise<TaskRecord> {
    const agent = await this.getAgentProfile(input.agentProfileId);

    if (!agent) {
      throw new Error(`Agent profile not found: ${input.agentProfileId}`);
    }

    const result = await this.pool.query<TaskRow>(
      `
        insert into public.tasks (
          company_id,
          agent_profile_id,
          requested_by,
          goal,
          priority,
          context,
          expected_output
        )
        values ($1, $2, $3, $4, $5, $6::jsonb, $7)
        returning id, company_id, project_slug, requested_by, goal, status,
          priority, assigned_agent_recipe_id, agent_profile_id, context, expected_output,
          result_summary, created_at, updated_at;
      `,
      [
        agent.companyId,
        input.agentProfileId,
        input.requestedBy,
        input.goal,
        input.priority ?? "normal",
        JSON.stringify({
          source: "agent-profile",
          agent: {
            id: agent.id,
            name: agent.name,
            department: agent.department,
            personality: agent.personalityPreset?.name ?? null,
            mission: agent.mission,
            tone: agent.tone,
            approvalRules: agent.approvalRules,
          },
          ...(input.context ?? {}),
        }),
        input.expectedOutput ?? null,
      ],
    );

    return mapTaskRow(result.rows[0]!);
  }

  async listArtifacts(companySlug: string, taskId?: string): Promise<ArtifactRecord[]> {
    const result = await this.pool.query<ArtifactRow>(
      `
        select a.id, a.company_id, a.task_id, a.artifact_type, a.title,
          a.storage_path, a.body_markdown, a.review_status, a.created_at, a.updated_at
        from public.artifacts a
        join public.companies c on c.id = a.company_id
        where c.slug = $1
          and ($2::uuid is null or a.task_id = $2)
        order by a.created_at desc;
      `,
      [companySlug, taskId ?? null],
    );

    return result.rows.map(mapArtifactRow);
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
  agent_profile_id: string | null;
  context: Record<string, unknown>;
  expected_output: string | null;
  result_summary: string | null;
  created_at: Date;
  updated_at: Date;
}

interface PersonalityPresetRow {
  id: string;
  slug: string;
  name: string;
  description: string;
  tone: string;
  behavior_notes: string;
  created_at: Date;
  updated_at: Date;
}

interface AgentProfileRow {
  id: string;
  company_id: string;
  personality_preset_id: string | null;
  slug: string;
  name: string;
  department: string;
  mission: string;
  tone: string | null;
  status: string;
  memory_scope: string;
  allowed_tasks: string[];
  approval_rules: string[];
  created_at: Date;
  updated_at: Date;
  preset_slug: string | null;
  preset_name: string | null;
  preset_description: string | null;
  preset_tone: string | null;
  preset_behavior_notes: string | null;
  preset_created_at: Date | null;
  preset_updated_at: Date | null;
}

interface ArtifactRow {
  id: string;
  company_id: string;
  task_id: string | null;
  artifact_type: string;
  title: string;
  storage_path: string | null;
  body_markdown: string | null;
  review_status: string;
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
    agentProfileId: row.agent_profile_id,
    context: row.context,
    expectedOutput: row.expected_output,
    resultSummary: row.result_summary,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

function mapPersonalityPresetRow(row: PersonalityPresetRow): PersonalityPresetRecord {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    tone: row.tone,
    behaviorNotes: row.behavior_notes,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

function mapAgentProfileRow(row: AgentProfileRow): AgentProfileRecord {
  return {
    id: row.id,
    companyId: row.company_id,
    personalityPresetId: row.personality_preset_id,
    personalityPreset:
      row.personality_preset_id && row.preset_slug
        ? {
            id: row.personality_preset_id,
            slug: row.preset_slug,
            name: row.preset_name ?? "",
            description: row.preset_description ?? "",
            tone: row.preset_tone ?? "",
            behaviorNotes: row.preset_behavior_notes ?? "",
            createdAt: row.preset_created_at?.toISOString() ?? "",
            updatedAt: row.preset_updated_at?.toISOString() ?? "",
          }
        : null,
    slug: row.slug,
    name: row.name,
    department: row.department,
    mission: row.mission,
    tone: row.tone,
    status: row.status,
    memoryScope: row.memory_scope,
    allowedTasks: row.allowed_tasks ?? [],
    approvalRules: row.approval_rules ?? [],
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

function mapArtifactRow(row: ArtifactRow): ArtifactRecord {
  return {
    id: row.id,
    companyId: row.company_id,
    taskId: row.task_id,
    artifactType: row.artifact_type,
    title: row.title,
    storagePath: row.storage_path,
    bodyMarkdown: row.body_markdown,
    reviewStatus: row.review_status,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}
