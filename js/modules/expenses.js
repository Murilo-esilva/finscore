import {
  listarLancamentos,
  listarLancamentosFuturos,
  listarCategorias,
  criarLancamento,
  criarLancamentoFuturo,
  reverterLancamento,
  rotuloTipoConta,
} from "../../services/expenseService.js?v=20261007-expense6";
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

let categoriasDisponiveis = [];
let lancamentosDisponiveis = [];
let lancamentosFuturosDisponiveis = [];

function dataHojeISO() {
  const hoje = new Date();
  return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(hoje.getDate()).padStart(2, "0")}`;
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
  const modal = document.getElementById("fs-modal-lancamento");
  const form = document.getElementById("fs-form-lancamento");
  const erro = document.getElementById("fs-form-lancamento-erro");
  const data = document.getElementById("fs-lancamento-data");

  if (!modal) return;

  form?.reset();
  if (erro) erro.hidden = true;
  if (data) data.value = dataHojeISO();

  modal.hidden = false;
  modal.setAttribute("aria-hidden", "false");
  modal.style.display = "grid";
  atualizarCategoriasPorTipo();

  requestAnimationFrame(() =>
    document.getElementById("fs-lancamento-descricao")?.focus()
  );
}

function fecharModal() {
  const modal = document.getElementById("fs-modal-lancamento");
  const form = document.getElementById("fs-form-lancamento");
  const erro = document.getElementById("fs-form-lancamento-erro");

  if (!modal) return;

  modal.setAttribute("aria-hidden", "true");
  modal.style.display = "none";
  form?.reset();
  if (erro) erro.hidden = true;
}

function atualizarCategoriasPorTipo() {
  const tipo = document.getElementById("fs-lancamento-tipo")?.value;
  const select = document.getElementById("fs-lancamento-categoria");
  if (!select) return;

  const categorias = categoriasDisponiveis.filter(
    (categoria) => categoria.nature === tipo
  );

  select.required = tipo === "expense";
  select.innerHTML = categorias.length
    ? '<option value="">Selecione uma categoria</option>' +
      categorias.map((categoria) =>
        `<option value="${esc(categoria.id)}">${esc(categoria.name)}</option>`
      ).join("")
    : `<option value="">Nenhuma categoria de ${tipo === "expense" ? "despesa" : "receita"} cadastrada</option>`;
}

function renderizarContasSelect(contas) {
  const select = document.getElementById("fs-lancamento-conta");
  if (!select) return;

  select.innerHTML = contas.length
    ? contas.map((conta) =>
        `<option value="${esc(conta.id)}">${esc(conta.name)} — ${esc(rotuloTipoConta(conta.type))}</option>`
      ).join("")
    : '<option value="">Nenhuma conta cadastrada</option>';
}

function renderizarFiltros(contas) {
  const conta = document.getElementById("fs-filtro-conta");
  const categoria = document.getElementById("fs-filtro-categoria");

  if (conta) {
    conta.innerHTML =
      '<option value="">Todas as contas</option>' +
      contas.map((item) =>
        `<option value="${esc(item.id)}">${esc(item.name)}</option>`
      ).join("");
  }

  if (categoria) {
    categoria.innerHTML =
      '<option value="">Todas as categorias</option>' +
      categoriasDisponiveis.map((item) =>
        `<option value="${esc(item.id)}">${esc(item.name)} · ${item.nature === "expense" ? "Despesa" : "Receita"}</option>`
      ).join("");
  }
}

function aplicarFiltros() {
  const tipo = document.getElementById("fs-filtro-tipo")?.value || "";
  const conta = document.getElementById("fs-filtro-conta")?.value || "";
  const categoria = document.getElementById("fs-filtro-categoria")?.value || "";
  const busca = (document.getElementById("fs-filtro-busca")?.value || "").trim().toLowerCase();
  const periodo = document.getElementById("fs-filtro-periodo")?.value || "all";

  const hoje = new Date();
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  const inicioMesISO = `${inicioMes.getFullYear()}-${String(inicioMes.getMonth() + 1).padStart(2, "0")}-01`;
  const limite = new Date(hoje);
  limite.setMonth(limite.getMonth() - (periodo === "3m" ? 3 : 1));
  const limiteISO = `${limite.getFullYear()}-${String(limite.getMonth() + 1).padStart(2, "0")}-${String(limite.getDate()).padStart(2, "0")}`;

  const filtrados = lancamentosDisponiveis.filter((item) => {
    if (tipo && (item.direction === "credit" ? "income" : "expense") !== tipo) return false;
    if (conta && item.account_id !== conta) return false;
    if (categoria && item.category_id !== categoria) return false;
    if (busca && !String(item.description || "").toLowerCase().includes(busca)) return false;
    if (periodo === "month" && item.occurred_on < inicioMesISO) return false;
    if (periodo === "3m" && item.occurred_on < limiteISO) return false;
    return true;
  });

  renderizarTabela(filtrados);
  atualizarResumo(filtrados);
}

function renderizarTabela(lancamentos) {
  const corpo = document.getElementById("fs-lancamentos-lista");
  const vazio = document.getElementById("fs-lancamentos-vazio");
  const contador = document.getElementById("fs-lancamentos-contador");

  if (!corpo || !vazio) return;

  if (contador) contador.textContent = `${lancamentos.length} lançamento(s)`;

  if (!lancamentos.length) {
    corpo.innerHTML = "";
    vazio.hidden = false;
    return;
  }

  vazio.hidden = true;
  corpo.innerHTML = lancamentos.map((item) => {
    const credito = item.direction === "credit";
    const sinal = credito ? "+" : "-";
    const classe = credito ? "color:var(--fs-teal)" : "color:var(--fs-rose)";
    const conta = item.conta?.name || "Conta removida";
    const categoria = item.categoria?.name || "Sem categoria";
    const reversivel = item.kind !== "reversal";

    return `
      <tr style="border-bottom:1px solid var(--fs-border);">
        <td style="padding:13px 14px;white-space:nowrap;">${formatarData(item.occurred_on)}</td>
        <td style="padding:13px 14px;min-width:220px;">
          <strong style="font-size:.8rem;">${esc(item.description)}</strong>
          <p style="font-size:.68rem;color:var(--fs-text-muted);margin-top:3px;">${esc(conta)}</p>
        </td>
        <td style="padding:13px 14px;color:var(--fs-text-muted);font-size:.75rem;">
          <span>${credito ? "Receita" : "Despesa"}</span>
          <p style="font-size:.66rem;margin-top:3px;">${esc(categoria)}${item.kind === "reversal" ? " · Reversão" : ""}</p>
        </td>
        <td style="padding:13px 14px;text-align:right;white-space:nowrap;font-family:var(--fs-font-mono);font-weight:700;${classe}">${sinal} ${moeda(item.amount_cents)}</td>
        <td style="padding:13px 14px;text-align:right;white-space:nowrap;">
          ${reversivel ? `
            <button type="button" class="fs-btn fs-btn-secondary fs-btn-reverter" data-id="${esc(item.id)}" style="padding:7px 9px;" title="Reverter lançamento">
              <i data-lucide="undo-2" class="w-4 h-4"></i>
            </button>
          ` : ""}
        </td>
      </tr>`;
  }).join("");

  corpo.querySelectorAll(".fs-btn-reverter").forEach((button) => {
    button.addEventListener("click", async () => {
      const lancamento = lancamentosDisponiveis.find((item) => item.id === button.dataset.id);
      if (!lancamento) return;

      if (!window.confirm(
        `Reverter "${lancamento.description}" de ${moeda(lancamento.amount_cents)}? O lançamento original será preservado.`
      )) return;

      button.disabled = true;

      try {
        await reverterLancamento(lancamento.id);
        await carregarDados();
      } catch (error) {
        const erro = document.getElementById("fs-lancamentos-erro");
        if (erro) {
          erro.hidden = false;
          erro.textContent = error?.message || "Não foi possível reverter o lançamento.";
        }
      } finally {
        button.disabled = false;
      }
    });
  });

  if (window.lucide) window.lucide.createIcons();
}

function renderizarLancamentosFuturos(lancamentos) {
  const corpo = document.getElementById("fs-lancamentos-futuros-lista");
  const vazio = document.getElementById("fs-lancamentos-futuros-vazio");
  const contador = document.getElementById("fs-lancamentos-futuros-contador");
  if (!corpo || !vazio) return;

  if (contador) contador.textContent = `${lancamentos.length} lançamento(s) futuro(s)`;

  if (!lancamentos.length) {
    corpo.innerHTML = "";
    vazio.hidden = false;
    return;
  }

  vazio.hidden = true;
  corpo.innerHTML = lancamentos.map((item) => {
    const receita = item.kind === "income";
    const sinal = receita ? "+" : "-";
    const classe = receita ? "color:var(--fs-teal)" : "color:var(--fs-rose)";
    const conta = item.conta?.name || "Conta removida";
    const categoria = item.categoria?.name || "Sem categoria";
    const recorrente = item.recurrence_rule_id
      ? '<span style="margin-left:6px;padding:3px 7px;border-radius:999px;background:var(--fs-surface-2);">Recorrente</span>'
      : "";

    return `
      <tr style="border-bottom:1px solid var(--fs-border);">
        <td style="padding:13px 14px;white-space:nowrap;">${formatarData(item.due_on)}</td>
        <td style="padding:13px 14px;min-width:220px;">
          <strong style="font-size:.8rem;">${esc(item.description)}</strong>
          <p style="font-size:.68rem;color:var(--fs-text-muted);margin-top:3px;">${esc(conta)}</p>
        </td>
        <td style="padding:13px 14px;color:var(--fs-text-muted);font-size:.75rem;">
          <span>${receita ? "Receita prevista" : "Despesa prevista"}${recorrente}</span>
          <p style="font-size:.66rem;margin-top:3px;">${esc(categoria)}</p>
        </td>
        <td style="padding:13px 14px;text-align:right;white-space:nowrap;font-family:var(--fs-font-mono);font-weight:700;${classe}">${sinal} ${moeda(item.amount_cents)}</td>
      </tr>`;
  }).join("");
}

function atualizarResumo(lancamentos) {
  const receitas = lancamentos
    .filter((item) => item.direction === "credit")
    .reduce((soma, item) => soma + Number(item.amount_cents || 0), 0);

  const despesas = lancamentos
    .filter((item) => item.direction === "debit")
    .reduce((soma, item) => soma + Number(item.amount_cents || 0), 0);

  document.getElementById("fs-total-receitas").textContent = moeda(receitas);
  document.getElementById("fs-total-despesas").textContent = moeda(despesas);
  document.getElementById("fs-total-lancamentos").textContent = String(lancamentos.length);
}

async function carregarDados() {
  const [contas, categorias, lancamentos, futuros] = await Promise.all([
    listarContas(),
    listarCategorias(),
    listarLancamentos(),
    listarLancamentosFuturos(),
  ]);

  categoriasDisponiveis = categorias || [];
  lancamentosDisponiveis = lancamentos || [];
  lancamentosFuturosDisponiveis = futuros || [];

  renderizarContasSelect(contas);
  atualizarCategoriasPorTipo();
  renderizarFiltros(contas);
  aplicarFiltros();
  renderizarLancamentosFuturos(lancamentosFuturosDisponiveis);
}

export async function inicializarLancamentos() {
  const erro = document.getElementById("fs-lancamentos-erro");

  document.getElementById("fs-fechar-lancamento")?.addEventListener("click", fecharModal);
  document.getElementById("fs-cancelar-lancamento")?.addEventListener("click", fecharModal);
  document.getElementById("fs-modal-lancamento")?.addEventListener("click", (event) => {
    if (event.target.id === "fs-modal-lancamento") fecharModal();
  });

  const filtros = [
    "fs-filtro-tipo",
    "fs-filtro-conta",
    "fs-filtro-categoria",
    "fs-filtro-periodo",
    "fs-filtro-busca",
  ];

  filtros.forEach((id) => {
    const elemento = document.getElementById(id);
    if (elemento) {
      elemento.addEventListener(
        elemento.tagName === "INPUT" ? "input" : "change",
        aplicarFiltros
      );
    }
  });

  try {
    await carregarDados();

    const botaoNovo = document.getElementById("fs-btn-novo-gasto");
    if (botaoNovo) {
      botaoNovo.disabled = false;
      botaoNovo.onclick = abrirModal;
    }
  } catch (error) {
    console.error("FinScore Lançamentos:", error);
    if (erro) {
      erro.hidden = false;
      erro.textContent = error?.message || "Não foi possível carregar os lançamentos.";
    }
  }
}

export function configurarFormularioLancamento() {
  const form = document.getElementById("fs-form-lancamento");
  const erro = document.getElementById("fs-form-lancamento-erro");
  if (!form || !erro || form.dataset.configurado === "true") return;

  form.dataset.configurado = "true";

  document.getElementById("fs-lancamento-tipo")?.addEventListener("change", atualizarCategoriasPorTipo);
  document.addEventListener("keydown", (event) => {
    const modal = document.getElementById("fs-modal-lancamento");
    if (event.key === "Escape" && modal?.getAttribute("aria-hidden") === "false") {
      fecharModal();
    }
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    erro.hidden = true;

    const botao = document.getElementById("fs-btn-salvar-lancamento");
    if (botao) botao.disabled = true;

    try {
      const valor = Number(document.getElementById("fs-lancamento-valor")?.value || 0);
      const tipo = document.getElementById("fs-lancamento-tipo").value;
      const categoria = document.getElementById("fs-lancamento-categoria").value;
      const data = document.getElementById("fs-lancamento-data").value;
      const descricao = document.getElementById("fs-lancamento-descricao").value.trim();
      const hoje = dataHojeISO();

      if (!(valor > 0)) throw new Error("Informe um valor maior que zero.");
      if (tipo === "expense" && !categoria) throw new Error("Selecione uma categoria para a despesa.");
      if (!data) throw new Error("Informe a data.");
      if (!document.getElementById("fs-lancamento-conta").value) throw new Error("Selecione uma conta.");
      if (!descricao) throw new Error("Informe uma descrição.");

      if (data > hoje) {
        await criarLancamentoFuturo({
          account_id: document.getElementById("fs-lancamento-conta").value,
          category_id: categoria || null,
          type: tipo,
          amount_cents: Math.round(valor * 100),
          due_on: data,
          description: descricao,
        });
      } else {
        await criarLancamento({
          account_id: document.getElementById("fs-lancamento-conta").value,
          category_id: categoria || null,
          type: tipo,
          amount_cents: Math.round(valor * 100),
          occurred_on: data,
          description: descricao,
        });
      }

      fecharModal();
      await carregarDados();
    } catch (error) {
      console.error(error);
      erro.textContent = error?.message || "Não foi possível salvar o lançamento.";
      erro.hidden = false;
    } finally {
      if (botao) botao.disabled = false;
    }
  });
}
