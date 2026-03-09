/**
 * Script para verificar conexão com o banco e usuários cadastrados
 * Execute: node scripts/verificar-banco.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Pool } = require('pg');

const config = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'padaria_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
};

console.log('\n=== Verificação do Banco de Dados ===\n');
console.log('Configuração:');
console.log('  Host:', config.host);
console.log('  Porta:', config.port);
console.log('  Banco:', config.database);
console.log('  Usuário:', config.user);
console.log('');

const pool = new Pool(config);

async function verificar() {
  try {
    // 1. Testar conexão
    console.log('1. Testando conexão...');
    const client = await pool.connect();
    console.log('   ✅ Conexão estabelecida com sucesso!\n');

    // 2. Verificar se a tabela usuarios_padaria existe
    console.log('2. Verificando tabela usuarios_padaria...');
    const tabelaExiste = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'usuarios_padaria'
      );
    `);

    if (!tabelaExiste.rows[0].exists) {
      console.log('   ❌ Tabela usuarios_padaria NÃO existe!');
      console.log('   Execute o script setup_completo.sql para criar as tabelas.\n');
      client.release();
      await pool.end();
      process.exit(1);
    }
    console.log('   ✅ Tabela existe.\n');

    // 3. Contar usuários
    console.log('3. Usuários cadastrados:');
    const usuarios = await client.query(`
      SELECT id, nome, email, ativo, is_admin, criado_em 
      FROM usuarios_padaria 
      ORDER BY id
    `);

    if (usuarios.rows.length === 0) {
      console.log('   ⚠️  Nenhum usuário cadastrado.');
      console.log('   Crie o primeiro usuário via API: POST /auth/registro');
      console.log('   Ou acesse o frontend e use "Registrar" / "Criar conta".\n');
    } else {
      console.log(`   Total: ${usuarios.rows.length} usuário(s)\n`);
      usuarios.rows.forEach((u, i) => {
        const admin = u.is_admin ? ' [ADMIN]' : '';
        const ativo = u.ativo ? 'Ativo' : 'Inativo';
        console.log(`   ${i + 1}. ${u.nome} (${u.email}) - ${ativo}${admin}`);
      });
      console.log('');
    }

    // 4. Listar outras tabelas
    console.log('4. Outras tabelas do sistema:');
    const tabelas = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      AND table_name LIKE '%_padaria'
      ORDER BY table_name
    `);
    tabelas.rows.forEach((t) => console.log('   -', t.table_name));
    console.log('');

    client.release();
    await pool.end();

    console.log('=== Verificação concluída ===\n');
  } catch (error) {
    console.error('\n❌ Erro:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('\n   O PostgreSQL não está rodando ou a porta está incorreta.');
    } else if (error.code === '28P01') {
      console.error('\n   Credenciais incorretas para o usuário', config.user);
    } else if (error.code === '3D000') {
      console.error('\n   O banco de dados "' + config.database + '" não existe.');
    }
    console.log('');
    process.exit(1);
  }
}

verificar();
