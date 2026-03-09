/**
 * Script para executar a migration de massas (tipos e vínculos)
 * Execute: node scripts/run-migration-massas.js
 */

const pool = require('../src/config/database');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  const client = await pool.connect();

  try {
    console.log('🔄 Iniciando migration de massas...');

    const migrationPath = path.join(__dirname, '../database/migration_massas_vinculos.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    await client.query('BEGIN');
    console.log('📝 Executando comandos SQL...');
    await client.query(migrationSQL);
    await client.query('COMMIT');

    console.log('✅ Migration executada com sucesso!');
    console.log('✅ Tabela massas_padaria criada e campo tipo_massa adicionado em produtos');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Erro ao executar migration:', error.message);
    throw error;
  } finally {
    client.release();
    pool.end();
  }
}

runMigration()
  .then(() => {
    console.log('\n✅ Processo concluído!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Erro fatal:', error);
    process.exit(1);
  });
