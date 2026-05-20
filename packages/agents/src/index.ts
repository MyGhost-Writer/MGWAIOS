import type { AgentRecipeRef, TaskPacket } from "@mgwaios/shared";
import type { MemoryEntryRecord, TaskRecord } from "@mgwaios/db";
import OpenAI from "openai";

export interface WorkerPlan {
  recipe: AgentRecipeRef;
  task: TaskPacket;
  instructions: string[];
}

export function createWorkerPlan(task: TaskPacket, recipe: AgentRecipeRef): WorkerPlan {
  return {
    task,
    recipe,
    instructions: [
      "Read the task packet.",
      "Retrieve only relevant company context.",
      "Produce the expected output.",
      "List assumptions and risks.",
      "Recommend memory updates separately from the final artifact.",
    ],
  };
}

export interface AgentRunnerConfig {
  apiKey: string;
  model: string;
}

export interface AgentRunInput {
  task: TaskRecord;
  memoryEntries: MemoryEntryRecord[];
}

export interface AgentRunOutput {
  title: string;
  bodyMarkdown: string;
  resultSummary: string;
}

export async function runTaskAgent(
  input: AgentRunInput,
  config: AgentRunnerConfig,
): Promise<AgentRunOutput> {
  const client = new OpenAI({
    apiKey: config.apiKey,
  });

  const response = await client.responses.create({
    model: config.model,
    instructions: buildInstructions(),
    input: buildTaskPrompt(input),
  });

  const modelOutput = response.output_text.trim();
  const bodyMarkdown = wrapArtifactMetadata(input.task, modelOutput);

  return {
    title: createArtifactTitle(input.task),
    bodyMarkdown,
    resultSummary: summarizeResult(modelOutput),
  };
}

function buildInstructions(): string {
  return [
    "You are a temporary MGWAIOS worker agent.",
    "Your job is to complete one scoped task using only the provided task packet and company memory.",
    "Do not claim external facts were verified unless they appear in the provided context.",
    "Write a useful Markdown artifact with clear sections.",
    "Do not restate UUIDs or database identifiers; exact metadata will be attached by the system.",
    "Include assumptions, risks, and recommended memory updates when relevant.",
    "Do not perform external actions, make commitments, or request secrets.",
  ].join("\n");
}

function buildTaskPrompt(input: AgentRunInput): string {
  const memoryText =
    input.memoryEntries.length > 0
      ? input.memoryEntries
          .map((entry) =>
            [
              `- Category: ${entry.category}`,
              `  Claim: ${entry.claim}`,
              entry.details ? `  Details: ${entry.details}` : undefined,
              `  Confidence: ${entry.confidence}`,
            ]
              .filter(Boolean)
              .join("\n"),
          )
          .join("\n")
      : "No approved memory entries were provided.";

  return [
    "# Task Packet",
    `Task ID: ${input.task.id}`,
    `Goal: ${input.task.goal}`,
    `Requested by: ${input.task.requestedBy}`,
    `Priority: ${input.task.priority}`,
    input.task.projectSlug ? `Project: ${input.task.projectSlug}` : undefined,
    input.task.expectedOutput ? `Expected output: ${input.task.expectedOutput}` : undefined,
    "",
    "# Task Context",
    JSON.stringify(input.task.context, null, 2),
    "",
    "# Approved Company Memory",
    memoryText,
    "",
    "# Output Requirements",
    "Produce the final artifact in Markdown.",
    "Keep it practical, specific, and ready for review.",
    "Do not include task IDs, company IDs, artifact IDs, or other UUIDs in your response.",
  ]
    .filter((line) => line !== undefined)
    .join("\n");
}

function wrapArtifactMetadata(task: TaskRecord, modelOutput: string): string {
  return [
    "# Agent Artifact",
    "",
    "## System Metadata",
    "",
    `- Task ID: \`${task.id}\``,
    `- Task status at run: \`${task.status}\``,
    `- Requested by: \`${task.requestedBy}\``,
    `- Priority: \`${task.priority}\``,
    task.expectedOutput ? `- Expected output: ${task.expectedOutput}` : undefined,
    "",
    "## Worker Output",
    "",
    modelOutput,
  ]
    .filter((line) => line !== undefined)
    .join("\n");
}

function createArtifactTitle(task: TaskRecord): string {
  const cleanGoal = task.goal.replace(/\s+/g, " ").trim();
  return cleanGoal.length > 72 ? `${cleanGoal.slice(0, 69)}...` : cleanGoal;
}

function summarizeResult(markdown: string): string {
  const firstMeaningfulLine = markdown
    .split("\n")
    .map((line) => line.replace(/^#+\s*/, "").trim())
    .find((line) => line.length > 0);

  return firstMeaningfulLine?.slice(0, 240) ?? "Agent produced a Markdown artifact.";
}
