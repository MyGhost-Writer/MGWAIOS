export type CompanySlug = string;

export type DepartmentSlug = string;

export type AgentRecipeSlug = string;

export type TaskStatus =
  | "draft"
  | "queued"
  | "running"
  | "needs_review"
  | "completed"
  | "failed";

export interface CompanyRef {
  slug: CompanySlug;
  name: string;
}

export interface AgentRecipeRef {
  slug: AgentRecipeSlug;
  name: string;
  department: DepartmentSlug;
}

export interface TaskPacket {
  id: string;
  company: CompanyRef;
  goal: string;
  status: TaskStatus;
  requestedBy: string;
  createdAt: string;
  agentRecipe?: AgentRecipeRef;
  constraints: string[];
  expectedOutput: string;
}

export interface MemorySource {
  system: string;
  title: string;
  objectId?: string;
  url?: string;
  observedAt: string;
}

export interface MemoryEntry {
  id: string;
  company: CompanyRef;
  category: string;
  claim: string;
  confidence: "low" | "medium" | "high";
  source: MemorySource;
}
