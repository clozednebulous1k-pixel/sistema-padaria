const app = require('./app');
const env = require('./config/env');
const pool = require('./config/database');

// Testar conexão com banco de dados
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Erro ao conectar com o banco de dados:', err.message);
    process.exit(1);
  }
  console.log('✅ Conexão com PostgreSQL estabelecida:', res.rows[0].now);
});

// Iniciar servidor
const PORT = env.server.port;
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`📡 Ambiente: ${env.server.env}`);
  console.log(`🌐 API disponível em: http://localhost:${PORT}`);
});

// Tratamento de erros não capturados
process.on('unhandledRejection', (err) => {
  console.error('Erro não tratado:', err);
  process.exit(1);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM recebido, encerrando servidor...');
  pool.end(() => {
    console.log('Pool de conexões encerrado');
    process.exit(0);
  });
});
