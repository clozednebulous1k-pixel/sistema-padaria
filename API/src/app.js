const express = require('express');
const cors = require('cors');
const errorHandler = require('./middlewares/errorHandler');

// Importar rotas
const authRoutes = require('./routes/auth.routes');
const produtoRoutes = require('./routes/produto.routes');
// const vendaRoutes = require('./routes/venda.routes'); // Desabilitado temporariamente
// const relatorioRoutes = require('./routes/relatorio.routes'); // Desabilitado temporariamente
const roteiroRoutes = require('./routes/roteiro.routes');
const motoristaRoutes = require('./routes/motorista.routes');
const empresaRoutes = require('./routes/empresa.routes');
const massaRoutes = require('./routes/massa.routes');
const recheioRoutes = require('./routes/recheio.routes');
const opcaoRelatorioRoutes = require('./routes/opcaoRelatorio.routes');
const backupRoutes = require('./routes/backup.routes');
const usuarioRoutes = require('./routes/usuario.routes');
const auditoriaRoutes = require('./routes/auditoria.routes');
const lixeiraRoutes = require('./routes/lixeira.routes');
const { auditMiddleware } = require('./middlewares/auditMiddleware');
const authMiddleware = require('./middlewares/authMiddleware');

const app = express();

// Middlewares
// CORS: permitir front na Vercel e qualquer origem (preflight deve receber os headers)
const corsOptions = {
  origin: true, // reflete a origem da requisição (ex.: sistema-belfort.vercel.app)
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin'],
  credentials: false,
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));
// Garantir que OPTIONS (preflight) responda com 200
app.options('*', cors(corsOptions));

// Logging de requisições para debug
app.use((req, res, next) => {
  console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.path}`);
  next();
});

app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// Rota de health check
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'API está funcionando',
    timestamp: new Date().toISOString(),
  });
});

// Rotas da API
// Rotas públicas de autenticação
app.use('/auth', authRoutes);

// Rotas protegidas (podem ser desprotegidas inicialmente se necessário)
// Aplicar authMiddleware e auditMiddleware em todas as rotas protegidas
app.use('/produtos', authMiddleware, auditMiddleware(), produtoRoutes);
// app.use('/vendas', authMiddleware, auditMiddleware(), vendaRoutes); // Desabilitado temporariamente
// app.use('/relatorios', authMiddleware, auditMiddleware(), relatorioRoutes); // Desabilitado temporariamente
app.use('/roteiros', authMiddleware, auditMiddleware(), roteiroRoutes);
app.use('/motoristas', authMiddleware, auditMiddleware(), motoristaRoutes);
app.use('/empresas', authMiddleware, auditMiddleware(), empresaRoutes);
app.use('/massas', authMiddleware, auditMiddleware(), massaRoutes);
app.use('/recheios', authMiddleware, auditMiddleware(), recheioRoutes);
app.use('/opcoes-relatorio', authMiddleware, auditMiddleware(), opcaoRelatorioRoutes);
app.use('/backup', backupRoutes);

// Rotas de usuários (sempre protegidas)
app.use('/usuarios', authMiddleware, auditMiddleware(), usuarioRoutes);

// Rotas de auditoria (apenas para admins)
app.use('/auditoria', auditoriaRoutes);

// Lixeira (soft delete) - apenas admin
app.use('/lixeira', authMiddleware, lixeiraRoutes);

// Rota 404
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Rota não encontrada',
  });
});

// Middleware de tratamento de erros (deve ser o último)
app.use(errorHandler);

module.exports = app;
