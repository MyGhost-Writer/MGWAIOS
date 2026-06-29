import {
  Activity,
  Archive,
  Bot,
  CheckCircle2,
  ClipboardList,
  FileText,
  Loader2,
  Play,
  Plus,
  RefreshCw,
  Search,
  Server,
  Sparkles,
  Users,
} from "lucide-react";
import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:4000";

interface Company {
  id: string;
  slug: string;
  name: string;
  industry: string | null;
  description: string | null;
  status: string;
}

interface MemoryEntry {
  id: string;
  category: string;
  claim: string;
  details: string | null;
  confidence: string;
  status: string;
  createdAt: string;
}

interface Task {
  id: string;
  goal: string;
  status: string;
  priority: string;
  requestedBy: string;
  agentProfileId: string | null;
  expectedOutput: string | null;
  resultSummary: string | null;
  createdAt: string;
}

interface PersonalityPreset {
  id: string;
  slug: string;
  name: string;
  description: string;
  tone: string;
  behaviorNotes: string;
}

interface AgentProfile {
  id: string;
  slug: string;
  name: string;
  department: string;
  mission: string;
  tone: string | null;
  status: string;
  memoryScope: string;
  allowedTasks: string[];
  approvalRules: string[];
  personalityPresetId: string | null;
  personalityPreset: PersonalityPreset | null;
}

interface ChatMessage {
  id: string;
  role: "user" | "agent" | "system" | "worker";
  content: string;
  taskId: string | null;
  artifactId: string | null;
  createdAt: string;
}

interface Artifact {
  id: string;
  taskId: string | null;
  artifactType: string;
  title: string;
  bodyMarkdown: string | null;
  reviewStatus: string;
  createdAt: string;
}

interface ReadyState {
  service: string;
  status: string;
  database: {
    hasDatabaseUrl: boolean;
    hasServiceRoleKey: boolean;
  };
  telegram: {
    hasBotToken: boolean;
  };
  openai: {
    hasApiKey: boolean;
  };
}

const defaultTask = {
  goal: "",
  expectedOutput: "A concise Markdown artifact ready for review.",
  priority: "normal",
};

const defaultAgentTask = {
  goal: "",
  expectedOutput: "A concise Markdown artifact ready for review.",
  priority: "normal",
};

const defaultSimulation = {
  message: "",
  expectedOutput: "",
};

