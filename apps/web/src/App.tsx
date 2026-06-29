import {
  Archive,
  Bot,
  Building2,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  FileText,
  Loader2,
  Mic,
  MicOff,
  RefreshCw,
  Send,
  Settings2,
  Sparkles,
  Wand2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

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
  name: string;
}

interface AgentProfile {
  id: string;
  slug: string;
  name: string;
  department: string;
  mission: string;
  tone: string | null;
  status: string;
  allowedTasks: string[];
  approvalRules: string[];
  personalityPresetId: string | null;
  personalityPreset: PersonalityPreset | null;
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

interface ChatMessage {
  id: string;
  role: "user" | "agent" | "system" | "worker";
  content: string;
  taskId: string | null;
  artifactId: string | null;
  createdAt: string;
}

interface ConversationMessage {
  id: string;
  role: "operator" | "assistant";
  content: string;
}

type View = "ask" | "output" | "advanced";

const defaultCompanySlug = import.meta.env.VITE_DEFAULT_COMPANY_SLUG ?? "eco-fit-insulation-demo";
const starterPrompts = [
  "A homeowner says the upstairs is hot in summer and cold in winter. Help me follow up.",
  "Turn this sales call into a customer email and estimate-prep checklist.",
  "Research what I should ask before an attic insulation estimate and make it simple.",
];

export function App() {
  const [view, setView] = useState<View>(readViewFromHash());
  const [ready, setReady] = useState<ReadyState | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [company, setCompany] = useState<Company | null>(null);
  const [selectedCompany, setSelectedCompany] = useState(defaultCompanySlug);
  const [memoryEntries, setMemoryEntries] = useState<MemoryEntry[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [agents, setAgents] = useState<AgentProfile[]>([]);
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [outputFormat, setOutputFormat] = useState("Let MGWAIOS choose");
  const [researchMode, setResearchMode] = useState(false);
  const [conversation, setConversation] = useState<ConversationMessage[]>([
    {
      id: crypto.randomUUID(),
      role: "assistant",
      content:
        "Tell me what happened. I will ask for anything missing, then create the best output when you say \"call that a wrap.\"",
    },
  ]);
  const [simulationMessages, setSimulationMessages] = useState<ChatMessage[]>([]);
  const [activeArtifactId, setActiveArtifactId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [listening, setListening] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const activeArtifact = useMemo(
    () => artifacts.find((artifact) => artifact.id === activeArtifactId) ?? artifacts[0] ?? null,
    [activeArtifactId, artifacts],
  );

  const activeAgent = useMemo(
    () => agents.find((agent) => agent.id === activeAgentId) ?? agents[0] ?? null,
    [activeAgentId, agents],
  );

  const operatorMessages = useMemo(
    () => conversation.filter((message) => message.role === "operator"),
    [conversation],
  );

  useEffect(() => {
    const onHashChange = () => setView(readViewFromHash());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  useEffect(() => {
    void loadData(selectedCompany);
  }, [selectedCompany]);

  async function loadData(companySlug = selectedCompany) {
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
      ] = await Promise.all([
        fetchJson<ReadyState>("/ready"),
        fetchJson<{ companies: Company[] }>("/companies"),
        fetchJson<{ company: Company }>(`/companies/${companySlug}`),
        fetchJson<{ memoryEntries: MemoryEntry[] }>(
          `/companies/${companySlug}/memory?status=approved`,
        ),
        fetchJson<{ tasks: Task[] }>(`/companies/${companySlug}/tasks`),
        fetchJson<{ artifacts: Artifact[] }>(`/companies/${companySlug}/artifacts`),
        fetchJson<{ agents: AgentProfile[] }>(`/companies/${companySlug}/agents`),
      ]);

      setReady(readyResult);
      setCompanies(companiesResult.companies);
      setCompany(companyResult.company);
      setMemoryEntries(memoryResult.memoryEntries);
      setTasks(tasksResult.tasks);
      setArtifacts(artifactsResult.artifacts);
      setAgents(agentsResult.agents);
      setActiveArtifactId((current) =>
        current && artifactsResult.artifacts.some((artifact) => artifact.id === current)
          ? current
          : artifactsResult.artifacts[0]?.id ?? null,
      );
      setActiveAgentId((current) =>
        current && agentsResult.agents.some((agent) => agent.id === current)
          ? current
          : chooseAgent(agentsResult.agents, "sales")?.id ?? agentsResult.agents[0]?.id ?? null,
      );
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to load MGWAIOS.");
    } finally {
      setLoading(false);
    }
  }

  function navigate(nextView: View) {
    window.location.hash = nextView;
    setView(nextView);
  }

  function sendMessage(text = draft) {
    const clean = text.trim();

    if (!clean) {
      return;
    }

    const { message, shouldWrap } = splitWrapCommand(clean);
    const nextConversation = message
      ? [
          ...conversation,
          {
            id: crypto.randomUUID(),
            role: "operator" as const,
            content: message,
          },
        ]
      : conversation;

    const inferredAgent = inferAgentFromText(agents, clean);
    if (inferredAgent) {
      setActiveAgentId(inferredAgent.id);
    }

    setConversation(nextConversation);
    setDraft("");

    if (shouldWrap) {
      void createOutput(nextConversation);
      return;
    }

    setConversation([
      ...nextConversation,
      {
        id: crypto.randomUUID(),
        role: "assistant",
        content: nextQuestion(nextConversation, outputFormat, researchMode),
      },
    ]);
  }

  async function createOutput(sourceConversation = conversation) {
    if (!activeAgent) {
      setNotice("MGWAIOS is still loading the company agents.");
      return;
    }

    const operatorText = sourceConversation
      .filter((message) => message.role === "operator")
      .map((message) => message.content);

    if (operatorText.length === 0) {
      setNotice("Tell MGWAIOS what happened first.");
      return;
    }

    setWorking(true);
    setNotice(null);

    try {
      const transcript = [
        `Company: ${company?.name ?? selectedCompany}`,
        `Selected department: ${activeAgent.department}`,
        `Selected agent: ${activeAgent.name}`,
        `Research requested: ${researchMode ? "yes" : "no"}`,
        `Output preference: ${outputFormat}`,
        "",
        "Conversation:",
        ...sourceConversation.map((message) => `${message.role}: ${message.content}`),
        "",
        "Instruction: Infer the task, ask no more questions, create the most useful artifact, and respect approval rules.",
      ].join("\n");

      const result = await fetchJson<{ messages: ChatMessage[]; worker: { summary?: string; error?: string } }>(
        `/agents/${activeAgent.id}/simulations`,
        {
          method: "POST",
          body: JSON.stringify({
            requester: "simple-operator",
            message: transcript,
            expectedOutput:
              outputFormat === "Let MGWAIOS choose"
                ? "Choose the best output format for the operator."
                : outputFormat,
          }),
        },
      );

      setSimulationMessages(result.messages);
      setNotice(result.worker.error ?? result.worker.summary ?? "Output created.");
      await loadData();
      navigate("output");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to create output.");
    } finally {
      setWorking(false);
    }
  }

  function toggleVoice() {
    const SpeechRecognition = window.SpeechRecognition ?? window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setNotice("Voice is not available in this browser. You can type instead.");
      return;
    }

    if (listening) {
      setListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onerror = () => {
      setListening(false);
      setNotice("Voice capture stopped. You can keep typing.");
    };
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0]?.transcript ?? "")
        .join(" ")
        .trim();

      if (transcript) {
        setDraft((current) => `${current} ${transcript}`.trim());
      }
    };
    recognition.start();
  }

