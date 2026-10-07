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

export async function obterResumoDashboard() {
  const client = exigirSupabase();
  const contas = await listarContas();

  const hoje = new Date();
  const hojeISO = dataLocalISO(hoje);
  const inicioISO = dataLocalISO(inicioDoMes(hoje));
  const fimISO = dataLocalISO(fimDoMes(hoje));
  const limite30 = new Date(hoje);
  limite30.setDate(limite30.getDate() + 30);
  const limite30ISO = dataLocalISO(limite30);

  const [{ data: transacoes, error: transacoesError }, { data: compromissos, error: compromissosError }] =
    await Promise.all([
      client
        .from("transactions")
        .select("id,account_id,kind,direction,amount_cents,occurred_on,budget_on,description,transfer_id")
        .lte("occurred_on", hojeISO)
        .order("occurred_on", { ascending: true }),
      client
        .from("commitments")
        .select("id,account_id,category_id,kind,status,amount_cents,due_on,description")
        .in("status", ["planned", "confirmed"])
        .gte("due_on", hojeISO)
        .order("due_on", { ascending: true }),
    ]);

  if (transacoesError) throw transacoesError;
  if (compromissosError) throw compromissosError;

  const realizados = (transacoes || []).filter(
    (item) =>
      item.kind !== "opening_balance" &&
      item.kind !== "transfer" &&
      !item.transfer_id
  );

  const realizadosDoMes = realizados.filter(
    (item) => item.occurred_on >= inicioISO && item.occurred_on <= fimISO
  );

  const receitasMesCents = somarPorDirecao(realizadosDoMes, "credit");
  const despesasMesCents = somarPorDirecao(realizadosDoMes, "debit");

  const compromissosFuturos = (compromissos || []).filter(
    (item) => item.due_on > hojeISO
  );

  const comprometidoCents = compromissosFuturos
    .filter((item) => item.kind === "expense")
    .reduce((total, item) => total + Number(item.amount_cents || 0), 0);

  const compromissos30Dias = compromissosFuturos.filter(
    (item) => item.due_on <= limite30ISO
  );

  const entradasFuturasCents = compromissos30Dias
    .filter((item) => item.kind === "income")
    .reduce((total, item) => total + Number(item.amount_cents || 0), 0);

  const saidasFuturasCents = compromissos30Dias
    .filter((item) => item.kind === "expense")
    .reduce((total, item) => total + Number(item.amount_cents || 0), 0);

  const saldoDisponivelCents = contas
    .filter((conta) => conta.include_in_cash !== false)
    .reduce((total, conta) => total + Number(conta.balance_cents || 0), 0);

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

    if (item.direction === "credit") acumulado.income += amount;
    if (item.direction === "debit") acumulado.expense += amount;
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
    compromissos: compromissosFuturos.slice(0, 5),
    previsao30DiasCents,
    fluxo,
    formatarSaldo,
  };
}
