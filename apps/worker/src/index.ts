import dotenv from "dotenv";
import { runTaskAgent } from "@mgwaios/agents";
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
  const task = await repository.claimNextDraftTask();

  if (!task) {
    console.log("No draft tasks found.");
    process.exit(0);
  }

  console.log(`Claimed task ${task.id}: ${task.goal}`);

  const memoryEntries = await repository.listTaskMemory(task.id);
  const output = await runTaskAgent(
    {
      task,
      memoryEntries,
    },
    {
      apiKey: openAiApiKey,
      model,
    },
  );

  const result = await repository.completeTaskWithArtifact({
    taskId: task.id,
    title: output.title,
    bodyMarkdown: output.bodyMarkdown,
    resultSummary: output.resultSummary,
    reviewStatus: "draft",
  });

  console.log(
    JSON.stringify(
      {
        status: "completed",
        taskId: result.task.id,
        artifactId: result.artifact.id,
        summary: result.task.resultSummary,
      },
      null,
      2,
    ),
  );
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await pool.end();
}
