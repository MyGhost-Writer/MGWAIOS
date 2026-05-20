import cors from "@fastify/cors";
import dotenv from "dotenv";
import Fastify from "fastify";
import { createHealthReport, mgwaiosVersion } from "@mgwaios/core";
import { readDatabaseConfig } from "@mgwaios/db";

dotenv.config({ path: ".env.local", quiet: true });
dotenv.config({ quiet: true });

const host = process.env.API_HOST ?? "0.0.0.0";
const port = Number(process.env.API_PORT ?? "4000");

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

try {
  await app.listen({ host, port });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
