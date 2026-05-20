import dotenv from "dotenv";
import { runNextTask } from "@mgwaios/agents";
import { createHealthReport } from "@mgwaios/core";
import { CompanyOsRepository, createPostgresPool } from "@mgwaios/db";

dotenv.config({ path: "../../.env.local", quiet: true });
dotenv.config({ path: ".env.local", quiet: true });
dotenv.config({ quiet: true });

const report = createHealthReport("worker");
console.log(JSON.stringify(report, null, 2));

const openAiApiKey = process.env.OPENAI_API_KEY;
const model = process.env.OPENAI_MODEL ?? "gpt-5.2";

if (!openAiApiKey) {
  throw new Error("OPENAI_API_KEY is required to run the worker.");
}

const pool = createPostgresPool();
const repository = new CompanyOsRepository(pool);

try {
  const result = await runNextTask(repository, {
    apiKey: openAiApiKey,
    model,
  });

  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await pool.end();
}
