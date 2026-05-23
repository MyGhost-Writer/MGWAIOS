create table if not exists public.personality_presets (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null,
  tone text not null,
  behavior_notes text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.agent_profiles (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  personality_preset_id uuid references public.personality_presets(id) on delete set null,
  slug text not null,
  name text not null,
  department text not null,
  mission text not null,
  tone text,
  status text not null default 'active',
  memory_scope text not null default 'company',
  allowed_tasks text[] not null default '{}'::text[],
  approval_rules text[] not null default '{}'::text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(company_id, slug)
);

create index if not exists agent_profiles_company_id_idx on public.agent_profiles(company_id);
create index if not exists agent_profiles_department_idx on public.agent_profiles(department);
create index if not exists agent_profiles_personality_preset_id_idx
  on public.agent_profiles(personality_preset_id);

drop trigger if exists set_personality_presets_updated_at on public.personality_presets;
create trigger set_personality_presets_updated_at
before update on public.personality_presets
for each row execute function public.set_updated_at();

drop trigger if exists set_agent_profiles_updated_at on public.agent_profiles;
create trigger set_agent_profiles_updated_at
before update on public.agent_profiles
for each row execute function public.set_updated_at();

alter table public.tasks
add column if not exists agent_profile_id uuid references public.agent_profiles(id) on delete set null;

create index if not exists tasks_agent_profile_id_idx on public.tasks(agent_profile_id);

insert into public.personality_presets (slug, name, description, tone, behavior_notes)
values
  (
    'operator',
    'Operator',
    'Execution-focused and practical. Turns ambiguity into next actions.',
    'direct, calm, action-oriented',
    'Prioritize clarity, sequencing, ownership, and immediate usefulness.'
  ),
  (
    'strategist',
    'Strategist',
    'Big-picture thinker focused on leverage, positioning, and tradeoffs.',
    'thoughtful, decisive, executive',
    'Connect work to business outcomes and call out strategic risk.'
  ),
  (
    'concierge',
    'Concierge',
    'Warm, polished, customer-facing, and service-minded.',
    'warm, confident, polished',
    'Protect customer experience and make communication feel easy.'
  ),
  (
    'analyst',
    'Analyst',
    'Evidence-based and careful. Classifies information and identifies gaps.',
    'precise, neutral, investigative',
    'Separate facts from assumptions and preserve source awareness.'
  ),
  (
    'builder',
    'Builder',
    'Technical, implementation-focused, and comfortable turning plans into systems.',
    'clear, technical, practical',
    'Prefer working software, explicit constraints, and testable outputs.'
  ),
  (
    'coach',
    'Coach',
    'Patient, training-focused, and good at helping people understand.',
    'encouraging, clear, patient',
    'Explain without condescension and turn knowledge into repeatable learning.'
  ),
  (
    'controller',
    'Controller',
    'Risk-aware, finance-minded, and conservative with approvals.',
    'measured, careful, policy-minded',
    'Highlight approval gates, cost risk, compliance risk, and audit needs.'
  )
on conflict (slug) do update
set
  name = excluded.name,
  description = excluded.description,
  tone = excluded.tone,
  behavior_notes = excluded.behavior_notes;

with mgwai as (
  select id from public.companies where slug = 'mgwai-llc'
),
presets as (
  select id, slug from public.personality_presets
)
insert into public.agent_profiles (
  company_id,
  personality_preset_id,
  slug,
  name,
  department,
  mission,
  tone,
  memory_scope,
  allowed_tasks,
  approval_rules
)
select
  mgwai.id,
  presets.id,
  agent.slug,
  agent.name,
  agent.department,
  agent.mission,
  agent.tone,
  'company',
  agent.allowed_tasks,
  agent.approval_rules
from mgwai
join (
  values
    (
      'strategy-agent',
      'Strategy Agent',
      'Strategy',
      'Clarify priorities, evaluate opportunities, and turn MGWAI ideas into focused roadmaps.',
      'executive, decisive, pragmatic',
      'strategist',
      array['roadmap planning', 'offer design', 'market framing', 'decision briefs'],
      array['Owner approval required for pricing, positioning, and major roadmap changes']
    ),
    (
      'sales-agent',
      'Sales Agent',
      'Sales',
      'Turn leads and client conversations into scoped proposals, follow-ups, and task packets.',
      'warm, concise, commercially sharp',
      'concierge',
      array['lead qualification', 'proposal drafting', 'follow-up writing', 'scope summaries'],
      array['Owner approval required before sending client-facing messages or pricing commitments']
    ),
    (
      'engineering-agent',
      'Engineering Agent',
      'Engineering',
      'Translate product and client goals into technical plans, implementation tasks, and review workflows.',
      'technical, calm, exact',
      'builder',
      array['implementation planning', 'technical review', 'data integration planning', 'QA coordination'],
      array['Owner approval required before production deployment or destructive data operations']
    ),
    (
      'travel-agent',
      'Travel Agent',
      'Travel',
      'Support TNW Travel with intake, itinerary drafts, client preference organization, and travel workflow ideas.',
      'service-minded, organized, careful',
      'concierge',
      array['travel intake', 'itinerary drafting', 'option comparison', 'client follow-up drafts'],
      array['Owner approval required before booking, quoting final prices, or making travel commitments']
    ),
    (
      'operations-agent',
      'Operations Agent',
      'Operations',
      'Keep MGWAIOS work organized by tracking tasks, handoffs, blockers, and repeatable operating patterns.',
      'direct, organized, steady',
      'operator',
      array['task triage', 'handoff planning', 'status summaries', 'process improvement'],
      array['Owner approval required before changing external systems or operational commitments']
    )
) as agent(slug, name, department, mission, tone, preset_slug, allowed_tasks, approval_rules)
  on true
join presets on presets.slug = agent.preset_slug
on conflict (company_id, slug) do update
set
  personality_preset_id = excluded.personality_preset_id,
  name = excluded.name,
  department = excluded.department,
  mission = excluded.mission,
  tone = excluded.tone,
  memory_scope = excluded.memory_scope,
  allowed_tasks = excluded.allowed_tasks,
  approval_rules = excluded.approval_rules;
