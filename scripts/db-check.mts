import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL || '');

// Check existing table structures
const cols = await sql`
  SELECT table_name, column_name, data_type, udt_name, is_nullable, column_default
  FROM information_schema.columns
  WHERE table_schema = 'public'
  ORDER BY table_name, ordinal_position
`;

const tables: Record<string, string[]> = {};
for (const c of cols) {
  if (!tables[c.table_name]) tables[c.table_name] = [];
  tables[c.table_name].push(`  ${c.column_name} ${c.udt_name}${c.is_nullable === 'NO' ? ' NOT NULL' : ''}${c.column_default ? ` DEFAULT ${c.column_default}` : ''}`);
}

for (const [t, columns] of Object.entries(tables)) {
  console.log(`\n--- ${t} ---`);
  columns.forEach(c => console.log(c));
}

await sql.end();
