import { exigirSupabase } from "../src/core/supabase/client.js";
import { listarContas, formatarSaldo } from "./accountService.js";

function dataLocalISO(data = new Date()) {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

function inicioDoMes(data = new Date()) {
  return new Date(data.getFullYear(), data.getMonth(), 1);
}

function fimDoMes(data = new Date()) {
  return new Date(data.getFullYear(), data.getMonth() + 1, 0);
}

function somarPorDirecao(transacoes, direcao) {
  return transacoes
    .filter((item) => item.direction === direcao)
    .reduce((total, item) => total + Number(item.amount_cents || 0), 0);
}

function ehMovimentoFinanceiro(item) {
  if (item.kind === "opening_balance") return false;
  if (item.kind === "transfer") return false;
  if (item.transfer_id) return false;
  return true;
}

function dataPlanejamento(item) {
  return item.budget_on || item.occurred_on;
}

export async function obterResumoDashboard() {
  const client = exigirSupabase();
  const contas = await listarContas();

  const hoje = new Date();
  const hojeISO = dataLocalISO(hoje);
  const inicioISO = dataLocalISO(inicioDoMes(hoje));
  const fimISO = dataLocalISO(fimDoMes(hoje));

  const { data: transacoes, error } = await client
    .from("transactions")
    .select(
      "id,account_id,kind,direction,amount_cents,occurred_on,budget_on,description,transfer_id"
    )
    .gte("occurred_on", inicioISO)
    .order("occurred_on", { ascending: true });

  if (error) throw error;

  const movimentos = (transacoes || []).filter(ehMovimentoFinanceiro);

  const saldoDisponivelCents = contas
    .filter((conta) => conta.include_in_cash !== false)
    .reduce((total, conta) => total + Number(conta.balance_cents || 0), 0);

  const realizadosDoMes = movimentos.filter(
    (item) =>
      item.occurred_on >= inicioISO &&
      item.occurred_on <= fimISO
  );

  const receitasMesCents = somarPorDirecao(realizadosDoMes, "credit");
  const despesasMesCents = somarPorDirecao(realizadosDoMes, "debit");

  const compromissos = movimentos
    .filter((item) => dataPlanejamento(item) > hojeISO && item.direction === "debit")
    .sort((a, b) => dataPlanejamento(a).localeCompare(dataPlanejamento(b)));

  const comprometidoCents = compromissos.reduce(
    (total, item) => total + Number(item.amount_cents || 0),
    0
  );

  const fimDoProximo30Dias = new Date(hoje);
  fimDoProximo30Dias.setDate(fimDoProximo30Dias.getDate() + 30);
  const limitePrevisaoISO = dataLocalISO(fimDoProximo30Dias);

  const futuros30Dias = movimentos.filter((item) => {
    const data = dataPlanejamento(item);
    return data > hojeISO && data <= limitePrevisaoISO;
  });

  const entradasFuturasCents = somarPorDirecao(futuros30Dias, "credit");
  const saidasFuturasCents = somarPorDirecao(futuros30Dias, "debit");
  const previsao30DiasCents =
    saldoDisponivelCents + entradasFuturasCents - saidasFuturasCents;

  const porDia = new Map();
  for (const item of realizadosDoMes) {
    const dia = Number(item.occurred_on.slice(-2));
    if (!porDia.has(dia)) {
      porDia.set(dia, { income: 0, expense: 0 });
    }

    const acumulado = porDia.get(dia);
    const amount = Number(item.amount_cents || 0);

    if (item.direction === "credit") {
      acumulado.income += amount;
    } else if (item.direction === "debit") {
      acumulado.expense += amount;
    }
  }

  const diasDoMes = fimDoMes(hoje).getDate();
  const fluxo = [];
  for (let dia = 1; dia <= diasDoMes; dia += 1) {
    const valores = porDia.get(dia) || { income: 0, expense: 0 };
    fluxo.push({ day: dia, ...valores });
  }

  return {
    contas,
    saldoDisponivelCents,
    receitasMesCents,
    despesasMesCents,
    comprometidoCents,
    compromissos: compromissos.slice(0, 5),
    previsao30DiasCents,
    fluxo,
    formatarSaldo,
  };
}
