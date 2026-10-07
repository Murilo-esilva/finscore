import { obterResumoDashboard } from "../../services/dashboardService.js";

const moeda = (cents) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(cents || 0) / 100);

const esc = (value = "") =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

function formatarData(data) {
  if (!data) return "—";
  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}/${ano}`;
}

function definirEstado(elemento, texto) {
  if (elemento) elemento.textContent = texto;
}

function renderizarFluxo(fluxo) {
  const container = document.getElementById("fs-fluxo-chart");
  const labels = document.getElementById("fs-fluxo-labels");

  if (!container || !labels) return;

  const max = Math.max(
    1,
    ...fluxo.flatMap((item) => [item.income, item.expense])
  );

  container.innerHTML = fluxo
    .map((item) => {
      const incomeHeight = Math.max(3, (item.income / max) * 100);
      const expenseHeight = Math.max(3, (item.expense / max) * 100);

      return `
        <div style="flex:1;min-width:5px;height:100%;display:flex;align-items:flex-end;justify-content:center;gap:2px;" title="Dia ${item.day}: entradas ${moeda(item.income)} | saídas ${moeda(item.expense)}">
          <div style="width:45%;height:${incomeHeight}%;background:var(--fs-teal);border-radius:5px 5px 0 0;"></div>
          <div style="width:45%;height:${expenseHeight}%;background:var(--fs-rose);border-radius:5px 5px 0 0;"></div>
        </div>
      `;
    })
    .join("");

  const totalDias = fluxo.length;
  const pontos = [...new Set([1, 5, 10, 15, 20, 25, totalDias])]
    .filter((dia) => dia <= totalDias);

  labels.innerHTML = pontos.map((dia) => `<span>${dia}</span>`).join("");
}

function renderizarContas(contas) {
  const container = document.getElementById("fs-dashboard-contas");
  if (!container) return;

  if (!contas.length) {
    container.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:center;min-height:125px;text-align:center;">
        <div>
          <p style="font-size:.82rem;color:var(--fs-text-muted)">Nenhuma conta cadastrada.</p>
          <a href="accounts.html" style="display:inline-block;margin-top:8px;font-size:.78rem;color:var(--fs-indigo);font-weight:600">Cadastrar conta</a>
        </div>
      </div>`;
    return;
  }

  container.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:10px;">
      ${contas.slice(0, 4).map((conta) => `
        <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;">
          <div style="min-width:0;display:flex;align-items:center;gap:10px;">
            <div style="width:34px;height:34px;border-radius:10px;background:var(--fs-surface-2);display:grid;place-items:center;flex-shrink:0;">
              <i data-lucide="${conta.type === "credit_card" ? "credit-card" : "landmark"}" class="w-4 h-4"></i>
            </div>
            <div style="min-width:0;">
              <p style="font-size:.8rem;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(conta.name)}</p>
              <p style="font-size:.68rem;color:var(--fs-text-muted)">${esc(conta.type || "Conta")}</p>
            </div>
          </div>
          <strong class="fs-mono" style="font-size:.8rem;white-space:nowrap;">${moeda(conta.balance_cents)}</strong>
        </div>`
      ).join("")}
      ${contas.length > 4 ? `<a href="accounts.html" style="font-size:.75rem;color:var(--fs-indigo);font-weight:600;margin-top:4px;">Ver todas as ${contas.length} contas</a>` : ""}
    </div>`;

  if (window.lucide) window.lucide.createIcons();
}

function renderizarCompromissos(compromissos) {
  const container = document.getElementById("fs-dashboard-compromissos");
  if (!container) return;

  if (!compromissos.length) {
    container.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:190px;text-align:center">
        <div class="fs-empty-icon"><i data-lucide="calendar-check" class="w-6 h-6"></i></div>
        <p style="font-size:.84rem;font-weight:600;margin-top:12px">Nada comprometido ainda</p>
        <p style="font-size:.75rem;color:var(--fs-text-muted);max-width:220px;margin-top:4px">Os próximos lançamentos previstos aparecerão aqui.</p>
      </div>`;
  } else {
    container.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:10px;">
        ${compromissos.map((item) => `
          <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--fs-border);">
            <div style="min-width:0;">
              <p style="font-size:.8rem;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(item.description)}</p>
              <p style="font-size:.68rem;color:var(--fs-text-muted);margin-top:3px;">${formatarData(item.budget_on || item.occurred_on)}</p>
            </div>
            <strong class="fs-mono" style="font-size:.8rem;white-space:nowrap;">${moeda(item.amount_cents)}</strong>
          </div>`
        ).join("")}
      </div>`;
  }

  if (window.lucide) window.lucide.createIcons();
}

export async function inicializarDashboard() {
  const erro = document.getElementById("fs-dashboard-erro");

  try {
    const resumo = await obterResumoDashboard();

    definirEstado(document.getElementById("kpi-saldo"), moeda(resumo.saldoDisponivelCents));
    definirEstado(document.getElementById("kpi-receitas"), moeda(resumo.receitasMesCents));
    definirEstado(document.getElementById("kpi-despesas"), moeda(resumo.despesasMesCents));
    definirEstado(document.getElementById("kpi-comprometido"), moeda(resumo.comprometidoCents));
    definirEstado(document.getElementById("kpi-previsao"), moeda(resumo.previsao30DiasCents));

    renderizarFluxo(resumo.fluxo);
    renderizarContas(resumo.contas);
    renderizarCompromissos(resumo.compromissos);

    const legenda = document.getElementById("fs-fluxo-legenda");
    if (legenda) legenda.textContent = "Entradas x saídas realizadas";

    const previsaoTexto = document.getElementById("fs-previsao-texto");
    if (previsaoTexto) {
      previsaoTexto.textContent =
        "Saldo disponível estimado para os próximos 30 dias, considerando os lançamentos futuros já cadastrados.";
    }
  } catch (error) {
    console.error("FinScore Dashboard:", error);

    if (erro) {
      erro.hidden = false;
      erro.textContent = error?.message || "Não foi possível carregar os dados financeiros.";
    }
  }
}
