/**
 * modules/score.js
 * ---------------------------------------------------------
 * STUB — Etapa 1 (estrutura do projeto).
 * Este módulo será implementado em uma etapa futura do plano
 * de entrega do FinScore, conforme "Forma de Entrega" do prompt.
 * A estrutura já existe para manter a arquitetura modular
 * prevista desde o início.
 * ---------------------------------------------------------
import {
  salvarDocumento,
  atualizarDocumento,
  consultarPorUsuario,
  gerarNovoId,
} from "../../services/firestore.js";
import { calcularProgressoMeta, calcularEconomia } from "./goals.js";
/**
 * Calcula o Score Financeiro usando a fórmula ponderada
 * @param {Object} params - { totalGastoMes, metaMensal, despesas, salario, objetivoEconomia }
 * @returns {number} Score de 0 a 100
 */
export function calcularScore(params) {
  const {
    totalGastoMes = 0,
    metaMensal = 0,
    despesas = [],
    salario = 0,
    objetivoEconomia = 0,
  } = params;
  // 40% — Cumprimento da meta mensal
  const scoreMeta = calcularScoreMeta(totalGastoMes, metaMensal);
  // 20% — Distribuição saudável entre categorias (não concentração em uma)
  const scoreDistribuicao = calcularScoreDistribuicao(despesas);
  // 15% — Economia realizada vs objetivo
  const scoreEconomia = calcularScoreEconomia(salario, totalGastoMes, objetivoEconomia);
  // 10% — Frequência de registros (consistência)
  const scoreFrequencia = calcularScoreFrequencia(despesas);
  // 10% — Controle de gastos impulsivos (sem picos anormais)
  const scoreImpulsivos = calcularScoreImpulsivos(despesas);
  // 5% — Regularidade dos registros (distribuição ao longo do mês)
  const scoreRegularidade = calcularScoreRegularidade(despesas);
  // Fórmula ponderada
  const score =
    scoreMeta * 0.4 +
    scoreDistribuicao * 0.2 +
    scoreEconomia * 0.15 +
    scoreFrequencia * 0.1 +
    scoreImpulsivos * 0.1 +
    scoreRegularidade * 0.05;
  return Math.round(Math.max(0, Math.min(100, score)));
}
/**
 * Score de cumprimento de meta mensal (0-100)
 * 100 se dentro da meta, 0 se 200%+ acima
 */
function calcularScoreMeta(totalGasto, metaMensal) {
  if (!metaMensal || metaMensal <= 0) return 50; // Sem meta = nota média
  const percentual = (totalGasto / metaMensal) * 100;
  if (percentual <= 100) return 100; // Dentro da meta
  if (percentual <= 110) return 85; // 10% acima
  if (percentual <= 120) return 70; // 20% acima
  if (percentual <= 150) return 50; // 50% acima
  if (percentual <= 200) return 25; // 100% acima
  return 0; // Mais que 200% acima
}
/**
 * Score de distribuição entre categorias (0-100)
 * Mede quanto os gastos estão concentrados
 * Ideal: distribuição uniforme entre categorias
 */
function calcularScoreDistribuicao(despesas) {
  if (despesas.length === 0) return 50;
  const gastosPorCategoria = {};
  let totalGasto = 0;
  despesas.forEach((d) => {
    const cat = d.categoria || "outro";
    const valor = d.valor || 0;
    gastosPorCategoria[cat] = (gastosPorCategoria[cat] || 0) + valor;
    totalGasto += valor;
  });
  if (totalGasto === 0) return 50;
  // Calcular o índice de Herfindahl (concentração)
  // Quanto mais próximo de 100, mais concentrado. Ideal é baixa concentração.
  const numCategorias = Object.keys(gastosPorCategoria).length;
  let concentracao = 0;
  Object.values(gastosPorCategoria).forEach((valor) => {
    const percentual = valor / totalGasto;
    concentracao += percentual * percentual;
  });
  // Converter concentração em score (100 é ideal = distribuição uniforme)
  // Se há 1 categoria: concentração = 1 → score = 0
  // Se há múltiplas iguais: concentração → 1/numCategorias → score = 100
  const concentracaoMaxima = 1; // Quando tudo em uma categoria
  const concentracaoMinima = 1 / numCategorias; // Distribuição perfeita
  const normalizado =
    (concentracaoMaxima - concentracao) /
    (concentracaoMaxima - concentracaoMinima);
  const score = Math.max(0, Math.min(100, normalizado * 100));
  return score;
}
/**
 * Score de economia realizada (0-100)
 * 100 se atinge o objetivo, 0 se não economiza nada
 */
function calcularScoreEconomia(salario, totalGasto, objetivoEconomia) {
  const economia = Math.max(0, salario - totalGasto);
  if (!objetivoEconomia || objetivoEconomia <= 0) return 50;
  if (economia >= objetivoEconomia) return 100;
  const percentualAtingido = (economia / objetivoEconomia) * 100;
  return Math.max(0, Math.min(100, percentualAtingido));
}
/**
 * Score de frequência de registros (0-100)
 * Mede se o usuário registra gastos regularmente (pelo menos 1 por semana ideal)
 */
