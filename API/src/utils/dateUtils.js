/**
 * Formata uma data para o formato YYYY-MM-DD
 * @param {Date} date - Data a ser formatada
 * @returns {string} Data formatada
 */
function formatDate(date) {
  if (!date) return null;
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Normaliza uma string de data para o formato YYYY-MM-DD
 * Aceita vários formatos: YYYY-MM-DD, YYYY-MM-DDTHH:mm:ss, YYYY-MM-DD HH:mm:ss, etc.
 * @param {string} dateString - String de data a ser normalizada
 * @returns {string|null} Data normalizada no formato YYYY-MM-DD ou null se inválida
 */
function normalizeDate(dateString) {
  if (!dateString) return null;
  
  // Remover hora e timezone se existir (formato ISO ou datetime)
  let dateOnly = dateString.toString().trim();
  
  // Se contém 'T', pegar apenas a parte da data
  if (dateOnly.includes('T')) {
    dateOnly = dateOnly.split('T')[0];
  }
  // Se contém espaço, pegar apenas a parte da data
  else if (dateOnly.includes(' ')) {
    dateOnly = dateOnly.split(' ')[0];
  }
  
  // Validar formato final (YYYY-MM-DD)
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateOnly)) {
    // Tentar converter usando Date
    const date = new Date(dateString);
    if (date instanceof Date && !isNaN(date)) {
      return formatDate(date);
    }
    return null;
  }
  
  // Validar se a data é válida (verificar se não é uma data inválida como 2024-13-45)
  const date = new Date(dateOnly + 'T00:00:00');
  if (date instanceof Date && !isNaN(date)) {
    // Verificar se a data não foi alterada por timezone ou se é inválida
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const normalized = `${year}-${month}-${day}`;
    
    // Verificar se corresponde à data original (evitar problemas de timezone)
    // Se não corresponde, pode ser uma data inválida que foi "corrigida" pelo Date
    if (normalized === dateOnly) {
      return dateOnly;
    }
    // Se foi alterada, retornar a versão normalizada (pode ser por timezone)
    return normalized;
  }
  
  return null;
}

/**
 * Valida se uma string de data está no formato válido e pode ser normalizada
 * @param {string} dateString - String de data a ser validada
 * @returns {boolean} True se válida
 */
function isValidDate(dateString) {
  if (!dateString) return false;
  
  const normalized = normalizeDate(dateString);
  return normalized !== null;
}

module.exports = {
  formatDate,
  normalizeDate,
  isValidDate,
};