export function App() {
  const [ready, setReady] = useState<ReadyState | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [company, setCompany] = useState<Company | null>(null);
  const [memoryEntries, setMemoryEntries] = useState<MemoryEntry[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [agents, setAgents] = useState<AgentProfile[]>([]);
  const [personalityPresets, setPersonalityPresets] = useState<PersonalityPreset[]>([]);
  const [selectedCompany, setSelectedCompany] = useState("mgwai-llc");
  const [taskForm, setTaskForm] = useState(defaultTask);
  const [agentTaskForm, setAgentTaskForm] = useState(defaultAgentTask);
  const [simulationForm, setSimulationForm] = useState(defaultSimulation);
  const [simulationMessages, setSimulationMessages] = useState<ChatMessage[]>([]);
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null);
  const [activeArtifactId, setActiveArtifactId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const activeArtifact = useMemo(
    () => artifacts.find((artifact) => artifact.id === activeArtifactId) ?? artifacts[0],
    [activeArtifactId, artifacts],
  );

  const activeAgent = useMemo(
    () => agents.find((agent) => agent.id === activeAgentId) ?? agents[0],
    [activeAgentId, agents],
  );

  const taskCounts = useMemo(
    () =>
      tasks.reduce(
        (counts, task) => {
          counts[task.status] = (counts[task.status] ?? 0) + 1;
          return counts;
        },
        {} as Record<string, number>,
      ),
    [tasks],
  );

  async function loadDashboard(companySlug = selectedCompany) {
    setLoading(true);
    setNotice(null);

    try {
      const [
        readyResult,
        companiesResult,
        companyResult,
        memoryResult,
        tasksResult,
        artifactsResult,
        agentsResult,
        presetsResult,
      ] =
        await Promise.all([
          fetchJson<ReadyState>("/ready"),
          fetchJson<{ companies: Company[] }>("/companies"),
          fetchJson<{ company: Company }>(`/companies/${companySlug}`),
          fetchJson<{ memoryEntries: MemoryEntry[] }>(
            `/companies/${companySlug}/memory?status=approved`,
          ),
          fetchJson<{ tasks: Task[] }>(`/companies/${companySlug}/tasks`),
          fetchJson<{ artifacts: Artifact[] }>(`/companies/${companySlug}/artifacts`),
          fetchJson<{ agents: AgentProfile[] }>(`/companies/${companySlug}/agents`),
          fetchJson<{ personalityPresets: PersonalityPreset[] }>("/personality-presets"),
        ]);

      setReady(readyResult);
      setCompanies(companiesResult.companies);
      setCompany(companyResult.company);
      setMemoryEntries(memoryResult.memoryEntries);
      setTasks(tasksResult.tasks);
      setArtifacts(artifactsResult.artifacts);
      setAgents(agentsResult.agents);
      setPersonalityPresets(presetsResult.personalityPresets);
      setActiveArtifactId((current) =>
        current && artifactsResult.artifacts.some((artifact) => artifact.id === current)
          ? current
          : artifactsResult.artifacts[0]?.id ?? null,
      );
      setActiveAgentId((current) =>
        current && agentsResult.agents.some((agent) => agent.id === current)
          ? current
          : agentsResult.agents[0]?.id ?? null,
      );
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to load dashboard.");
    } finally {
      setLoading(false);
    }
  }

  async function createTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!taskForm.goal.trim()) {
      setNotice("Task goal is required.");
      return;
    }

    setWorking(true);
    setNotice(null);

    try {
      await fetchJson(`/companies/${selectedCompany}/tasks`, {
        method: "POST",
        body: JSON.stringify({
          requestedBy: "dashboard",
          goal: taskForm.goal,
          priority: taskForm.priority,
          expectedOutput: taskForm.expectedOutput,
          context: {
            source: "dashboard",
          },
        }),
      });
      setTaskForm(defaultTask);
      setNotice("Task created.");
      await loadDashboard();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to create task.");
    } finally {
      setWorking(false);
    }
  }

  async function runNextWorker() {
    setWorking(true);
    setNotice(null);

    try {
      const result = await fetchJson<{ worker: { status: string; summary?: string; error?: string } }>(
        "/worker/run-next",
        {
          method: "POST",
          body: JSON.stringify({}),
        },
      );

      setNotice(result.worker.error ?? result.worker.summary ?? `Worker status: ${result.worker.status}`);
      await loadDashboard();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to run worker.");
    } finally {
      setWorking(false);
    }
  }

  async function updateAgentPersonality(personalityPresetId: string) {
    if (!activeAgent) {
      return;
    }

    setWorking(true);
    setNotice(null);

    try {
      await fetchJson(`/agents/${activeAgent.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          personalityPresetId,
        }),
      });
      setNotice("Agent personality updated.");
      await loadDashboard();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to update agent.");
    } finally {
      setWorking(false);
    }
  }

  async function createAgentTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!activeAgent) {
      setNotice("Select an agent first.");
      return;
    }

    if (!agentTaskForm.goal.trim()) {
      setNotice("Agent task goal is required.");
      return;
    }

    setWorking(true);
    setNotice(null);

    try {
      await fetchJson(`/agents/${activeAgent.id}/tasks`, {
        method: "POST",
        body: JSON.stringify({
          requestedBy: "dashboard",
          goal: agentTaskForm.goal,
          priority: agentTaskForm.priority,
          expectedOutput: agentTaskForm.expectedOutput,
          context: {
            source: "agent-console",
          },
        }),
      });
      setAgentTaskForm(defaultAgentTask);
      setNotice(`Task created for ${activeAgent.name}.`);
      await loadDashboard();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to create agent task.");
    } finally {
      setWorking(false);
    }
  }

  async function runSimulation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!activeAgent) {
      setNotice("Select an agent first.");
      return;
    }

    if (!simulationForm.message.trim()) {
      setNotice("Simulation message is required.");
      return;
    }

    setWorking(true);
    setNotice(null);

    try {
      const result = await fetchJson<{ messages: ChatMessage[]; worker: { summary?: string; error?: string } }>(
        `/agents/${activeAgent.id}/simulations`,
        {
          method: "POST",
          body: JSON.stringify({
            requester: "dashboard",
            message: simulationForm.message,
            expectedOutput: simulationForm.expectedOutput || undefined,
          }),
        },
      );

      setSimulationMessages(result.messages);
      setSimulationForm(defaultSimulation);
      setNotice(result.worker.error ?? result.worker.summary ?? "Simulation completed.");
      await loadDashboard();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to run simulation.");
    } finally {
      setWorking(false);
    }
  }

  useEffect(() => {
    void loadDashboard(selectedCompany);
  }, [selectedCompany]);

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <Sparkles size={20} />
          </div>
          <div>
            <strong>MGWAIOS</strong>
            <span>Company OS</span>
          </div>
        </div>

        <nav className="nav-list" aria-label="Dashboard sections">
          <a className="nav-item active" href="#tasks">
            <ClipboardList size={17} />
            Tasks
          </a>
          <a className="nav-item" href="#agents">
            <Users size={17} />
            Agents
          </a>
          <a className="nav-item" href="#memory">
            <Archive size={17} />
            Memory
          </a>
          <a className="nav-item" href="#artifacts">
            <FileText size={17} />
            Artifacts
          </a>
          <a className="nav-item" href="#runtime">
            <Server size={17} />
            Runtime
          </a>
        </nav>

        <section className="company-switcher">
          <label htmlFor="company">Company</label>
          <select
            id="company"
            value={selectedCompany}
            onChange={(event) => setSelectedCompany(event.target.value)}
          >
            {companies.length === 0 ? <option value="mgwai-llc">MGWAI LLC</option> : null}
            {companies.map((item) => (
              <option key={item.slug} value={item.slug}>
                {item.name}
              </option>
            ))}
          </select>
        </section>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">Control room</p>
            <h1>{company?.name ?? "MGWAI LLC"}</h1>
            <p className="subhead">
              {company?.description ?? "Company-aware tasks, memory, artifacts, and worker runs."}
            </p>
          </div>
          <div className="topbar-actions">
            <button className="icon-button" type="button" onClick={() => loadDashboard()} title="Refresh">
              <RefreshCw size={18} />
            </button>
            <button className="primary-button" type="button" onClick={runNextWorker} disabled={working}>
              {working ? <Loader2 className="spin" size={18} /> : <Play size={18} />}
              Run Worker
            </button>
          </div>
        </header>

        {notice ? <div className="notice">{notice}</div> : null}

        <section className="metric-grid" aria-label="System metrics">
          <Metric icon={<ClipboardList size={18} />} label="Draft" value={taskCounts.draft ?? 0} />
          <Metric icon={<Activity size={18} />} label="Running" value={taskCounts.running ?? 0} />
          <Metric icon={<CheckCircle2 size={18} />} label="Completed" value={taskCounts.completed ?? 0} />
          <Metric icon={<Archive size={18} />} label="Memory" value={memoryEntries.length} />
          <Metric icon={<Users size={18} />} label="Agents" value={agents.length} />
        </section>

        <section className="panel agents-panel" id="agents">
          <div className="panel-header">
            <div>
              <h2>Department Agents</h2>
              <p>
                Persistent department heads with selectable personalities. Worker agents are still spun
                up per task.
              </p>
            </div>
            <Users size={20} />
          </div>

          <div className="agents-layout">
            <div className="agent-card-grid">
              {agents.map((agent) => (
                <button
                  className={agent.id === activeAgent?.id ? "agent-card active" : "agent-card"}
                  key={agent.id}
                  type="button"
                  onClick={() => setActiveAgentId(agent.id)}
                >
                  <span>{agent.department}</span>
                  <strong>{agent.name}</strong>
                  <small>{agent.personalityPreset?.name ?? "No personality"}</small>
                </button>
              ))}
            </div>

            <div className="agent-detail">
              <div className="agent-heading">
                <div>
                  <h3>{activeAgent?.name ?? "No agent selected"}</h3>
                  <p>{activeAgent?.mission ?? "Seed agent profiles to begin."}</p>
                </div>
                <span className="agent-status">{activeAgent?.status ?? "unknown"}</span>
              </div>

              {activeAgent ? (
                <>
                  <div className="agent-editor-grid">
                    <label>
                      Personality
                      <select
                        value={activeAgent.personalityPresetId ?? ""}
                        onChange={(event) => updateAgentPersonality(event.target.value)}
                        disabled={working}
                      >
                        {personalityPresets.map((preset) => (
                          <option key={preset.id} value={preset.id}>
                            {preset.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Tone
                      <input value={activeAgent.tone ?? ""} readOnly />
                    </label>
                  </div>

                  <div className="agent-rules">
                    <div>
                      <h4>Allowed Tasks</h4>
                      <div className="chips">
                        {activeAgent.allowedTasks.map((task) => (
                          <span key={task}>{task}</span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4>Approval Rules</h4>
                      <ul>
                        {activeAgent.approvalRules.map((rule) => (
                          <li key={rule}>{rule}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <form className="task-form agent-task-form" onSubmit={createAgentTask}>
                    <label>
                      Create task as {activeAgent.name}
                      <textarea
                        value={agentTaskForm.goal}
                        onChange={(event) =>
                          setAgentTaskForm({ ...agentTaskForm, goal: event.target.value })
                        }
                        placeholder="Draft a sales follow-up using this agent's personality and approval rules"
                        rows={3}
                      />
                    </label>
                    <div className="form-row">
                      <label>
                        Priority
                        <select
                          value={agentTaskForm.priority}
                          onChange={(event) =>
                            setAgentTaskForm({ ...agentTaskForm, priority: event.target.value })
                          }
                        >
                          <option value="low">Low</option>
                          <option value="normal">Normal</option>
                          <option value="high">High</option>
                          <option value="urgent">Urgent</option>
                        </select>
                      </label>
                      <label>
                        Output
                        <input
                          value={agentTaskForm.expectedOutput}
                          onChange={(event) =>
                            setAgentTaskForm({
                              ...agentTaskForm,
                              expectedOutput: event.target.value,
                            })
                          }
                        />
                      </label>
                    </div>
                    <button className="secondary-button" type="submit" disabled={working}>
                      <Plus size={17} />
                      Create Agent Task
                    </button>
                  </form>

                  <form className="simulation-console" onSubmit={runSimulation}>
                    <div className="panel-header compact">
                      <h4>Simulation Chat</h4>
                      <Bot size={18} />
                    </div>
                    <label>
                      Message {activeAgent.name}
                      <textarea
                        value={simulationForm.message}
                        onChange={(event) =>
                          setSimulationForm({ ...simulationForm, message: event.target.value })
                        }
                        placeholder="Engineer, design a safe onboarding workflow and produce the best artifact format."
                        rows={4}
                      />
                    </label>
                    <label>
                      Optional output guidance
                      <input
                        value={simulationForm.expectedOutput}
                        onChange={(event) =>
                          setSimulationForm({
                            ...simulationForm,
                            expectedOutput: event.target.value,
                          })
                        }
                        placeholder="Markdown brief, JSON schema, CSV table, HTML draft"
                      />
                    </label>
                    <button className="primary-button" type="submit" disabled={working}>
                      {working ? <Loader2 className="spin" size={17} /> : <Play size={17} />}
                      Run Simulation
                    </button>

                    {simulationMessages.length > 0 ? (
                      <div className="chat-transcript">
                        {simulationMessages.map((message) => (
                          <article className={`chat-message ${message.role}`} key={message.id}>
                            <span>{message.role}</span>
                            <p>{message.content}</p>
                            {message.artifactId ? <small>Artifact saved</small> : null}
                          </article>
                        ))}
                      </div>
                    ) : null}
                  </form>
                </>
              ) : null}
            </div>
          </div>
        </section>

        <section className="main-grid">
          <section className="panel task-panel" id="tasks">
            <div className="panel-header">
              <div>
                <h2>Task Inbox</h2>
                <p>{loading ? "Loading tasks..." : `${tasks.length} task records`}</p>
              </div>
              <Bot size={20} />
            </div>

            <form className="task-form" onSubmit={createTask}>
              <label>
                Goal
                <textarea
                  value={taskForm.goal}
                  onChange={(event) => setTaskForm({ ...taskForm, goal: event.target.value })}
                  placeholder="Draft a proposal follow-up for the new software client"
                  rows={4}
                />
              </label>
              <div className="form-row">
                <label>
                  Priority
                  <select
                    value={taskForm.priority}
                    onChange={(event) => setTaskForm({ ...taskForm, priority: event.target.value })}
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </label>
                <label>
                  Output
                  <input
                    value={taskForm.expectedOutput}
                    onChange={(event) =>
                      setTaskForm({ ...taskForm, expectedOutput: event.target.value })
                    }
                  />
                </label>
              </div>
              <button className="secondary-button" type="submit" disabled={working}>
                <Plus size={17} />
                Create Task
              </button>
            </form>

            <div className="record-list">
              {tasks.map((task) => (
                <article className="task-row" key={task.id}>
                  <div className="row-title">
                    <span className={`status-dot ${task.status}`} />
                    <strong>{task.goal}</strong>
                  </div>
                  <p>{task.resultSummary ?? task.expectedOutput ?? "No result yet."}</p>
                  <div className="chips">
                    <span>{task.status}</span>
                    <span>{task.priority}</span>
                    <span>{new Date(task.createdAt).toLocaleString()}</span>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="side-stack">
            <section className="panel" id="runtime">
              <div className="panel-header compact">
                <h2>Runtime</h2>
                <Server size={19} />
              </div>
              <div className="runtime-grid">
                <RuntimeItem label="API" value={ready?.status ?? "unknown"} />
                <RuntimeItem label="Database" value={ready?.database.hasDatabaseUrl ? "connected" : "missing"} />
                <RuntimeItem label="OpenAI" value={ready?.openai.hasApiKey ? "ready" : "missing"} />
                <RuntimeItem label="Telegram" value={ready?.telegram.hasBotToken ? "ready" : "not set"} />
              </div>
            </section>

            <section className="panel" id="memory">
              <div className="panel-header compact">
                <h2>Approved Memory</h2>
                <Search size={19} />
              </div>
              <div className="record-list tight">
                {memoryEntries.map((entry) => (
                  <article className="memory-row" key={entry.id}>
                    <div className="chips">
                      <span>{entry.category}</span>
                      <span>{entry.confidence}</span>
                    </div>
                    <strong>{entry.claim}</strong>
                    {entry.details ? <p>{entry.details}</p> : null}
                  </article>
                ))}
              </div>
            </section>
          </section>
        </section>

        <section className="panel artifact-panel" id="artifacts">
          <div className="panel-header">
            <div>
              <h2>Artifacts</h2>
              <p>{artifacts.length} saved worker outputs</p>
            </div>
            <FileText size={20} />
          </div>
          <div className="artifact-layout">
            <div className="artifact-list">
              {artifacts.map((artifact) => (
                <button
                  className={artifact.id === activeArtifact?.id ? "artifact-tab active" : "artifact-tab"}
                  key={artifact.id}
                  type="button"
                  onClick={() => setActiveArtifactId(artifact.id)}
                >
                  <strong>{artifact.title}</strong>
                  <span>{artifact.reviewStatus}</span>
                </button>
              ))}
            </div>
            <article className="artifact-preview">
              <h3>{activeArtifact?.title ?? "No artifact selected"}</h3>
              <pre>{activeArtifact?.bodyMarkdown ?? "Create and run a task to generate an artifact."}</pre>
            </article>
          </div>
        </section>
      </section>
    </main>
  );
}

function Metric(props: { icon: ReactNode; label: string; value: number }) {
  return (
    <article className="metric">
      <div>{props.icon}</div>
      <span>{props.label}</span>
      <strong>{props.value}</strong>
    </article>
  );
}

function RuntimeItem(props: { label: string; value: string }) {
  return (
    <div className="runtime-item">
      <span>{props.label}</span>
      <strong>{props.value}</strong>
    </div>
  );
}

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
    ...init,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.message ?? `Request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}
