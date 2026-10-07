import {
  listarLancamentos,
  listarCategorias,
  criarLancamento,
  formatarSaldo,
  rotuloTipoConta,
} from "../../services/expenseService.js";
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

function dataHoje() {
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = String(hoje.getMonth() + 1).padStart(2, "0");
  const dia = String(hoje.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
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
  if (data) data.value = dataHoje();

  modal.hidden = false;
  modal.setAttribute("aria-hidden", "false");
  modal.style.display = "grid";
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

function renderizarCategoriasSelect(categorias) {
  const select = document.getElementById("fs-lancamento-categoria");
  if (!select) return;

  select.innerHTML = categorias.length
    ? '<option value="">Selecione uma categoria</option>' +
      categorias.map((categoria) =>
        `<option value="${esc(categoria.id)}">${esc(categoria.name)}</option>`
      ).join("")
    : '<option value="">Nenhuma categoria cadastrada</option>';
}

function atualizarObrigatoriedadeCategoria() {
  const tipo = document.getElementById("fs-lancamento-tipo")?.value;
  const select = document.getElementById("fs-lancamento-categoria");
  if (select) select.required = tipo === "expense";
}

function renderizarContasSelect(contas) {
  const select = document.getElementById("fs-lancamento-conta");
  if (!select) return;

  select.innerHTML = contas.length
    ? contas.map((conta) =>
        `<option value="${esc(conta.id)}">${esc(conta.name)} — ${esc(rotuloTipoConta(conta.type))}</option>`
      ).join("")
    : '<option value="">Nenhuma conta cadastrada</option>';

  if (!contas.length) {
    const botao = document.getElementById("fs-btn-salvar-lancamento");
    if (botao) botao.disabled = true;
  }
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

    return `
      <tr>
        <td style="padding:13px 14px;white-space:nowrap;">${formatarData(item.occurred_on)}</td>
        <td style="padding:13px 14px;min-width:220px;">
          <strong style="font-size:.8rem;">${esc(item.description)}</strong>
          <p style="font-size:.68rem;color:var(--fs-text-muted);margin-top:3px;">${esc(conta)}</p>
        </td>
        <td style="padding:13px 14px;color:var(--fs-text-muted);font-size:.75rem;">
          <span>${credito ? "Receita" : "Despesa"}</span>
          <p style="font-size:.66rem;margin-top:3px;">${esc(item.categoria?.name || "Sem categoria")}</p>
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

export async function inicializarLancamentos() {
  const erro = document.getElementById("fs-lancamentos-erro");

  try {
    const [contas, categorias, lancamentos] = await Promise.all([
      listarContas(),
      listarCategorias(),
      listarLancamentos(),
    ]);

    renderizarContasSelect(contas);
    renderizarCategoriasSelect(categorias);
    atualizarObrigatoriedadeCategoria();
    renderizarTabela(lancamentos);
    atualizarResumo(lancamentos);

    const botaoNovo = document.getElementById("fs-btn-novo-gasto");
    if (botaoNovo) {
      botaoNovo.disabled = false;
      botaoNovo.addEventListener("click", abrirModal);
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

  document.getElementById("fs-lancamento-tipo")?.addEventListener("change", atualizarObrigatoriedadeCategoria);
  document.getElementById("fs-fechar-lancamento")?.addEventListener("click", fecharModal);
  document.getElementById("fs-cancelar-lancamento")?.addEventListener("click", fecharModal);
  document.getElementById("fs-modal-lancamento")?.addEventListener("click", (event) => {
    if (event.target.id === "fs-modal-lancamento") fecharModal();
  });

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
      const valor = Number(
        document.getElementById("fs-lancamento-valor")?.value || 0
      );

      if (!(valor > 0)) {
        throw new Error("Informe um valor maior que zero.");
      }

      const tipo = document.getElementById("fs-lancamento-tipo").value;
      const categoria = document.getElementById("fs-lancamento-categoria").value;

      if (tipo === "expense" && !categoria) {
        throw new Error("Selecione uma categoria para a despesa.");
      }

      await criarLancamento({
        account_id: document.getElementById("fs-lancamento-conta").value,
        category_id: categoria || null,
        type: tipo,
        amount_cents: Math.round(valor * 100),
        occurred_on: document.getElementById("fs-lancamento-data").value,
        description: document.getElementById("fs-lancamento-descricao").value.trim(),
      });

      fecharModal();
      await inicializarLancamentos();
    } catch (error) {
      console.error(error);
      erro.textContent = error?.message || "Não foi possível salvar o lançamento.";
      erro.hidden = false;
    } finally {
      if (botao) botao.disabled = false;
    }
  });
}
