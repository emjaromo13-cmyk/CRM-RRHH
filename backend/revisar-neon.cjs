require('dotenv').config();

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const sql = `
SELECT
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN (
    'empleados',
    'sedes',
    'tipos_turno',
    'asignaciones',
    'asistencias'
  )
ORDER BY table_name, ordinal_position;
`;

pool.query(sql)
  .then(result => {
    console.table(result.rows);
  })
  .catch(error => {
    console.error('ERROR:', error.message);
  })
  .finally(() => {
    pool.end();
  });