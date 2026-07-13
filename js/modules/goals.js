/**
 * modules/goals.js
 * ---------------------------------------------------------
 * STUB — Etapa 1 (estrutura do projeto).
 * Este módulo será implementado em uma etapa futura do plano
 * de entrega do FinScore, conforme "Forma de Entrega" do prompt.
 * A estrutura já existe para manter a arquitetura modular
 * prevista desde o início.
 * ---------------------------------------------------------
 */
import {
  salvarDocumento,
  atualizarDocumento,
  consultarPorUsuario,
  gerarNovoId,
} from "../../services/firestore.js";
/**
 * Salva as metas do usuário em /users/{uid}
 * @param {string} uid - ID do usuário
 * @param {Object} metas - { metaMensal, metaSemanal, metaDiaria, objetivoEconomia, metasPorCategoria: {catId: valor} }
 */
export async function salvarMetas(uid, metas) {
  try {
    await atualizarDocumento("users", uid, {
      metaMensal: metas.metaMensal || 0,
      metaSemanal: metas.metaSemanal || 0,
      metaDiaria: metas.metaDiaria || 0,
      objetivoEconomia: metas.objetivoEconomia || 0,
      metasPorCategoria: metas.metasPorCategoria || {},
      atualizadoEm: new Date(),
    });
    return true;
  } catch (erro) {
    console.error("Erro ao salvar metas:", erro);
    throw erro;
  }
}
/**
 * Obtém as metas do usuário
 * @param {string} uid - ID do usuário
 * @param {Object} usuarioDoc - Documento do usuário (opcional, para evitar consulta extra)
 */
export function obterMetas(usuarioDoc) {
  if (!usuarioDoc) return null;
  return {
    metaMensal: usuarioDoc.metaMensal || 0,
    metaSemanal: usuarioDoc.metaSemanal || 0,
    metaDiaria: usuarioDoc.metaDiaria || 0,
    objetivoEconomia: usuarioDoc.objetivoEconomia || 0,
    metasPorCategoria: usuarioDoc.metasPorCategoria || {},
  };
}
/**
 * Calcula o progresso da meta mensal
 * @param {number} totalGastoMes - Total gasto no mês atual
 * @param {number} metaMensal - Meta mensal do usuário
 * @returns {Object} { gasto, meta, restante, percentualConsumido, consumido, statusVisual }
 */
export function calcularProgressoMeta(totalGastoMes, metaMensal) {
  if (!metaMensal || metaMensal <= 0) {
    return { gasto: 0, meta: 0, restante: 0, percentualConsumido: 0, consumido: false, statusVisual: "sem-meta" };
  }
  const gasto = Math.max(0, totalGastoMes);
  const restante = Math.max(0, metaMensal - gasto);
  const percentualConsumido = (gasto / metaMensal) * 100;
  const consumido = percentualConsumido >= 100;
  
  let statusVisual = "dentro";
  if (percentualConsumido >= 100) statusVisual = "estourado";
  else if (percentualConsumido >= 80) statusVisual = "proximo-do-limite";
  return {
    gasto,
    meta: metaMensal,
    restante,
    percentualConsumido: Math.round(percentualConsumido * 10) / 10,
    consumido,
    statusVisual,
  };
}
/**
 * Calcula o progresso por categoria
 * @param {Array} despesas - Lista de despesas do período
 * @param {Object} metasPorCategoria - { catId: limite }
 * @returns {Array} Array de { categoria, gasto, meta, restante, percentualConsumido, statusVisual }
 */
export function calcularProgressoPorCategoria(despesas, metasPorCategoria) {
  if (!metasPorCategoria || Object.keys(metasPorCategoria).length === 0) {
    return [];
  }
  const gastosPorCategoria = {};
  
  despesas.forEach((despesa) => {
    const cat = despesa.categoria;
    gastosPorCategoria[cat] = (gastosPorCategoria[cat] || 0) + (despesa.valor || 0);
  });
  return Object.entries(metasPorCategoria).map(([categoriaId, metaValor]) => {
    const gasto = gastosPorCategoria[categoriaId] || 0;
    const restante = Math.max(0, metaValor - gasto);
    const percentualConsumido = metaValor > 0 ? (gasto / metaValor) * 100 : 0;
    
    let statusVisual = "dentro";
    if (percentualConsumido >= 100) statusVisual = "estourado";
    else if (percentualConsumido >= 80) statusVisual = "proximo-do-limite";
    return {
      categoria: categoriaId,
      gasto,
      meta: metaValor,
      restante,
      percentualConsumido: Math.round(percentualConsumido * 10) / 10,
      statusVisual,
    };
  });
}
/**
 * Calcula progresso da meta semanal
 * @param {number} totalGastoSemana - Total gasto na semana atual
 * @param {number} metaSemanal - Meta semanal
 */
