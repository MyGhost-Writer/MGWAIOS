import dotenv from "dotenv";
import { promises as fs } from "node:fs";
import path from "node:path";
import { Client } from "pg";

dotenv.config({ path: ".env.local", quiet: true });
dotenv.config({ quiet: true });

const databaseUrl = process.env.SUPABASE_DATABASE_URL;

if (!databaseUrl) {
  throw new Error("SUPABASE_DATABASE_URL is required to run migrations.");
}

const migrationsDir = path.join(process.cwd(), "supabase", "migrations");

const client = new Client({
  connectionString: databaseUrl,
  ssl: {
    rejectUnauthorized: false,
  },
});

try {
  await client.connect();
} catch (error) {
  if (error instanceof Error && "code" in error && error.code === "ENOTFOUND") {
    throw new Error(
      "Could not resolve the Supabase database host. If the direct host is IPv6-only from this machine, replace SUPABASE_DATABASE_URL with the Supabase pooler connection string.",
    );
  }

  throw error;
}

try {
  await client.query(`
    create table if not exists public.schema_migrations (
      version text primary key,
      name text not null,
      applied_at timestamptz not null default now()
    );
  `);

  const files = (await fs.readdir(migrationsDir))
    .filter((file) => file.endsWith(".sql"))
    .sort();

  for (const file of files) {
    const version = file.split("_")[0];
    const existing = await client.query("select version from public.schema_migrations where version = $1", [
      version,
    ]);

    if (existing.rowCount) {
      console.log(`Skipping ${file}; already applied.`);
      continue;
    }

    const sql = await fs.readFile(path.join(migrationsDir, file), "utf8");

    console.log(`Applying ${file}...`);
    await client.query("begin");

    try {
      await client.query(sql);
      await client.query(
        "insert into public.schema_migrations (version, name) values ($1, $2)",
        [version, file],
      );
      await client.query("commit");
      console.log(`Applied ${file}.`);
    } catch (error) {
      await client.query("rollback");
      throw error;
    }
  }
} finally {
  await client.end();
}
