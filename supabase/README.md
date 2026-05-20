# Supabase

This folder contains database migrations for MGWAIOS.

## Project

Project URL:

```text
https://nifdpnjxrstaanedjymz.supabase.co
```

Project ref:

```text
nifdpnjxrstaanedjymz
```

## Local Environment

Secrets belong in `.env.local`, which is ignored by Git.

Required fields:

```env
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_DATABASE_URL=
```

If the direct database host does not work from this machine or a DigitalOcean server, use Supabase's pooler connection string instead. Supabase direct database hosts may resolve only to IPv6 in some environments, while the pooler is usually the smoother choice for IPv4-only networks.

## CLI Setup

The Supabase CLI is not required to keep writing migrations, but it is needed to push them with Supabase's normal workflow.

When installed and authenticated:

```powershell
supabase init
supabase link --project-ref nifdpnjxrstaanedjymz
supabase db push
```

If `supabase init` creates files that already exist, keep the existing migrations and review any generated config before committing.
