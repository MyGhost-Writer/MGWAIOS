import cors from "@fastify/cors";
import dotenv from "dotenv";
import Fastify from "fastify";
import { runNextTask } from "@mgwaios/agents";
import { createHealthReport, mgwaiosVersion } from "@mgwaios/core";
import { CompanyOsRepository, createPostgresPool, readDatabaseConfig } from "@mgwaios/db";
import { z } from "zod";

dotenv.config({ path: "../../.env.local", quiet: true });
dotenv.config({ path: ".env.local", quiet: true });
dotenv.config({ quiet: true });

const host = process.env.API_HOST ?? "0.0.0.0";
const port = Number(process.env.API_PORT ?? "4000");
const pool = createPostgresPool();
const repository = new CompanyOsRepository(pool);

const companyParamsSchema = z.object({
  slug: z.string().min(1),
});

const listQuerySchema = z.object({
  status: z.string().min(1).optional(),
});

const createMemoryBodySchema = z.object({
  category: z.string().min(1),
  claim: z.string().min(1),
  details: z.string().optional(),
  confidence: z.enum(["low", "medium", "high"]).optional(),
  status: z.enum(["draft", "approved", "deprecated"]).optional(),
});

const createTaskBodySchema = z.object({
  requestedBy: z.string().min(1),
  goal: z.string().min(1),
  agentProfileId: z.string().uuid().optional(),
  projectSlug: z.string().min(1).optional(),
  priority: z.enum(["low", "normal", "high", "urgent"]).optional(),
  context: z.record(z.string(), z.unknown()).optional(),
  expectedOutput: z.string().optional(),
});

const agentParamsSchema = z.object({
  id: z.string().uuid(),
});

const updateAgentBodySchema = z.object({
  name: z.string().min(1).optional(),
  department: z.string().min(1).optional(),
  mission: z.string().min(1).optional(),
  tone: z.string().optional(),
  status: z.enum(["active", "paused"]).optional(),
  personalityPresetId: z.string().uuid().nullable().optional(),
  memoryScope: z.string().min(1).optional(),
  allowedTasks: z.array(z.string().min(1)).optional(),
  approvalRules: z.array(z.string().min(1)).optional(),
});

const createAgentTaskBodySchema = z.object({
  requestedBy: z.string().min(1),
  goal: z.string().min(1),
  priority: z.enum(["low", "normal", "high", "urgent"]).optional(),
  context: z.record(z.string(), z.unknown()).optional(),
  expectedOutput: z.string().optional(),
});

const app = Fastify({
  logger: true,
});

await app.register(cors, {
  origin: true,
});

app.get("/health", async () => createHealthReport("api"));

app.get("/ready", async () => {
  const database = readDatabaseConfig();

  return {
    service: "api",
    status: database.supabaseUrl && database.hasAnonKey ? "ready" : "missing_config",
    database,
    telegram: {
      hasBotToken: Boolean(process.env.TELEGRAM_BOT_TOKEN),
      hasWebhookSecret: Boolean(process.env.TELEGRAM_WEBHOOK_SECRET),
    },
    openai: {
      hasApiKey: Boolean(process.env.OPENAI_API_KEY),
    },
  };
});

app.get("/", async () => ({
  name: "MGWAIOS API",
  version: mgwaiosVersion,
  status: "ready",
}));

app.get("/companies", async () => ({
  companies: await repository.listCompanies(),
}));

app.get("/companies/:slug", async (request, reply) => {
  const params = companyParamsSchema.parse(request.params);
  const company = await repository.getCompanyBySlug(params.slug);

  if (!company) {
    return reply.code(404).send({
      error: "company_not_found",
      message: `Company not found: ${params.slug}`,
    });
  }

  return { company };
});

app.get("/personality-presets", async () => ({
  personalityPresets: await repository.listPersonalityPresets(),
}));

app.get("/companies/:slug/agents", async (request) => {
  const params = companyParamsSchema.parse(request.params);

  return {
    agents: await repository.listAgentProfiles(params.slug),
  };
});

app.get("/agents/:id", async (request, reply) => {
  const params = agentParamsSchema.parse(request.params);
  const agent = await repository.getAgentProfile(params.id);

  if (!agent) {
    return reply.code(404).send({
      error: "agent_not_found",
      message: `Agent profile not found: ${params.id}`,
    });
  }

  return { agent };
});

app.patch("/agents/:id", async (request, reply) => {
  const params = agentParamsSchema.parse(request.params);
  const body = updateAgentBodySchema.parse(request.body);

  try {
    const agent = await repository.updateAgentProfile(params.id, body);
    return { agent };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Agent profile not found")) {
      return reply.code(404).send({
        error: "agent_not_found",
        message: error.message,
      });
    }

    throw error;
  }
});

app.post("/agents/:id/tasks", async (request, reply) => {
  const params = agentParamsSchema.parse(request.params);
  const body = createAgentTaskBodySchema.parse(request.body);

  try {
    const task = await repository.createTaskForAgent({
      agentProfileId: params.id,
      ...body,
    });

    return reply.code(201).send({ task });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Agent profile not found")) {
      return reply.code(404).send({
        error: "agent_not_found",
        message: error.message,
      });
    }

    throw error;
  }
});

app.get("/companies/:slug/memory", async (request) => {
  const params = companyParamsSchema.parse(request.params);
  const query = listQuerySchema.parse(request.query);

  return {
    memoryEntries: await repository.listMemoryEntries(params.slug, query.status ?? "draft"),
  };
});

app.post("/companies/:slug/memory", async (request, reply) => {
  const params = companyParamsSchema.parse(request.params);
  const body = createMemoryBodySchema.parse(request.body);

  try {
    const memoryEntry = await repository.createMemoryEntry({
      companySlug: params.slug,
      ...body,
    });

    return reply.code(201).send({ memoryEntry });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Company not found")) {
      return reply.code(404).send({
        error: "company_not_found",
        message: error.message,
      });
    }

    throw error;
  }
});

app.get("/companies/:slug/tasks", async (request) => {
  const params = companyParamsSchema.parse(request.params);
  const query = listQuerySchema.parse(request.query);

  return {
    tasks: await repository.listTasks(params.slug, query.status),
  };
});

app.post("/companies/:slug/tasks", async (request, reply) => {
  const params = companyParamsSchema.parse(request.params);
  const body = createTaskBodySchema.parse(request.body);

  try {
    const task = await repository.createTask({
      companySlug: params.slug,
      ...body,
    });

    return reply.code(201).send({ task });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Company not found")) {
      return reply.code(404).send({
        error: "company_not_found",
        message: error.message,
      });
    }

    throw error;
  }
});

app.get("/companies/:slug/artifacts", async (request) => {
  const params = companyParamsSchema.parse(request.params);
  const query = z
    .object({
      taskId: z.string().uuid().optional(),
    })
    .parse(request.query);

  return {
    artifacts: await repository.listArtifacts(params.slug, query.taskId),
  };
});

app.post("/worker/run-next", async (request, reply) => {
  const openAiApiKey = process.env.OPENAI_API_KEY;

  if (!openAiApiKey) {
    return reply.code(503).send({
      error: "missing_openai_api_key",
      message: "OPENAI_API_KEY is required to run worker tasks.",
    });
  }

  const result = await runNextTask(repository, {
    apiKey: openAiApiKey,
    model: process.env.OPENAI_MODEL ?? "gpt-5.2",
  });

  return {
    worker: result,
  };
});

try {
  await app.listen({ host, port });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