  return (
    <main className="app-frame">
      <header className="app-top">
        <button className="brand-button" type="button" onClick={() => navigate("ask")}>
          <span>
            <Sparkles size={18} />
          </span>
          <strong>MGWAIOS</strong>
        </button>

        <nav className="top-nav" aria-label="Main">
          <button className={view === "ask" ? "active" : ""} type="button" onClick={() => navigate("ask")}>
            Ask
          </button>
          <button
            className={view === "output" ? "active" : ""}
            type="button"
            onClick={() => navigate("output")}
          >
            Output
          </button>
          <button
            className={view === "advanced" ? "active" : ""}
            type="button"
            onClick={() => navigate("advanced")}
          >
            Advanced
          </button>
        </nav>

        <label className="company-pill">
          <Building2 size={16} />
          <select value={selectedCompany} onChange={(event) => setSelectedCompany(event.target.value)}>
            {companies.map((item) => (
              <option key={item.slug} value={item.slug}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
      </header>

      {notice ? <div className="toast">{notice}</div> : null}

      <section className="page-shell">
        {view === "ask" ? (
          <AskPage
            activeAgent={activeAgent}
            company={company}
            conversation={conversation}
            draft={draft}
            loading={loading}
            outputFormat={outputFormat}
            researchMode={researchMode}
            working={working}
            listening={listening}
            onCreateOutput={() => createOutput()}
            onDraftChange={setDraft}
            onFormatChange={setOutputFormat}
            onResearchChange={setResearchMode}
            onSend={() => sendMessage()}
            onStarterPrompt={sendMessage}
            onToggleVoice={toggleVoice}
          />
        ) : null}

        {view === "output" ? (
          <OutputPage
            activeArtifact={activeArtifact}
            artifacts={artifacts}
            simulationMessages={simulationMessages}
            onSelectArtifact={setActiveArtifactId}
            onBack={() => navigate("ask")}
          />
        ) : null}

        {view === "advanced" ? (
          <AdvancedPage
            agents={agents}
            company={company}
            memoryEntries={memoryEntries}
            ready={ready}
            tasks={tasks}
            onRefresh={() => loadData()}
          />
        ) : null}
      </section>
    </main>
  );
}

function AskPage(props: {
  activeAgent: AgentProfile | null;
  company: Company | null;
  conversation: ConversationMessage[];
  draft: string;
  loading: boolean;
  outputFormat: string;
  researchMode: boolean;
  working: boolean;
  listening: boolean;
  onCreateOutput: () => void;
  onDraftChange: (value: string) => void;
  onFormatChange: (value: string) => void;
  onResearchChange: (value: boolean) => void;
  onSend: () => void;
  onStarterPrompt: (value: string) => void;
  onToggleVoice: () => void;
}) {
  return (
    <section className="ask-page page-transition">
      <div className="ask-hero">
        <p>{props.company?.name ?? "Company workspace"}</p>
        <h1>What happened?</h1>
        <span>
          Say it normally. MGWAIOS will ask for missing pieces, choose the right department,
          and produce the output.
        </span>
      </div>

      <section className="conversation-card">
        <div className="conversation-strip">
          <span>
            <Bot size={16} />
            {props.activeAgent?.department ?? "Department"} assistant
          </span>
          <strong>{props.activeAgent?.name ?? "Loading..."}</strong>
        </div>

        <div className="simple-chat" aria-label="Conversation">
          {props.conversation.map((message) => (
            <article className={`message ${message.role}`} key={message.id}>
              <span>{message.role === "operator" ? "You" : "MGWAIOS"}</span>
              <p>{message.content}</p>
            </article>
          ))}
        </div>

        <div className="composer">
          <button
            className={props.listening ? "round-action listening" : "round-action"}
            type="button"
            onClick={props.onToggleVoice}
            title={props.listening ? "Stop voice capture" : "Start voice capture"}
          >
            {props.listening ? <MicOff size={20} /> : <Mic size={20} />}
          </button>
          <textarea
            value={props.draft}
            onChange={(event) => props.onDraftChange(event.target.value)}
            placeholder="Example: Hey Eco Sales, a customer called about..."
            rows={3}
            onKeyDown={(event) => {
              if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                props.onSend();
              }
            }}
          />
          <button
            className="send-action"
            type="button"
            onClick={props.onSend}
            disabled={props.working || !props.draft.trim()}
            title="Send"
          >
            <Send size={20} />
          </button>
        </div>

        <div className="intent-row">
          <label>
            Output
            <select
              value={props.outputFormat}
              onChange={(event) => props.onFormatChange(event.target.value)}
            >
              <option>Let MGWAIOS choose</option>
              <option>Customer email</option>
              <option>Internal checklist</option>
              <option>Markdown brief</option>
              <option>CSV table</option>
              <option>JSON structure</option>
              <option>HTML draft</option>
            </select>
          </label>
          <label className="toggle-row">
            <input
              checked={props.researchMode}
              type="checkbox"
              onChange={(event) => props.onResearchChange(event.target.checked)}
            />
            Research first
          </label>
          <button
            className="finish-button"
            type="button"
            onClick={props.onCreateOutput}
            disabled={props.working || props.loading}
          >
            {props.working ? <Loader2 className="spin" size={18} /> : <Wand2 size={18} />}
            Create Output
          </button>
        </div>
      </section>

      <div className="starter-grid">
        {starterPrompts.map((prompt) => (
          <button key={prompt} type="button" onClick={() => props.onStarterPrompt(prompt)}>
            {prompt}
            <ChevronRight size={16} />
          </button>
        ))}
      </div>
    </section>
  );
}

function OutputPage(props: {
  activeArtifact: Artifact | null;
  artifacts: Artifact[];
  simulationMessages: ChatMessage[];
  onSelectArtifact: (id: string) => void;
  onBack: () => void;
}) {
  return (
    <section className="output-page page-transition">
      <div className="output-header">
        <div>
          <p>Result</p>
          <h1>{props.activeArtifact?.title ?? "No output yet"}</h1>
        </div>
        <button className="ghost-button" type="button" onClick={props.onBack}>
          Ask again
        </button>
      </div>

      <div className="output-layout">
        <aside className="output-list">
          {props.artifacts.length === 0 ? <p>No saved outputs yet.</p> : null}
          {props.artifacts.map((artifact) => (
            <button key={artifact.id} type="button" onClick={() => props.onSelectArtifact(artifact.id)}>
              <strong>{artifact.title}</strong>
              <span>{artifact.reviewStatus}</span>
            </button>
          ))}
        </aside>
        <article className="output-document">
          <pre>{props.activeArtifact?.bodyMarkdown ?? "Create an output from the Ask page."}</pre>
        </article>
      </div>

      {props.simulationMessages.length > 0 ? (
        <section className="run-log">
          <h2>Run Notes</h2>
          {props.simulationMessages.map((message) => (
            <article key={message.id}>
              <strong>{message.role}</strong>
              <p>{message.content}</p>
            </article>
          ))}
        </section>
      ) : null}
    </section>
  );
}

function AdvancedPage(props: {
  agents: AgentProfile[];
  company: Company | null;
  memoryEntries: MemoryEntry[];
  ready: ReadyState | null;
  tasks: Task[];
  onRefresh: () => void;
}) {
  return (
    <section className="advanced-page page-transition">
      <div className="advanced-header">
        <div>
          <p>Advanced</p>
          <h1>System Details</h1>
        </div>
        <button className="ghost-button" type="button" onClick={props.onRefresh}>
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      <div className="advanced-grid">
        <StatusCard
          icon={<Building2 size={18} />}
          label="Company"
          value={props.company?.name ?? "Unknown"}
        />
        <StatusCard
          icon={<CheckCircle2 size={18} />}
          label="OpenAI"
          value={props.ready?.openai.hasApiKey ? "Ready" : "Missing"}
        />
        <StatusCard
          icon={<Archive size={18} />}
          label="Memory"
          value={`${props.memoryEntries.length} approved`}
        />
        <StatusCard
          icon={<ClipboardList size={18} />}
          label="Tasks"
          value={`${props.tasks.length} records`}
        />
      </div>

      <section className="advanced-section">
        <h2>Department Assistants</h2>
        <div className="simple-list">
          {props.agents.map((agent) => (
            <article key={agent.id}>
              <span>{agent.department}</span>
              <strong>{agent.name}</strong>
              <p>{agent.mission}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="advanced-section">
        <h2>Approved Company Context</h2>
        <div className="simple-list">
          {props.memoryEntries.map((entry) => (
            <article key={entry.id}>
              <span>{entry.category}</span>
              <strong>{entry.claim}</strong>
              {entry.details ? <p>{entry.details}</p> : null}
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}

function StatusCard(props: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <article className="status-card">
      <div>{props.icon}</div>
      <span>{props.label}</span>
      <strong>{props.value}</strong>
    </article>
  );
}

function chooseAgent(agents: AgentProfile[], department: string) {
  return agents.find((agent) => agent.department.toLowerCase().includes(department));
}

function inferAgentFromText(agents: AgentProfile[], text: string) {
  const clean = text.toLowerCase();

  if (clean.includes("sales") || clean.includes("estimate") || clean.includes("lead")) {
    return chooseAgent(agents, "sales");
  }

  if (clean.includes("schedule") || clean.includes("job") || clean.includes("crew")) {
    return chooseAgent(agents, "operations");
  }

  if (clean.includes("customer") || clean.includes("review") || clean.includes("follow up")) {
    return chooseAgent(agents, "customer");
  }

  if (clean.includes("owner") || clean.includes("strategy") || clean.includes("business")) {
    return chooseAgent(agents, "strategy");
  }

  return null;
}

function nextQuestion(
  conversation: ConversationMessage[],
  outputFormat: string,
  researchMode: boolean,
) {
  const text = conversation.map((message) => message.content).join(" ").toLowerCase();

  if (!text.includes("customer") && !text.includes("homeowner") && !text.includes("client")) {
    return "Who is this for: a customer, an internal team member, or the owner?";
  }

  if (!text.includes("problem") && !text.includes("issue") && !text.includes("asked")) {
    return "What is the actual issue or request they brought to you?";
  }

  if (outputFormat === "Let MGWAIOS choose") {
    return "What kind of output would help most: customer email, checklist, proposal notes, or should I choose?";
  }

  if (researchMode) {
    return "Research mode is on. Tell me what source or question you want researched before I create the output.";
  }

  return "Got it. Add any last details, then say \"call that a wrap\" or click Create Output.";
}

function splitWrapCommand(content: string): { message: string; shouldWrap: boolean } {
  const wrapPattern = /\b(call that a wrap|that's a wrap|thats a wrap|let's wrap|lets wrap|wrap it up)\b/i;
  const shouldWrap = wrapPattern.test(content);

  return {
    message: content.replace(wrapPattern, "").trim(),
    shouldWrap,
  };
}

function readViewFromHash(): View {
  const hash = window.location.hash.replace("#", "");

  if (hash === "output" || hash === "advanced") {
    return hash;
  }

  return "ask";
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
