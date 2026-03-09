# Rotas do Backend - Empresas e Motoristas

Este arquivo contém o código que você precisa adicionar no seu backend para que as empresas e motoristas sejam salvos no banco de dados.

## 📋 Estrutura das Rotas

Você precisa criar rotas para:

### Empresas:
- `GET /empresas` - Listar todas as empresas
- `POST /empresas` - Criar uma empresa
- `DELETE /empresas/:id` - Deletar uma empresa

### Motoristas:
- `GET /motoristas` - Listar todos os motoristas
- `POST /motoristas` - Criar um motorista
- `DELETE /motoristas/:id` - Deletar um motorista

---

## 🔧 Exemplo de Implementação (Node.js/Express)

### 1. Rotas de Empresas (`/routes/empresas.js` ou similar)

```javascript
const express = require('express');
const router = express.Router();
const db = require('../config/database'); // Ajuste o caminho conforme sua estrutura

// GET /empresas - Listar todas as empresas
router.get('/', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, nome, criado_em FROM empresas_padaria ORDER BY nome ASC'
    );
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Erro ao listar empresas:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao listar empresas',
      error: error.message
    });
  }
});

// POST /empresas - Criar uma empresa
router.post('/', async (req, res) => {
  try {
    const { nome } = req.body;

    if (!nome || nome.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Nome da empresa é obrigatório'
      });
    }

    // Verificar se já existe
    const existe = await db.query(
      'SELECT id FROM empresas_padaria WHERE LOWER(nome) = LOWER($1)',
      [nome.trim()]
    );

    if (existe.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Esta empresa já está cadastrada'
      });
    }

    const result = await db.query(
      'INSERT INTO empresas_padaria (nome) VALUES ($1) RETURNING id, nome, criado_em',
      [nome.trim()]
    );

    res.status(201).json({
      success: true,
      message: 'Empresa criada com sucesso',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Erro ao criar empresa:', error);
    
    // Erro de duplicata (UNIQUE constraint)
    if (error.code === '23505') {
      return res.status(400).json({
        success: false,
        message: 'Esta empresa já está cadastrada'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Erro ao criar empresa',
      error: error.message
    });
  }
});

// DELETE /empresas/:id - Deletar uma empresa
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      'DELETE FROM empresas_padaria WHERE id = $1 RETURNING id, nome',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Empresa não encontrada'
      });
    }

    res.json({
      success: true,
      message: 'Empresa removida com sucesso',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Erro ao deletar empresa:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao deletar empresa',
      error: error.message
    });
  }
});

module.exports = router;
```

### 2. Rotas de Motoristas (`/routes/motoristas.js` ou similar)

```javascript
const express = require('express');
const router = express.Router();
const db = require('../config/database'); // Ajuste o caminho conforme sua estrutura

// GET /motoristas - Listar todos os motoristas
router.get('/', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, nome, periodo, criado_em FROM motoristas_padaria ORDER BY nome ASC'
    );
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Erro ao listar motoristas:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao listar motoristas',
      error: error.message
    });
  }
});

// POST /motoristas - Criar um motorista
router.post('/', async (req, res) => {
  try {
    const { nome, periodo } = req.body;

    if (!nome || nome.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Nome do motorista é obrigatório'
      });
    }

    if (!periodo || !['matutino', 'noturno'].includes(periodo)) {
      return res.status(400).json({
        success: false,
        message: 'Período deve ser "matutino" ou "noturno"'
      });
    }

    // Verificar se já existe
    const existe = await db.query(
      'SELECT id FROM motoristas_padaria WHERE LOWER(nome) = LOWER($1)',
      [nome.trim()]
    );

    if (existe.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Este motorista já está cadastrado'
      });
    }

    const result = await db.query(
      'INSERT INTO motoristas_padaria (nome, periodo) VALUES ($1, $2) RETURNING id, nome, periodo, criado_em',
      [nome.trim(), periodo]
    );

    res.status(201).json({
      success: true,
      message: 'Motorista criado com sucesso',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Erro ao criar motorista:', error);
    
    // Erro de duplicata (UNIQUE constraint)
    if (error.code === '23505') {
      return res.status(400).json({
        success: false,
        message: 'Este motorista já está cadastrado'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Erro ao criar motorista',
      error: error.message
    });
  }
});

// DELETE /motoristas/:id - Deletar um motorista
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      'DELETE FROM motoristas_padaria WHERE id = $1 RETURNING id, nome',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Motorista não encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Motorista removido com sucesso',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Erro ao deletar motorista:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao deletar motorista',
      error: error.message
    });
  }
});

module.exports = router;
```

### 3. Registrar as rotas no `server.js` ou `app.js`

```javascript
// ... outros imports ...

const empresasRoutes = require('./routes/empresas');
const motoristasRoutes = require('./routes/motoristas');

// ... outras configurações ...

// Registrar as rotas
app.use('/empresas', empresasRoutes);
app.use('/motoristas', motoristasRoutes);

// ... resto do código ...
```

---

## ✅ Checklist

- [ ] Criar arquivo de rotas para empresas
- [ ] Criar arquivo de rotas para motoristas
- [ ] Registrar as rotas no servidor principal
- [ ] Testar se as tabelas `empresas_padaria` e `motoristas_padaria` existem no banco
- [ ] Testar as rotas com Postman ou similar

---

## 🧪 Testando as Rotas

### Listar empresas:
```bash
GET http://localhost:3503/empresas
```

### Criar empresa:
```bash
POST http://localhost:3503/empresas
Content-Type: application/json

{
  "nome": "Empresa Exemplo"
}
```

### Criar motorista:
```bash
POST http://localhost:3503/motoristas
Content-Type: application/json

{
  "nome": "João Silva",
  "periodo": "matutino"
}
```

---

**Nota:** Ajuste os caminhos (`require`) conforme a estrutura do seu projeto backend!

