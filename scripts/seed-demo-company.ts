import dotenv from "dotenv";
import { Client } from "pg";

dotenv.config({ path: "../../.env.local", quiet: true });
dotenv.config({ path: ".env.local", quiet: true });
dotenv.config({ quiet: true });

const databaseUrl = process.env.SUPABASE_DATABASE_URL;

if (!databaseUrl) {
  throw new Error("SUPABASE_DATABASE_URL is required to seed demo data.");
}

const companySlug = process.env.DEMO_COMPANY_SLUG ?? "eco-fit-insulation-demo";
const companyName = process.env.DEMO_COMPANY_NAME ?? "Eco Fit Insulation Demo";

const client = new Client({
  connectionString: databaseUrl,
  ssl: {
    rejectUnauthorized: false,
  },
});

await client.connect();

try {
  await client.query("begin");

  const company = await client.query<{ id: string }>(
    `
      insert into public.companies (slug, name, industry, description)
      values ($1, $2, $3, $4)
      on conflict (slug) do update
      set
        name = excluded.name,
        industry = excluded.industry,
        description = excluded.description
      returning id;
    `,
    [
      companySlug,
      companyName,
      "Residential and commercial insulation services",
      "Demo small business tenant for showing MGWAIOS onboarding, sales, operations, and field-service workflows.",
    ],
  );

  const companyId = company.rows[0]!.id;

  const memoryEntries = [
    {
      category: "company",
      claim: `${companyName} sells insulation services to homeowners, contractors, and light commercial property owners.`,
      details:
        "The demo tenant is designed to show how MGWAIOS captures service offers, sales workflows, operations handoffs, and customer follow-up opportunities.",
    },
    {
      category: "sales",
      claim:
        "Good-fit leads usually need an estimate, explanation of insulation options, scheduling clarity, and follow-up after the site visit.",
      details:
        "Sales agents should produce practical follow-ups, estimate-prep notes, and customer-facing explanations without making final price commitments.",
    },
    {
      category: "operations",
      claim:
        "Operational work moves from lead intake to estimate, estimate follow-up, job scheduling, install completion, invoice, and review request.",
      details:
        "Operations agents should look for bottlenecks around scheduling, incomplete intake details, and handoffs between sales and field crews.",
    },
    {
      category: "approval",
      claim:
        "AI may draft customer communication and internal checklists, but owner approval is required before sending prices, changing schedules, or making warranty commitments.",
      details:
        "This approval rule demonstrates safe automation boundaries for a small service business.",
    },
  ];

  for (const entry of memoryEntries) {
    await client.query(
      `
        insert into public.memory_entries (
          company_id,
          category,
          claim,
          details,
          confidence,
          status
        )
        values ($1, $2, $3, $4, 'high', 'approved')
        on conflict do nothing;
      `,
      [companyId, entry.category, entry.claim, entry.details],
    );
  }

  const agents = [
    {
      slug: "owner-strategy-agent",
      name: "Owner Strategy Agent",
      department: "Strategy",
      preset: "strategist",
      mission:
        "Help the owner prioritize growth opportunities, service packages, staffing risks, and automation opportunities.",
      tone: "executive, practical, locally aware",
      allowedTasks: ["growth planning", "offer design", "automation roadmap", "decision briefs"],
      approvalRules: ["Owner approval required before changing pricing, public positioning, or service guarantees"],
    },
    {
      slug: "sales-estimating-agent",
      name: "Sales & Estimating Agent",
      department: "Sales",
      preset: "concierge",
      mission:
        "Turn leads and estimate conversations into clear follow-ups, estimate-prep notes, and customer education artifacts.",
      tone: "warm, clear, trust-building",
      allowedTasks: ["lead qualification", "estimate follow-up", "customer education", "proposal drafts"],
      approvalRules: ["Owner approval required before sending quotes, discounts, or scheduling commitments"],
    },
    {
      slug: "field-operations-agent",
      name: "Field Operations Agent",
      department: "Operations",
      preset: "operator",
      mission:
        "Coordinate job readiness, crew handoffs, install checklists, completion notes, and review-request workflows.",
      tone: "direct, organized, job-site practical",
      allowedTasks: ["job readiness", "crew handoff", "completion checklist", "status summary"],
      approvalRules: ["Owner approval required before changing job schedules or customer commitments"],
    },
    {
      slug: "customer-success-agent",
      name: "Customer Success Agent",
      department: "Customer Success",
      preset: "coach",
      mission:
        "Help customers understand insulation options, prep requirements, post-install care, and next steps.",
      tone: "patient, helpful, plain-English",
      allowedTasks: ["FAQ drafts", "prep instructions", "post-install follow-up", "review request drafts"],
      approvalRules: ["Owner approval required before warranty, refund, or remediation commitments"],
    },
  ];

  for (const agent of agents) {
    const preset = await client.query<{ id: string }>(
      "select id from public.personality_presets where slug = $1",
      [agent.preset],
    );

    if (!preset.rows[0]) {
      throw new Error(`Missing personality preset: ${agent.preset}. Run migrations first.`);
    }

    await client.query(
      `
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
        values ($1, $2, $3, $4, $5, $6, $7, 'company', $8, $9)
        on conflict (company_id, slug) do update
        set
          personality_preset_id = excluded.personality_preset_id,
          name = excluded.name,
          department = excluded.department,
          mission = excluded.mission,
          tone = excluded.tone,
          allowed_tasks = excluded.allowed_tasks,
          approval_rules = excluded.approval_rules;
      `,
      [
        companyId,
        preset.rows[0].id,
        agent.slug,
        agent.name,
        agent.department,
        agent.mission,
        agent.tone,
        agent.allowedTasks,
        agent.approvalRules,
      ],
    );
  }

  const salesAgent = await client.query<{ id: string }>(
    `
      select id
      from public.agent_profiles
      where company_id = $1
        and slug = 'sales-estimating-agent';
    `,
    [companyId],
  );

  await client.query(
    `
      insert into public.tasks (
        company_id,
        agent_profile_id,
        requested_by,
        goal,
        priority,
        context,
        expected_output
      )
      values ($1, $2, 'seed-demo', $3, 'normal', $4::jsonb, $5);
    `,
    [
      companyId,
      salesAgent.rows[0]?.id ?? null,
      "Draft a warm follow-up for a homeowner who requested an attic insulation estimate and asked about energy savings.",
      JSON.stringify({
        source: "demo-seed",
        scenario: "homeowner estimate follow-up",
      }),
      "A concise Markdown follow-up message with assumptions and approval notes.",
    ],
  );

  await client.query("commit");

  console.log(
    JSON.stringify(
      {
        status: "seeded",
        companySlug,
        companyName,
        agents: agents.length,
        approvedMemoryEntries: memoryEntries.length,
        draftTasksCreated: 1,
      },
      null,
      2,
    ),
  );
} catch (error) {
  await client.query("rollback");
  throw error;
} finally {
  await client.end();
}
