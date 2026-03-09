/**
 * Script para redefinir a senha de um usuário
 * Execute: node scripts/redefinir-senha.js email@exemplo.com NovaSenha123
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Pool } = require('pg');
const bcrypt = require('bcrypt');

const config = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'padaria_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
};

const email = process.argv[2];
const novaSenha = process.argv[3];

if (!email || !novaSenha) {
  console.log('\nUso: node scripts/redefinir-senha.js <email> <nova_senha>');
  console.log('Exemplo: node scripts/redefinir-senha.js emerson@gmail.com MinhaSenha123\n');
  process.exit(1);
}

if (novaSenha.length < 6) {
  console.log('\n❌ A senha deve ter pelo menos 6 caracteres.\n');
  process.exit(1);
}

const pool = new Pool(config);

async function redefinir() {
  try {
    const hash = await bcrypt.hash(novaSenha, 10);

    const result = await pool.query(
      'UPDATE usuarios_padaria SET senha = $1 WHERE LOWER(email) = LOWER($2) RETURNING id, nome, email',
      [hash, email]
    );

    if (result.rowCount === 0) {
      console.log('\n❌ Usuário não encontrado com o email:', email);
      console.log('   Verifique se o email está correto.\n');
      process.exit(1);
    }

    const usuario = result.rows[0];
    console.log('\n✅ Senha redefinida com sucesso!');
    console.log('   Usuário:', usuario.nome);
    console.log('   Email:', usuario.email);
    console.log('\n   Faça login com a nova senha.\n');

    await pool.end();
  } catch (error) {
    console.error('\n❌ Erro:', error.message);
    process.exit(1);
  }
}

redefinir();
