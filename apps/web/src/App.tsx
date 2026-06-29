import {
  Activity,
  Archive,
  ArrowRight,
  Bot,
  CheckCircle2,
  ClipboardList,
  FileText,
  Loader2,
  Mic,
  MicOff,
  Play,
  Plus,
  RefreshCw,
  Search,
  Send,
  Server,
  Sparkles,
  Users,
  Wand2,
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

interface LocalConversationMessage {
  id: string;
  role: "operator" | "agent";
  content: string;
}

export function App() {
  const [ready, setReady] = useState<ReadyState | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [company, setCompany] = useState<Company | null>(null);
  const [memoryEntries, setMemoryEntries] = useState<MemoryEntry[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [agents, setAgents] = useState<AgentProfile[]>([]);
  const [personalityPresets, setPersonalityPresets] = useState<PersonalityPreset[]>([]);
  const [selectedCompany, setSelectedCompany] = useState(
    import.meta.env.VITE_DEFAULT_COMPANY_SLUG ?? "eco-fit-insulation-demo",
  );
  const [taskForm, setTaskForm] = useState(defaultTask);
  const [agentTaskForm, setAgentTaskForm] = useState(defaultAgentTask);
  const [simulationForm, setSimulationForm] = useState(defaultSimulation);
  const [simulationMessages, setSimulationMessages] = useState<ChatMessage[]>([]);
  const [operatorDraft, setOperatorDraft] = useState("");
  const [conversationMessages, setConversationMessages] = useState<LocalConversationMessage[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [workflowStage, setWorkflowStage] = useState<"agent" | "talk" | "artifact">("talk");
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

  const conversationPreview = useMemo(() => {
    if (!activeAgent || conversationMessages.length === 0) {
      return "";
    }

    return [
      `Company: ${company?.name ?? selectedCompany}`,
      `Department agent: ${activeAgent.name}`,
      `Agent mission: ${activeAgent.mission}`,
      "",
      "Operator conversation:",
      ...conversationMessages.map((message) => `${message.role}: ${message.content}`),
      "",
      "Create the most useful artifact for this situation. Use approved company memory, respect approval rules, and choose the best format unless the operator asked for a specific one.",
    ].join("\n");
  }, [activeAgent, company?.name, conversationMessages, selectedCompany]);

  const agentCallsign = useMemo(() => {
    if (!activeAgent) {
      return "Hey agent";
    }

    const companyWord = company?.name.toLowerCase().includes("eco") ? "Eco" : "Company";
    const departmentWord = activeAgent.department.split(/\s+/)[0] ?? activeAgent.department;

    return `Hey ${companyWord} ${departmentWord}`;
  }, [activeAgent, company?.name]);

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
          : agentsResult.agents.find((agent) => agent.department.toLowerCase().includes("sales"))
              ?.id ??
            agentsResult.agents[0]?.id ??
            null,
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

  function addOperatorMessage(content: string) {
    const clean = content.trim();

    if (!clean) {
      return;
    }

    const { message, shouldWrap } = splitWrapCommand(clean);

    if (message) {
      setConversationMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "operator",
          content: message,
        },
      ]);
    }

    setOperatorDraft("");
    setWorkflowStage("talk");

    if (shouldWrap) {
      void runConversationSimulation(message);
      return;
    }

    if (activeAgent) {
      setConversationMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "agent",
          content: `Got it. I am holding that context for ${activeAgent.department}. Add anything else, then say "call that a wrap" when you want me to create the artifact.`,
        },
      ]);
    }
  }

  async function runConversationSimulation(finalMessage?: string) {
    if (!activeAgent) {
      setNotice("Select an agent first.");
      return;
    }

    const messages = finalMessage?.trim()
      ? [
          ...conversationMessages,
          {
            id: crypto.randomUUID(),
            role: "operator" as const,
            content: finalMessage.trim(),
          },
        ]
      : conversationMessages;

    if (messages.filter((message) => message.role === "operator").length === 0) {
      setNotice("Tell the agent the story first.");
      return;
    }

    setWorking(true);
    setNotice(null);

    try {
      const transcript = [
        `Company: ${company?.name ?? selectedCompany}`,
        `Department agent: ${activeAgent.name}`,
        `Agent mission: ${activeAgent.mission}`,
        `Agent approval rules: ${activeAgent.approvalRules.join("; ") || "None listed"}`,
        "",
        "Operator conversation:",
        ...messages.map((message) => `${message.role}: ${message.content}`),
        "",
        "Instruction: Create the most useful artifact for this situation. Infer the task, choose the best output format, and do not make commitments that require owner approval.",
      ].join("\n");

      const result = await fetchJson<{ messages: ChatMessage[]; worker: { summary?: string; error?: string } }>(
        `/agents/${activeAgent.id}/simulations`,
        {
          method: "POST",
          body: JSON.stringify({
            requester: "workflow",
            message: transcript,
            expectedOutput: simulationForm.expectedOutput || "Best-fit artifact based on the conversation.",
          }),
        },
      );

      setSimulationMessages(result.messages);
      setConversationMessages([]);
      setSimulationForm(defaultSimulation);
      setWorkflowStage("artifact");
      setNotice(result.worker.error ?? result.worker.summary ?? "Artifact created from conversation.");
      await loadDashboard();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to create artifact.");
    } finally {
      setWorking(false);
    }
  }

  function toggleVoiceCapture() {
    const BrowserSpeechRecognition =
      window.SpeechRecognition ?? window.webkitSpeechRecognition;

    if (!BrowserSpeechRecognition) {
      setNotice("Voice capture is not available in this browser. Type the story instead.");
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    const recognition = new BrowserSpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.continuous = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => {
      setIsListening(false);
      setNotice("Voice capture stopped. You can keep typing if needed.");
    };
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0]?.transcript ?? "")
        .join(" ")
        .trim();

      if (transcript) {
        setOperatorDraft((current) => `${current} ${transcript}`.trim());
      }
    };

    recognition.start();
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
          <a className="nav-item active" href="#workflow">
            <Wand2 size={17} />
            Workflow
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
          <a className="nav-item" href="#tasks">
            <ClipboardList size={17} />
            Tasks
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
              Tell a department agent the story. MGWAIOS turns the conversation into a task,
              runs the worker, and saves the artifact.
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

        <section className="workflow-panel" id="workflow">
          <div className="workflow-steps" aria-label="Task workflow">
            <button
              className={workflowStage === "agent" ? "workflow-step active" : "workflow-step"}
              type="button"
              onClick={() => setWorkflowStage("agent")}
            >
              <span>1</span>
              Pick agent
            </button>
            <ArrowRight size={17} />
            <button
              className={workflowStage === "talk" ? "workflow-step active" : "workflow-step"}
              type="button"
              onClick={() => setWorkflowStage("talk")}
            >
              <span>2</span>
              Tell the story
            </button>
            <ArrowRight size={17} />
            <button
              className={workflowStage === "artifact" ? "workflow-step active" : "workflow-step"}
              type="button"
              onClick={() => setWorkflowStage("artifact")}
            >
              <span>3</span>
              Review artifact
            </button>
          </div>

          <div className="workflow-layout">
            <section className="agent-picker" id="agents">
              <div className="panel-header compact">
                <h2>Department Agent</h2>
                <Users size={19} />
              </div>
              <div className="agent-card-grid compact-grid">
                {agents.map((agent) => (
                  <button
                    className={agent.id === activeAgent?.id ? "agent-card active" : "agent-card"}
                    key={agent.id}
                    type="button"
                    onClick={() => {
                      setActiveAgentId(agent.id);
                      setWorkflowStage("talk");
                    }}
                  >
                    <span>{agent.department}</span>
                    <strong>{agent.name}</strong>
                    <small>{agent.personalityPreset?.name ?? "No personality"}</small>
                  </button>
                ))}
              </div>

              {activeAgent ? (
                <div className="agent-mini">
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
                  <p>{activeAgent.mission}</p>
                </div>
              ) : null}
            </section>

            <section className="conversation-workspace">
              <div className="conversation-header">
                <div>
                  <p className="eyebrow">{agentCallsign}</p>
                  <h2>{activeAgent?.name ?? "Choose an agent"}</h2>
                  <p>
                    Talk naturally. When the story is complete, type or say
                    <strong> call that a wrap</strong> to generate the artifact.
                  </p>
                </div>
                <Bot size={22} />
              </div>

              <div className="chat-window" aria-label="Agent conversation">
                {conversationMessages.length === 0 ? (
                  <div className="empty-chat">
                    <Sparkles size={24} />
                    <strong>Start with the real-world story.</strong>
                    <p>
                      Example: A homeowner called about an upstairs room that is hot in summer
                      and cold in winter. Ask Eco Sales to prepare the follow-up.
                    </p>
                  </div>
                ) : (
                  conversationMessages.map((message) => (
                    <article className={`talk-bubble ${message.role}`} key={message.id}>
                      <span>{message.role === "operator" ? "You" : activeAgent?.name}</span>
                      <p>{message.content}</p>
                    </article>
                  ))
                )}
              </div>

              <div className="voice-bar">
                <button
                  className={isListening ? "voice-button listening" : "voice-button"}
                  type="button"
                  onClick={toggleVoiceCapture}
                  title={isListening ? "Stop voice capture" : "Start voice capture"}
                >
                  {isListening ? <MicOff size={18} /> : <Mic size={18} />}
                  {isListening ? "Listening" : "Voice"}
                </button>
                <textarea
                  value={operatorDraft}
                  onChange={(event) => setOperatorDraft(event.target.value)}
                  placeholder={`${agentCallsign}, a customer just told me...`}
                  rows={3}
                />
                <button
                  className="send-button"
                  type="button"
                  onClick={() => addOperatorMessage(operatorDraft)}
                  disabled={working || !operatorDraft.trim()}
                  title="Send message"
                >
                  <Send size={18} />
                </button>
              </div>

              <div className="wrap-row">
                <label>
                  Output preference
                  <input
                    value={simulationForm.expectedOutput}
                    onChange={(event) =>
                      setSimulationForm({ ...simulationForm, expectedOutput: event.target.value })
                    }
                    placeholder="Optional: customer email, markdown brief, CSV, JSON, HTML"
                  />
                </label>
                <button
                  className="primary-button"
                  type="button"
                  onClick={() => runConversationSimulation()}
                  disabled={working || conversationMessages.length === 0}
                >
                  {working ? <Loader2 className="spin" size={17} /> : <Wand2 size={17} />}
                  Call That a Wrap
                </button>
              </div>
            </section>

            <aside className="workflow-context">
              <section className="context-box">
                <h3>What the agent knows</h3>
                <div className="mini-memory-list">
                  {memoryEntries.slice(0, 4).map((entry) => (
                    <article key={entry.id}>
                      <span>{entry.category}</span>
                      <p>{entry.claim}</p>
                    </article>
                  ))}
                </div>
              </section>
              <section className="context-box">
                <h3>Current artifact</h3>
                <strong>{activeArtifact?.title ?? "No artifact yet"}</strong>
                <p>{activeArtifact?.reviewStatus ?? "Run a conversation to create one."}</p>
              </section>
            </aside>
          </div>
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
              <pre>
                {activeArtifact?.bodyMarkdown ??
                  (conversationPreview ||
                    "Tell an agent a story, then call that a wrap to generate an artifact.")}
              </pre>
            </article>
          </div>
        </section>

        <section className="panel agents-panel legacy-panel" id="agent-settings">
          <div className="panel-header">
            <div>
              <h2>Agent Settings</h2>
              <p>
                Advanced setup for personalities, allowed tasks, approval rules, and direct simulations.
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

function splitWrapCommand(content: string): { message: string; shouldWrap: boolean } {
  const wrapPattern = /\b(call that a wrap|that's a wrap|thats a wrap|let's wrap|lets wrap|wrap it up)\b/i;
  const shouldWrap = wrapPattern.test(content);

  return {
    message: content.replace(wrapPattern, "").trim(),
    shouldWrap,
  };
}

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }

  interface SpeechRecognitionConstructor {
    new (): SpeechRecognition;
  }

  interface SpeechRecognition extends EventTarget {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    onend: (() => void) | null;
    onerror: (() => void) | null;
    onresult: ((event: SpeechRecognitionEvent) => void) | null;
    onstart: (() => void) | null;
    start(): void;
  }

  interface SpeechRecognitionEvent {
    results: SpeechRecognitionResultList;
  }
}
