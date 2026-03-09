# 🥖 Frontend - Sistema de Controle de Produtos e Vendas de Padaria

Frontend completo desenvolvido em Next.js 14 com TypeScript e Tailwind CSS para controle de produtos e vendas de uma padaria.

## 📋 Índice

- [Tecnologias](#-tecnologias)
- [Estrutura do Projeto](#-estrutura-do-projeto)
- [Pré-requisitos](#-pré-requisitos)
- [Instalação](#-instalação)
- [Configuração](#-configuração)
- [Como Rodar](#-como-rodar)
- [Funcionalidades](#-funcionalidades)

## 🛠 Tecnologias

- **Next.js 14** - Framework React com App Router
- **TypeScript** - Tipagem estática
- **Tailwind CSS** - Framework CSS utilitário
- **React Hook Form** - Gerenciamento de formulários
- **Axios** - Cliente HTTP
- **date-fns** - Manipulação de datas
- **react-hot-toast** - Notificações toast

## 📁 Estrutura do Projeto

```
├── app/
│   ├── globals.css          # Estilos globais
│   ├── layout.tsx           # Layout principal
│   ├── page.tsx              # Página inicial
│   ├── produtos/            # Páginas de produtos
│   │   ├── page.tsx         # Listagem de produtos
│   │   ├── novo/            # Criar produto
│   │   └── [id]/editar/     # Editar produto
│   ├── vendas/              # Páginas de vendas
│   │   ├── page.tsx         # Listagem de vendas
│   │   ├── nova/            # Criar venda
│   │   └── [id]/            # Detalhes da venda
│   └── relatorios/          # Páginas de relatórios
│       └── page.tsx         # Relatórios
├── components/
│   ├── Navbar.tsx           # Barra de navegação
│   └── relatorios/          # Componentes de relatórios
├── lib/
│   └── api.ts               # Cliente API e tipos
└── package.json
```

## ✅ Pré-requisitos

- Node.js (versão 18 ou superior)
- npm ou yarn
- Backend da API rodando (veja README.md principal)

## 📦 Instalação

1. Instale as dependências:

```bash
npm install
```

2. Copie o arquivo `env.example` para `.env.local`:

```bash
cp env.example .env.local
```

3. Configure a URL da API no arquivo `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3500
```

**Nota:** A porta padrão é 3500, mas você pode alterar conforme a configuração do seu backend.

**Nota:** Certifique-se de que o backend está rodando na porta configurada.

## 🚀 Como Rodar

### Modo Desenvolvimento

```bash
npm run dev
```

O frontend estará disponível em `http://localhost:3001` (ou na próxima porta disponível).

### Modo Produção

```bash
npm run build
npm start
```

## 💡 Funcionalidades

### Produtos

- ✅ Listagem de produtos ativos
- ✅ Criação de novos produtos
- ✅ Edição de produtos existentes
- ✅ Desativação de produtos (exclusão lógica)
- ✅ Validação de formulários
- ✅ Interface responsiva

### Vendas

- ✅ Listagem de todas as vendas
- ✅ Criação de vendas com múltiplos produtos
- ✅ Cálculo automático de subtotais e total
- ✅ Visualização detalhada de vendas
- ✅ Seleção de forma de pagamento
- ✅ Validação de dados

### Relatórios

- ✅ Vendas por período
- ✅ Faturamento por dia
- ✅ Produtos mais vendidos (Top 5, 10, 20, 50)
- ✅ Filtros por data
- ✅ Visualização em tabelas

## 🎨 Design

O frontend foi desenvolvido com foco em:

- **Interface moderna e limpa**
- **Design responsivo** (mobile-first)
- **Experiência do usuário intuitiva**
- **Feedback visual** (toasts, loading states)
- **Cores temáticas** (laranja/padaria)

## 🔗 Integração com Backend

O frontend se comunica com o backend através da API REST documentada no README.md principal. Todas as requisições são feitas através do cliente Axios configurado em `lib/api.ts`.

## 📝 Notas

- Certifique-se de que o backend está rodando antes de iniciar o frontend
- A URL da API pode ser configurada através da variável de ambiente `NEXT_PUBLIC_API_URL`
- O sistema usa exclusão lógica para produtos (ativo/inativo)

## 🚧 Próximos Passos

- [ ] Autenticação e autorização
- [ ] Dashboard com gráficos
- [ ] Exportação de relatórios (PDF, Excel)
- [ ] Modo escuro
- [ ] PWA (Progressive Web App)
- [ ] Testes automatizados

---

**Desenvolvido com ❤️ para padarias**
