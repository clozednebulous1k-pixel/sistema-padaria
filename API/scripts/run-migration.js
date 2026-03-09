/**
 * Script para executar a migration de adicionar campos motorista e periodo
 * Execute: node scripts/run-migration.js
 */

const pool = require('../src/config/database');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Iniciando migration...');
    
    // Ler o arquivo de migration
    const migrationPath = path.join(__dirname, '../database/migration_add_motorista_periodo.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Executar a migration
    await client.query('BEGIN');
    
    console.log('📝 Executando comandos SQL...');
    await client.query(migrationSQL);
    
    await client.query('COMMIT');
    
    console.log('✅ Migration executada com sucesso!');
    console.log('✅ Campos motorista e periodo adicionados à tabela roteiros');
    
    // Verificar se os campos foram criados
    const checkQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'roteiros' 
      AND column_name IN ('motorista', 'periodo')
      ORDER BY column_name;
    `;
    
    const result = await client.query(checkQuery);
    
    if (result.rows.length === 2) {
      console.log('✅ Verificação: Campos motorista e periodo confirmados na tabela');
    } else {
      console.log('⚠️  Aviso: Nem todos os campos foram encontrados');
      console.log('   Campos encontrados:', result.rows.map(r => r.column_name));
    }
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Erro ao executar migration:', error.message);
    
    if (error.code === '42703') {
      console.error('💡 Dica: Parece que alguns campos já existem ou há um problema na migration');
    }
    
    throw error;
  } finally {
    client.release();
    pool.end();
  }
}

// Executar migration
runMigration()
  .then(() => {
    console.log('\n✅ Processo concluído!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Erro fatal:', error);
    process.exit(1);
  });

