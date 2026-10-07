import {
  listarCompromissos,
  listarCategoriasPlanejamento,
  criarCompromisso,
  rotuloTipoConta,
} from "../../services/planningService.js?v=20261007-planning3";
import { listarContas } from "../../services/accountService.js";

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

function hojeISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function adicionarDiasISO(dias) {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatarData(data) {
  if (!data) return "—";
  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}/${ano}`;
}

function abrirModal() {
  const modal = document.getElementById("fs-modal-compromisso");
  const form = document.getElementById("fs-form-compromisso");
  const erro = document.getElementById("fs-form-compromisso-erro");
  const data = document.getElementById("fs-compromisso-data");
  if (!modal) return;
  form?.reset();
  if (erro) erro.hidden = true;
  if (data) data.value = adicionarDiasISO(1);
  modal.setAttribute("aria-hidden", "false");
  modal.style.display = "grid";
  requestAnimationFrame(() => document.getElementById("fs-compromisso-descricao")?.focus());
}

function fecharModal() {
  const modal = document.getElementById("fs-modal-compromisso");
  const form = document.getElementById("fs-form-compromisso");
  const erro = document.getElementById("fs-form-compromisso-erro");
  if (!modal) return;
  modal.setAttribute("aria-hidden", "true");
  modal.style.display = "none";
  form?.reset();
  if (erro) erro.hidden = true;
}

function renderizarSelect(id, opcoes, placeholder) {
  const select = document.getElementById(id);
  if (!select) return;
  select.innerHTML = `<option value="">${placeholder}</option>` +
    opcoes.map((item) => `<option value="${esc(item.id)}">${esc(item.label || item.name)}</option>`).join("");
}

function renderizarCompromissos(compromissos) {
  const lista = document.getElementById("fs-compromissos-lista");
  const vazio = document.getElementById("fs-compromissos-vazio");
  const contador = document.getElementById("fs-compromissos-contador");
  if (!lista || !vazio) return;

  if (contador) contador.textContent = `${compromissos.length} compromisso(s)`;

  if (!compromissos.length) {
    lista.innerHTML = "";
    vazio.hidden = false;
    return;
  }

  vazio.hidden = true;
  lista.innerHTML = compromissos.map((item) => {
    const receita = item.kind === "income";
    const tipo = receita ? "Receita" : "Despesa";
    const sinal = receita ? "+" : "-";
    const conta = item.conta?.name || "Sem conta";
    const categoria = item.categoria?.name || "Sem categoria";

    return `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:16px;padding:16px 20px;border-bottom:1px solid var(--fs-border);">
        <div style="min-width:0;display:flex;align-items:center;gap:12px;">
          <div style="width:38px;height:38px;border-radius:11px;background:var(--fs-surface-2);display:grid;place-items:center;flex-shrink:0;">
            <i data-lucide="${receita ? "arrow-down-left" : "calendar-clock"}" class="w-4 h-4"></i>
          </div>
          <div style="min-width:0;">
            <p style="font-size:.82rem;font-weight:600;">${esc(item.description)}</p>
            <p style="font-size:.68rem;color:var(--fs-text-muted);margin-top:4px;">
              ${formatarData(item.due_on)} · ${tipo} · ${esc(categoria)} · ${esc(conta)}
            </p>
          </div>
        </div>
        <strong class="fs-mono" style="font-size:.82rem;white-space:nowrap;">${sinal} ${moeda(item.amount_cents)}</strong>
      </div>`;
  }).join("");

  if (window.lucide) window.lucide.createIcons();
}

function atualizarResumo(compromissos) {
  const hoje = hojeISO();
  const limite = adicionarDiasISO(7);

  const despesas = compromissos
    .filter((item) => item.kind === "expense")
    .reduce((soma, item) => soma + Number(item.amount_cents || 0), 0);

  const proximos7 = compromissos
    .filter((item) => item.kind === "expense" && item.due_on >= hoje && item.due_on <= limite)
    .reduce((soma, item) => soma + Number(item.amount_cents || 0), 0);

  document.getElementById("fs-total-comprometido").textContent = moeda(despesas);
  document.getElementById("fs-total-7dias").textContent = moeda(proximos7);
  document.getElementById("fs-total-compromissos").textContent = String(compromissos.length);
}

async function carregarDados() {
  const [contas, categorias, compromissos] = await Promise.all([
    listarContas(),
    listarCategoriasPlanejamento(),
    listarCompromissos(),
  ]);

  renderizarSelect(
    "fs-compromisso-conta",
    contas.map((conta) => ({ id: conta.id, label: `${conta.name} — ${rotuloTipoConta(conta.type)}` })),
    "Selecione uma conta"
  );

  renderizarSelect(
    "fs-compromisso-categoria",
    categorias
      .filter((categoria) => categoria.nature === "expense")
      .map((categoria) => ({ id: categoria.id, label: categoria.name })),
    "Selecione uma categoria"
  );

  renderizarCompromissos(compromissos);
  atualizarResumo(compromissos);

  const botao = document.getElementById("fs-btn-novo-compromisso");
  if (botao) {
    botao.disabled = false;
    botao.onclick = abrirModal;
  }
}

export async function inicializarPlanejamento() {
  const erro = document.getElementById("fs-planejamento-erro");

  document.getElementById("fs-fechar-compromisso")?.addEventListener("click", fecharModal);
  document.getElementById("fs-cancelar-compromisso")?.addEventListener("click", fecharModal);
  document.getElementById("fs-modal-compromisso")?.addEventListener("click", (event) => {
    if (event.target.id === "fs-modal-compromisso") fecharModal();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") fecharModal();
  });

  try {
    await carregarDados();
  } catch (error) {
    console.error("FinScore Planejamento:", error);
    if (erro) {
      erro.hidden = false;
      erro.textContent = error?.message || "Não foi possível carregar os compromissos.";
    }
  }
}

export function configurarFormularioCompromisso() {
  const form = document.getElementById("fs-form-compromisso");
  const erro = document.getElementById("fs-form-compromisso-erro");
  if (!form || !erro || form.dataset.configurado === "true") return;

  form.dataset.configurado = "true";

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    erro.hidden = true;

    const botao = document.getElementById("fs-btn-salvar-compromisso");
    if (botao) botao.disabled = true;

    try {
      const kind = document.getElementById("fs-compromisso-tipo").value;
      const categoryId = document.getElementById("fs-compromisso-categoria").value;
      const accountId = document.getElementById("fs-compromisso-conta").value;
      const valor = Number(document.getElementById("fs-compromisso-valor").value || 0);

      if (!(valor > 0)) throw new Error("Informe um valor maior que zero.");
      if (kind === "expense" && !categoryId) throw new Error("Selecione uma categoria para a despesa.");
      if (!accountId) throw new Error("Selecione a conta que será impactada pelo compromisso.");

      await criarCompromisso({
        account_id: accountId,
        category_id: categoryId || null,
        kind,
        amount_cents: Math.round(valor * 100),
        due_on: document.getElementById("fs-compromisso-data").value,
        description: document.getElementById("fs-compromisso-descricao").value.trim(),
      });

      fecharModal();
      await carregarDados();
    } catch (error) {
      console.error(error);
      erro.textContent = error?.message || "Não foi possível salvar o compromisso.";
      erro.hidden = false;
    } finally {
      if (botao) botao.disabled = false;
    }
  });
}
