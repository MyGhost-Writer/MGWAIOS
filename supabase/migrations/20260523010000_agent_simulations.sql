create table if not exists public.agent_chat_sessions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  agent_profile_id uuid not null references public.agent_profiles(id) on delete cascade,
  requester text not null,
  title text not null,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.agent_chat_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.agent_chat_sessions(id) on delete cascade,
  role text not null,
  content text not null,
  task_id uuid references public.tasks(id) on delete set null,
  artifact_id uuid references public.artifacts(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.artifact_files (
  id uuid primary key default gen_random_uuid(),
  artifact_id uuid not null references public.artifacts(id) on delete cascade,
  file_name text not null,
  format text not null,
  mime_type text not null,
  storage_bucket text,
  storage_path text,
  content_text text,
  created_at timestamptz not null default now()
);

create index if not exists agent_chat_sessions_company_id_idx
  on public.agent_chat_sessions(company_id);
create index if not exists agent_chat_sessions_agent_profile_id_idx
  on public.agent_chat_sessions(agent_profile_id);
create index if not exists agent_chat_messages_session_id_idx
  on public.agent_chat_messages(session_id);
create index if not exists artifact_files_artifact_id_idx
  on public.artifact_files(artifact_id);

drop trigger if exists set_agent_chat_sessions_updated_at on public.agent_chat_sessions;
create trigger set_agent_chat_sessions_updated_at
before update on public.agent_chat_sessions
for each row execute function public.set_updated_at();
