create extension if not exists vector with schema extensions;

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  industry text,
  description text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.company_sources (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  source_system text not null,
  source_type text not null,
  title text not null,
  source_url text,
  object_id text,
  access_level text not null default 'read_only',
  last_ingested_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.source_notes (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  source_id uuid references public.company_sources(id) on delete set null,
  category text not null,
  note text not null,
  confidence text not null default 'medium',
  created_at timestamptz not null default now()
);

create table if not exists public.memory_entries (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  category text not null,
  claim text not null,
  details text,
  confidence text not null default 'medium',
  status text not null default 'draft',
  source_id uuid references public.company_sources(id) on delete set null,
  embedding vector(1536),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.agent_recipes (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  slug text not null,
  name text not null,
  department text not null,
  mission text not null,
  scope text not null default 'company',
  body_markdown text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(company_id, slug)
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  project_slug text,
  requested_by text not null,
  goal text not null,
  status text not null default 'draft',
  priority text not null default 'normal',
  assigned_agent_recipe_id uuid references public.agent_recipes(id) on delete set null,
  context jsonb not null default '{}'::jsonb,
  expected_output text,
  result_summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.artifacts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  task_id uuid references public.tasks(id) on delete set null,
  artifact_type text not null,
  title text not null,
  storage_path text,
  body_markdown text,
  review_status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.decisions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  title text not null,
  decision text not null,
  rationale text,
  decided_by text,
  decided_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists company_sources_company_id_idx on public.company_sources(company_id);
create index if not exists source_notes_company_id_idx on public.source_notes(company_id);
create index if not exists memory_entries_company_id_idx on public.memory_entries(company_id);
create index if not exists memory_entries_category_idx on public.memory_entries(category);
create index if not exists agent_recipes_company_id_idx on public.agent_recipes(company_id);
create index if not exists tasks_company_id_status_idx on public.tasks(company_id, status);
create index if not exists artifacts_company_id_idx on public.artifacts(company_id);
create index if not exists decisions_company_id_idx on public.decisions(company_id);

create index if not exists memory_entries_embedding_idx
  on public.memory_entries
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_companies_updated_at on public.companies;
create trigger set_companies_updated_at
before update on public.companies
for each row execute function public.set_updated_at();

drop trigger if exists set_memory_entries_updated_at on public.memory_entries;
create trigger set_memory_entries_updated_at
before update on public.memory_entries
for each row execute function public.set_updated_at();

drop trigger if exists set_agent_recipes_updated_at on public.agent_recipes;
create trigger set_agent_recipes_updated_at
before update on public.agent_recipes
for each row execute function public.set_updated_at();

drop trigger if exists set_tasks_updated_at on public.tasks;
create trigger set_tasks_updated_at
before update on public.tasks
for each row execute function public.set_updated_at();

drop trigger if exists set_artifacts_updated_at on public.artifacts;
create trigger set_artifacts_updated_at
before update on public.artifacts
for each row execute function public.set_updated_at();

insert into public.companies (slug, name, industry, description)
values (
  'mgwai-llc',
  'MGWAI LLC',
  'AI software delivery, automation, product development, and business operating systems',
  'MGWAI LLC builds practical AI-enabled software, automation systems, and company operating layers for businesses.'
)
on conflict (slug) do update
set
  name = excluded.name,
  industry = excluded.industry,
  description = excluded.description;
