import dotenv from "dotenv";
import { Client } from "pg";

dotenv.config({ path: "../../.env.local", quiet: true });
dotenv.config({ path: ".env.local", quiet: true });
dotenv.config({ quiet: true });

const databaseUrl = process.env.SUPABASE_DATABASE_URL;
const companySlug = process.env.COMPANY_SLUG;
const confirmation = process.env.CONFIRM_PURGE;

if (!databaseUrl) {
  throw new Error("SUPABASE_DATABASE_URL is required to purge company data.");
}

if (!companySlug) {
  throw new Error("COMPANY_SLUG is required. Example: $env:COMPANY_SLUG='eco-fit-insulation-demo'");
}

if (confirmation !== companySlug) {
  throw new Error(
    "Refusing to purge. Set CONFIRM_PURGE to the exact company slug you want to delete.",
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
  const result = await client.query<{ id: string; slug: string; name: string }>(
    `
      delete from public.companies
      where slug = $1
      returning id, slug, name;
    `,
    [companySlug],
  );

  console.log(
    JSON.stringify(
      {
        status: result.rowCount === 0 ? "not_found" : "purged",
        companySlug,
        deletedCompanies: result.rows,
      },
      null,
      2,
    ),
  );
} finally {
  await client.end();
}
