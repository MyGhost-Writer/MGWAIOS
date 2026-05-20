import dotenv from "dotenv";
import { Client } from "pg";

dotenv.config({ path: ".env.local", quiet: true });
dotenv.config({ quiet: true });

const databaseUrl = process.env.SUPABASE_DATABASE_URL;

if (!databaseUrl) {
  throw new Error("SUPABASE_DATABASE_URL is required to verify the database.");
}

const expectedTables = [
  "agent_recipes",
  "artifacts",
  "companies",
  "company_sources",
  "decisions",
  "memory_entries",
  "schema_migrations",
  "source_notes",
  "tasks",
];

const client = new Client({
  connectionString: databaseUrl,
  ssl: {
    rejectUnauthorized: false,
  },
});

await client.connect();

try {
  const tables = await client.query<{ table_name: string }>(
    `
      select table_name
      from information_schema.tables
      where table_schema = 'public'
        and table_name = any($1)
      order by table_name;
    `,
    [expectedTables],
  );

  const found = new Set(tables.rows.map((row) => row.table_name));
  const missing = expectedTables.filter((table) => !found.has(table));

  const company = await client.query<{ slug: string; name: string }>(
    "select slug, name from public.companies where slug = $1",
    ["mgwai-llc"],
  );

  console.log(
    JSON.stringify(
      {
        status: missing.length === 0 && company.rowCount === 1 ? "ok" : "incomplete",
        tablesFound: tables.rows.map((row) => row.table_name),
        missingTables: missing,
        mgwaiCompanySeeded: company.rowCount === 1,
      },
      null,
      2,
    ),
  );

  if (missing.length > 0 || company.rowCount !== 1) {
    process.exitCode = 1;
  }
} finally {
  await client.end();
}
