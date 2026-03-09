const bcrypt = require('bcrypt');

/**
 * Função utilitária para gerar hash de senha
 * Útil para criar usuário inicial no banco de dados
 * 
 * Uso: node -e "require('./src/utils/generateHash.js')('admin123').then(console.log)"
 */
async function generateHash(senha) {
  const saltRounds = 10;
  const hash = await bcrypt.hash(senha, saltRounds);
  console.log(`Senha: ${senha}`);
  console.log(`Hash: ${hash}`);
  return hash;
}

// Se executado diretamente
if (require.main === module && process.argv[2]) {
  generateHash(process.argv[2])
    .then(hash => {
      console.log('\nUse este hash no banco de dados:');
      console.log(hash);
      process.exit(0);
    })
    .catch(error => {
      console.error('Erro:', error);
      process.exit(1);
    });
}

module.exports = generateHash;

