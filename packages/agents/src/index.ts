import type { AgentRecipeRef, TaskPacket } from "@mgwaios/shared";

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
