/**
 * Executa a migração da lixeira (soft delete)
 * Adiciona coluna deletado_em nas tabelas
 *
 * Uso: node scripts/run-migration-lixeira.js
 */

require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function run() {
  const sqlPath = path.join(__dirname, '../database/migration_lixeira_soft_delete.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  console.log('Executando migração da lixeira...');
  await pool.query(sql);
  console.log('Migração concluída com sucesso!');
  process.exit(0);
}

run().catch((err) => {
  console.error('Erro na migração:', err);
  process.exit(1);
});
