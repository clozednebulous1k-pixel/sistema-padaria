const XLSX = require('xlsx');
const axios = require('axios');
const path = require('path');

// Configuração da API (tenta múltiplas URLs)
const API_URLS = [
  process.env.API_URL || process.env.NEXT_PUBLIC_API_URL,
  'http://localhost:3500/api',
  'http://localhost:3001/api',
  'http://localhost:3000/api',
  'http://10.230.254.238:3500/api'
].filter(Boolean);

const API_URL = API_URLS[0] || 'http://localhost:3500/api';

// Dados de exemplo para empresas
const EMPRESAS_EXEMPLO = [
  'Empresa A',
  'Empresa B',
  'Empresa C',
  'Padaria Central',
  'Supermercado XYZ'
];

// Dias da semana
const DIAS_SEMANA = [
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
  'Domingo'
];

// Períodos
const PERIODOS = ['manhã', 'noite'];

async function gerarExcelTeste() {
  let produtos = [];
  let apiUsada = null;
  
  // Tentar conectar em múltiplas URLs
  for (const url of API_URLS) {
    try {
      console.log(`Tentando conectar à API: ${url}...`);
      const response = await axios.get(`${url}/produtos`, { timeout: 3000 });
      produtos = response.data.data || response.data || [];
      if (produtos.length > 0 || response.status === 200) {
        apiUsada = url;
        console.log(`✅ Conectado com sucesso a: ${url}`);
        break;
      }
    } catch (error) {
      console.log(`   ⚠️  Não foi possível conectar a: ${url}`);
      continue;
    }
  }
  
  // Se não conseguiu conectar, usar produtos de exemplo
  if (produtos.length === 0 && !apiUsada) {
    console.log('\n⚠️  Não foi possível conectar à API.');
    console.log('📝 Usando produtos de exemplo para criar o Excel de teste...');
    
    produtos = [
      { id: 1, nome: 'Pão Francês', descricao: 'Pão tradicional francês', ativo: true },
      { id: 2, nome: 'Pão de Forma', descricao: 'Pão de forma tradicional', ativo: true },
      { id: 3, nome: 'Pão Doce', descricao: 'Pão doce com açúcar', ativo: true },
      { id: 4, nome: 'Brioche', descricao: 'Pão brioche', ativo: true },
      { id: 5, nome: 'Cacetinho', descricao: 'Pão cacetinho', ativo: true }
    ];
  }
  
  try {
    
    if (produtos.length === 0) {
      console.log('⚠️  Nenhum produto encontrado na API.');
      console.log('📝 Criando template vazio com estrutura esperada...');
      
      // Criar template vazio mesmo sem produtos
      const dados = [
        {
          'Empresa/Cliente': '',
          'Produto/Pão': '',
          'Quantidade': '',
          'Dia da Semana': '',
          'Período': 'manhã'
        }
      ];
      
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(dados);
      worksheet['!cols'] = [
        { wch: 20 },
        { wch: 20 },
        { wch: 12 },
        { wch: 18 },
        { wch: 12 }
      ];
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Dados de Teste');
      
      const outputPath = path.join(__dirname, '..', 'public', 'exemplo-teste-roteiros.xlsx');
      XLSX.writeFile(workbook, outputPath);
      
      console.log('✅ Template criado:', outputPath);
      return;
    }
    
    console.log(`✅ Encontrados ${produtos.length} produto(s):`);
    produtos.forEach(p => console.log(`   - ${p.nome} (${p.ativo ? 'Ativo' : 'Inativo'})`));
    
    // Filtrar apenas produtos ativos
    const produtosAtivos = produtos.filter(p => p.ativo);
    
    if (produtosAtivos.length === 0) {
      console.log('⚠️  Nenhum produto ativo encontrado. Usando todos os produtos...');
    }
    
    const produtosParaUsar = produtosAtivos.length > 0 ? produtosAtivos : produtos;
    
    // Gerar dados de exemplo
    const dados = [];
    
    // Criar alguns exemplos variados
    for (let i = 0; i < Math.min(produtosParaUsar.length * 2, 10); i++) {
      const produto = produtosParaUsar[i % produtosParaUsar.length];
      const empresa = EMPRESAS_EXEMPLO[i % EMPRESAS_EXEMPLO.length];
      const diaSemana = DIAS_SEMANA[i % DIAS_SEMANA.length];
      const periodo = PERIODOS[i % PERIODOS.length];
      const quantidade = [10, 20, 30, 40, 50, 60][i % 6];
      
      dados.push({
        'Empresa/Cliente': empresa,
        'Produto/Pão': produto.nome,
        'Quantidade': quantidade,
        'Dia da Semana': diaSemana,
        'Período': periodo
      });
    }
    
    // Criar workbook
    const workbook = XLSX.utils.book_new();
    
    // Worksheet principal (dados de teste)
    const worksheet = XLSX.utils.json_to_sheet(dados);
    worksheet['!cols'] = [
      { wch: 20 }, // Empresa/Cliente
      { wch: 20 }, // Produto/Pão
      { wch: 12 }, // Quantidade
      { wch: 18 }, // Dia da Semana
      { wch: 12 }  // Período
    ];
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Dados de Teste');
    
    // Worksheet com produtos cadastrados
    const produtosData = produtos.map(p => ({
      'Produto Cadastrado': p.nome,
      'Descrição': p.descricao || '',
      'Status': p.ativo ? 'Ativo' : 'Inativo'
    }));
    
    const produtosWorksheet = XLSX.utils.json_to_sheet(produtosData);
    produtosWorksheet['!cols'] = [
      { wch: 25 }, // Produto Cadastrado
      { wch: 30 }, // Descrição
      { wch: 12 }  // Status
    ];
    XLSX.utils.book_append_sheet(workbook, produtosWorksheet, 'Produtos Cadastrados');
    
    // Salvar arquivo
    const outputPath = path.join(__dirname, '..', 'public', 'exemplo-teste-roteiros.xlsx');
    XLSX.writeFile(workbook, outputPath);
    
    console.log('\n✅ Arquivo Excel de teste criado com sucesso!');
    console.log('📁 Localização:', outputPath);
    console.log('\n📊 Estrutura:');
    console.log('   - Aba "Dados de Teste": Contém exemplos com seus produtos');
    console.log('   - Aba "Produtos Cadastrados": Lista todos os produtos do sistema');
    console.log('\n💡 Você pode usar este arquivo para testar a importação!');
    
  } catch (error) {
    console.error('❌ Erro ao gerar Excel:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Dica: Certifique-se de que a API está rodando em', API_URL);
      console.log('   Execute: cd API && npm start');
    } else if (error.response) {
      console.log('   Status:', error.response.status);
      console.log('   Mensagem:', error.response.data);
    }
    
    // Tentar criar template vazio mesmo com erro
    console.log('\n📝 Criando template vazio como fallback...');
    const dados = [
      {
        'Empresa/Cliente': 'Empresa Exemplo',
        'Produto/Pão': 'Produto Exemplo',
        'Quantidade': 10,
        'Dia da Semana': 'Segunda-feira',
        'Período': 'manhã'
      }
    ];
    
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(dados);
    worksheet['!cols'] = [
      { wch: 20 },
      { wch: 20 },
      { wch: 12 },
      { wch: 18 },
      { wch: 12 }
    ];
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Dados de Teste');
    
    const outputPath = path.join(__dirname, '..', 'public', 'exemplo-teste-roteiros.xlsx');
    XLSX.writeFile(workbook, outputPath);
    
    console.log('✅ Template criado:', outputPath);
  }
}

// Executar
gerarExcelTeste();