export function calcularProgressoMetaSemanal(totalGastoSemana, metaSemanal) {
  if (!metaSemanal || metaSemanal <= 0) {
    return { gasto: 0, meta: 0, restante: 0, percentualConsumido: 0, statusVisual: "sem-meta" };
  }
  const gasto = Math.max(0, totalGastoSemana);
  const restante = Math.max(0, metaSemanal - gasto);
  const percentualConsumido = (gasto / metaSemanal) * 100;
  let statusVisual = "dentro";
  if (percentualConsumido >= 100) statusVisual = "estourado";
  else if (percentualConsumido >= 80) statusVisual = "proximo-do-limite";
  return {
    gasto,
    meta: metaSemanal,
    restante,
    percentualConsumido: Math.round(percentualConsumido * 10) / 10,
    statusVisual,
  };
}
/**
 * Calcula progresso da meta diária
 * @param {number} totalGastoDia - Total gasto no dia
 * @param {number} metaDiaria - Meta diária
 */
export function calcularProgressoMetaDiaria(totalGastoDia, metaDiaria) {
  if (!metaDiaria || metaDiaria <= 0) {
    return { gasto: 0, meta: 0, restante: 0, percentualConsumido: 0, statusVisual: "sem-meta" };
  }
  const gasto = Math.max(0, totalGastoDia);
  const restante = Math.max(0, metaDiaria - gasto);
  const percentualConsumido = (gasto / metaDiaria) * 100;
  let statusVisual = "dentro";
  if (percentualConsumido >= 100) statusVisual = "estourado";
  else if (percentualConsumido >= 80) statusVisual = "proximo-do-limite";
  return {
    gasto,
    meta: metaDiaria,
    restante,
    percentualConsumido: Math.round(percentualConsumido * 10) / 10,
    statusVisual,
  };
}
/**
 * Calcula economia realizada (salário - gastos) vs meta de economia
 * @param {number} salario - Renda mensal
 * @param {number} totalGastoMes - Total de gastos no mês
 * @param {number} objetivoEconomia - Meta de economia (R$)
 */
export function calcularEconomia(salario, totalGastoMes, objetivoEconomia) {
  if (!salario || salario <= 0) {
    return { economiaRealizada: 0, objetivo: objetivoEconomia || 0, restante: 0, percentualConsumido: 0 };
  }
  const economiaRealizada = Math.max(0, salario - totalGastoMes);
  const percentualConsumido = objetivoEconomia > 0 ? (economiaRealizada / objetivoEconomia) * 100 : 0;
  const restante = Math.max(0, objetivoEconomia - economiaRealizada);
  return {
    economiaRealizada,
    objetivo: objetivoEconomia || 0,
    restante,
    percentualConsumido: Math.round(percentualConsumido * 10) / 10,
    atingiu: economiaRealizada >= (objetivoEconomia || 0),
  };
}
/**
 * Calcula a tendência de gastos (% vs mês anterior)
 * @param {number} totalMesAtual - Total gasto no mês atual
 * @param {number} totalMesAnterior - Total gasto no mês anterior
 */
export function calcularTendencia(totalMesAtual, totalMesAnterior) {
  if (totalMesAnterior === 0) return null;
  const variacao = totalMesAtual - totalMesAnterior;
  const percentual = (variacao / totalMesAnterior) * 100;
  const direcao = variacao > 0 ? "▲" : variacao < 0 ? "▼" : "→";
  return {
    variacao,
    percentual: Math.round(Math.abs(percentual) * 10) / 10,
    direcao,
    maiorQueAnterior: variacao > 0,
  };
}
export default {
  salvarMetas,
  obterMetas,
  calcularProgressoMeta,
  calcularProgressoPorCategoria,
  calcularProgressoMetaSemanal,
  calcularProgressoMetaDiaria,
  calcularEconomia,
  calcularTendencia,
};