function calcularScoreFrequencia(despesas) {
  if (despesas.length === 0) return 0;
  // Calcular dias com registros no últimos 30 dias
  const agora = new Date();
  const trinta_dias_atras = new Date(agora.getTime() - 30 * 24 * 60 * 60 * 1000);
  const diasComRegistros = new Set();
  despesas.forEach((d) => {
    const data = new Date(d.dataHora);
    if (data >= trinta_dias_atras) {
      diasComRegistros.add(data.toDateString());
    }
  });
  const numDias = diasComRegistros.size;
  // Ideal: registros em 20+ dias do mês = 100%
  // Mínimo aceitável: 5 dias = 50%
  const score = Math.min(100, (numDias / 20) * 100);
  return score;
}
/**
 * Score de controle de gastos impulsivos (0-100)
 * Detecta picos anormais de gastos em um único dia/transação
 */
function calcularScoreImpulsivos(despesas) {
  if (despesas.length === 0) return 50;
  // Calcular média de gasto por transação
  const mediaGasto =
    despesas.reduce((sum, d) => sum + (d.valor || 0), 0) / despesas.length;
  const desvio = Math.sqrt(
    despesas.reduce((sum, d) => sum + Math.pow((d.valor || 0) - mediaGasto, 2), 0) /
      despesas.length
  );
  // Contar transações anormais (acima de 2 desvios-padrão)
  const transacoesAltas = despesas.filter(
    (d) => (d.valor || 0) > mediaGasto + 2 * desvio
  ).length;
  // Score: reduz 10 pontos por transação anormal, mínimo 0
  const score = Math.max(0, 100 - transacoesAltas * 10);
  return score;
}
/**
 * Score de regularidade (0-100)
 * Mede se os registros estão distribuídos uniformemente ao longo do mês
 */
function calcularScoreRegularidade(despesas) {
  if (despesas.length === 0) return 50;
  // Agrupar por semana
  const porSemana = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  const agora = new Date();
  despesas.forEach((d) => {
    const data = new Date(d.dataHora);
    const mesAtual = data.getMonth() === agora.getMonth();
    if (mesAtual) {
      const dia = data.getDate();
      const semana = Math.ceil(dia / 7);
      porSemana[semana] = (porSemana[semana] || 0) + 1;
    }
  });
  // Calcular variância nas semanas
  const semanasCom = Object.values(porSemana).filter((v) => v > 0).length;
  const mediaRegistrosPorSemana =
    Object.values(porSemana).reduce((a, b) => a + b) / semanasCom || 1;
  const variancia = Object.values(porSemana).reduce(
    (sum, v) => sum + Math.pow(v - mediaRegistrosPorSemana, 2),
    0
  ) / 5;
  // Quanto menor a variância, melhor a regularidade
  // Transformar em score (0-100)
  const score = Math.max(0, 100 - Math.sqrt(variancia) * 10);
  return Math.min(100, score);
}
/**
 * Salva o score atual e adiciona ao histórico temporal
 * @param {string} uid - ID do usuário
 * @param {number} scoreAtual - Score calculado (0-100)
 */
export async function salvarScore(uid, scoreAtual) {
  try {
    const agora = new Date();
    const scoreDoc = {
      uid,
      scoreAtual: Math.round(scoreAtual),
      dataAtualizacao: agora,
      historico: [
        {
          score: Math.round(scoreAtual),
          data: agora,
        },
      ],
    };
    // Tenta atualizar (adiciona ao histórico se já existe)
    try {
      const existente = await consultarPorUsuario("scores", uid);
      if (existente && existente.length > 0) {
        const scoreExistente = existente[0];
        const novoHistorico = [...(scoreExistente.historico || [])];
        novoHistorico.push({
          score: Math.round(scoreAtual),
          data: agora,
        });
        // Manter apenas últimos 365 dias
        const historicoFiltrado = novoHistorico.slice(-365);
        await atualizarDocumento("scores", scoreExistente.id, {
          scoreAtual: Math.round(scoreAtual),
          dataAtualizacao: agora,
          historico: historicoFiltrado,
        });
        return scoreExistente.id;
      }
    } catch (e) {
      // Documento não existe, criar novo
    }
    const novoId = gerarNovoId();
    await salvarDocumento("scores", novoId, scoreDoc);
    return novoId;
  } catch (erro) {
    console.error("Erro ao salvar score:", erro);
    throw erro;
  }
}
/**
 * Obtém o score atual do usuário
 * @param {string} uid - ID do usuário
 * @returns {Object} { scoreAtual, historico, dataAtualizacao }
 */
export async function obterScore(uid) {
  try {
    const resultado = await consultarPorUsuario("scores", uid);
    if (resultado && resultado.length > 0) {
      return resultado[0];
    }
    return null;
  } catch (erro) {
    console.error("Erro ao obter score:", erro);
    return null;
  }
}
export default {
  calcularScore,
  salvarScore,
  obterScore,
};
