import { auditoriaApi } from './api';
import { usePathname } from 'next/navigation';

/**
 * Função utilitária para registrar cliques em botões
 * @param botao Nome do botão clicado (ex: "Adicionar", "Editar", "Excluir")
 * @param pagina Nome da página (ex: "Produtos", "Roteiros", "Motoristas")
 * @param aba Nome da aba/seção (opcional)
 * @param entidade Tipo de entidade (ex: "produto", "roteiro")
 * @param entidade_id ID da entidade (opcional)
 * @param detalhes Detalhes adicionais (opcional)
 */
export function registrarClique(
  botao: string,
  pagina: string,
  aba?: string,
  entidade?: string,
  entidade_id?: number,
  detalhes?: string
) {
  // Registrar de forma assíncrona sem bloquear a ação
  auditoriaApi.registrarClique({
    botao,
    pagina,
    aba,
    entidade,
    entidade_id,
    detalhes,
  });
}

/**
 * Hook para obter informações da página atual
 */
export function useAuditInfo() {
  const pathname = usePathname();
  
  const getPaginaFromPath = (path: string): string => {
    if (path === '/') return 'Início';
    if (path.startsWith('/produtos')) return 'Produtos';
    if (path.startsWith('/roteiros')) {
      if (path.includes('/novo')) return 'Roteiros - Novo';
      if (path.includes('/historico')) return 'Roteiros - Histórico';
      return 'Roteiros';
    }
    if (path.startsWith('/massas')) return 'Massas';
    if (path.startsWith('/motoristas')) return 'Motoristas';
    if (path.startsWith('/usuarios')) return 'Usuários';
    if (path.startsWith('/auditoria')) return 'Monitoramento';
    return 'Desconhecida';
  };

  const getAbaFromPath = (path: string): string | undefined => {
    if (path.startsWith('/roteiros')) {
      if (path.includes('/novo')) return 'Novo Roteiro';
      if (path.includes('/historico')) return 'Histórico';
    }
    return undefined;
  };

  return {
    pagina: getPaginaFromPath(pathname || ''),
    aba: getAbaFromPath(pathname || ''),
    pathname: pathname || '',
  };
}

