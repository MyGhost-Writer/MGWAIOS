import dotenv from "dotenv";
import { Client } from "pg";

dotenv.config({ path: "../../.env.local", quiet: true });
dotenv.config({ path: ".env.local", quiet: true });
dotenv.config({ quiet: true });

const databaseUrl = process.env.SUPABASE_DATABASE_URL;
const confirmation = process.env.CONFIRM_PURGE_ALL;

if (!databaseUrl) {
  throw new Error("SUPABASE_DATABASE_URL is required to purge company data.");
}

if (confirmation !== "DELETE_ALL_COMPANY_DATA") {
  throw new Error(
    "Refusing to purge all company data. Set CONFIRM_PURGE_ALL=DELETE_ALL_COMPANY_DATA to continue.",
  );
}

const client = new Client({
  connectionString: databaseUrl,
  ssl: {
    rejectUnauthorized: false,
  },
});

await client.connect();

try {
  await client.query("begin");

  const companies = await client.query<{ id: string; slug: string; name: string }>(
    `
      delete from public.companies
      returning id, slug, name;
    `,
  );

  await client.query("commit");

  console.log(
    JSON.stringify(
      {
        status: "purged",
        deletedCompanyCount: companies.rowCount,
        deletedCompanies: companies.rows,
        preservedSystemTables: ["schema_migrations", "personality_presets"],
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
