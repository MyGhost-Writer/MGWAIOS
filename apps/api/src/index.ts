import cors from "@fastify/cors";
import Fastify from "fastify";
import { createHealthReport, mgwaiosVersion } from "@mgwaios/core";

const host = process.env.API_HOST ?? "0.0.0.0";
const port = Number(process.env.API_PORT ?? "4000");

const app = Fastify({
  logger: true,
});

await app.register(cors, {
  origin: true,
});

app.get("/health", async () => createHealthReport("api"));

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
