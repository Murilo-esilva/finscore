import {
  listarContas,
  criarConta,
  atualizarConta,
  excluirConta,
  formatarSaldo,
  rotuloTipoConta,
} from "../../services/accountService.js?v=20261007-account4";

const esc = (value = "") =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

let contasDisponiveis = [];

function hojeISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function abrirModalConta(conta = null) {
  const modal = document.getElementById("fs-modal-conta");
  const form = document.getElementById("fs-form-conta");
  const erro = document.getElementById("fs-form-conta-erro");
  if (!modal || !form) return;

  form.reset();
  if (erro) {
    erro.hidden = true;
    erro.textContent = "";
  }

  const titulo = document.getElementById("fs-titulo-conta");
  const descricao = document.getElementById("fs-descricao-conta");
  const saldo = document.getElementById("fs-conta-saldo");
  const data = document.getElementById("fs-conta-data");
  const tipo = document.getElementById("fs-conta-tipo");
  const cash = document.getElementById("fs-conta-caixa");
  const patrimonio = document.getElementById("fs-conta-patrimonio");
  const color = document.getElementById("fs-conta-cor");
  const id = document.getElementById("fs-conta-id");

  id.value = conta?.id || "";
  titulo.textContent = conta ? "Editar conta" : "Nova conta";
  descricao.textContent = conta
    ? "Atualize os dados da conta sem apagar seu histórico."
    : "Cadastre onde seu dinheiro está.";

  document.getElementById("fs-btn-salvar-conta").textContent =
    conta ? "Salvar alterações" : "Salvar conta";

  document.getElementById("fs-conta-nome").value = conta?.name || "";
  tipo.value = conta?.type || "checking";
  cash.checked = conta ? conta.include_in_cash !== false : true;
  patrimonio.checked = conta ? conta.include_in_net_worth !== false : true;
  color.value = conta?.color || "#00AE9D";

  const isEdicao = Boolean(conta);
  saldo.value = isEdicao ? "0" : "0";
  saldo.closest("label").style.display = isEdicao ? "none" : "block";
  data.closest("label").style.display = isEdicao ? "none" : "block";

  if (!isEdicao) {
    data.value = hojeISO();
  }

  aplicarRegraTipoConta();
  modal.hidden = false;
  modal.setAttribute("aria-hidden", "false");
  modal.style.display = "grid";
  requestAnimationFrame(() => document.getElementById("fs-conta-nome")?.focus());
}

function fecharModalConta(event) {
  event?.preventDefault();
  const modal = document.getElementById("fs-modal-conta");
  const form = document.getElementById("fs-form-conta");
  const erro = document.getElementById("fs-form-conta-erro");

  if (!modal) return;
  modal.setAttribute("aria-hidden", "true");
  modal.style.display = "none";
  form?.reset();
  if (erro) erro.hidden = true;
}

function aplicarRegraTipoConta() {
  const tipo = document.getElementById("fs-conta-tipo");
  const cash = document.getElementById("fs-conta-caixa");
  if (!tipo || !cash) return;

  const cartao = tipo.value === "credit_card";
  cash.checked = cartao ? false : cash.checked;
  cash.disabled = cartao;
}

function atualizarResumo(contas) {
  const caixa = contas
    .filter((conta) => conta.include_in_cash !== false)
    .reduce((total, conta) => total + Number(conta.balance_cents || 0), 0);

  const patrimonio = contas
    .filter((conta) => conta.include_in_net_worth !== false)
    .reduce((total, conta) => total + Number(conta.balance_cents || 0), 0);

  document.getElementById("fs-total-caixa").textContent = formatarSaldo(caixa);
  document.getElementById("fs-total-patrimonio").textContent = formatarSaldo(patrimonio);
  document.getElementById("fs-total-contas").textContent = String(contas.length);
}

function renderizarContas(contas) {
  const lista = document.getElementById("fs-contas-lista");
  const vazio = document.getElementById("fs-contas-vazio");
  if (!lista || !vazio) return;

  atualizarResumo(contas);

  if (!contas.length) {
    lista.innerHTML = "";
    vazio.hidden = false;
    return;
  }

  vazio.hidden = true;

  lista.innerHTML = contas.map((conta) => {
    const icone = conta.type === "credit_card" ? "credit-card" : "landmark";
    const detalhe = [
      rotuloTipoConta(conta.type),
      conta.include_in_cash !== false ? "Caixa" : null,
      conta.include_in_net_worth !== false ? "Patrimônio" : null,
    ].filter(Boolean).join(" · ");

    return `
      <article class="fs-surface" style="padding:18px;display:flex;align-items:center;justify-content:space-between;gap:16px;">
        <div style="display:flex;align-items:center;gap:12px;min-width:0;">
          <div style="width:42px;height:42px;border-radius:12px;background:${esc(conta.color || "var(--fs-surface-2"));}22;display:grid;place-items:center;flex-shrink:0;">
            <i data-lucide="${icone}" class="w-5 h-5"></i>
          </div>
          <div style="min-width:0;">
            <strong style="font-size:.9rem;">${esc(conta.name)}</strong>
            <p style="font-size:.71rem;color:var(--fs-text-muted);margin-top:3px;">${esc(detalhe)}</p>
          </div>
        </div>

        <div style="display:flex;align-items:center;gap:14px;flex-shrink:0;">
          <div style="text-align:right;white-space:nowrap;">
            <strong class="fs-mono" style="font-size:.92rem;">${formatarSaldo(conta.balance_cents)}</strong>
            <p style="font-size:.68rem;color:var(--fs-text-muted);margin-top:3px;">Saldo atual</p>
          </div>
          <div style="display:flex;gap:6px;">
            <button type="button" class="fs-btn fs-btn-secondary fs-btn-editar-conta" data-id="${esc(conta.id)}" style="padding:7px 9px;" title="Editar conta" aria-label="Editar conta">
              <i data-lucide="pencil" class="w-4 h-4"></i><span class="hidden sm:inline">Editar</span>
            </button>
            <button type="button" class="fs-btn fs-btn-secondary fs-btn-excluir-conta" data-id="${esc(conta.id)}" style="padding:7px 9px;" title="Excluir conta" aria-label="Excluir conta">
              <i data-lucide="trash-2" class="w-4 h-4"></i><span class="hidden sm:inline">Excluir</span>
            </button>
          </div>
        </div>
      </article>`;
  }).join("");

  lista.querySelectorAll(".fs-btn-editar-conta").forEach((button) => {
    button.onclick = () => {
      const conta = contasDisponiveis.find((item) => String(item.id) === String(button.dataset.id));
      if (conta) abrirModalConta(conta);
    };
  });

  lista.querySelectorAll(".fs-btn-excluir-conta").forEach((button) => {
    button.onclick = async () => {
      const conta = contasDisponiveis.find((item) => String(item.id) === String(button.dataset.id));
      if (!conta) return;

      if (!window.confirm(
        `Excluir "${conta.name}"? A conta será arquivada para preservar o histórico e deixará de aparecer nas contas ativas.`
      )) return;

      button.disabled = true;
      try {
        await excluirConta(conta.id);
        await carregarContas();
      } catch (error) {
        const erro = document.getElementById("fs-contas-erro");
        if (erro) {
          erro.hidden = false;
          erro.textContent = error?.message || "Não foi possível excluir a conta.";
        }
      } finally {
        button.disabled = false;
      }
    };
  });

  if (window.lucide) window.lucide.createIcons();
}

async function carregarContas() {
  const contas = await listarContas({ force: true });
  contasDisponiveis = contas || [];
  renderizarContas(contasDisponiveis);
}

export async function inicializarContas() {
  const erro = document.getElementById("fs-contas-erro");
  try {
    await carregarContas();
  } catch (error) {
    console.error("FinScore Contas:", error);
    if (erro) {
      erro.hidden = false;
      erro.textContent = error?.message?.includes("Supabase ainda não configurado")
        ? "Conexão com o Supabase ainda não configurada."
        : error?.message || "Não foi possível carregar suas contas.";
    }
  }
}

export function configurarFormularioConta() {
  const form = document.getElementById("fs-form-conta");
  const erro = document.getElementById("fs-form-conta-erro");
  if (!form || !erro || form.dataset.configurado === "true") return;

  form.dataset.configurado = "true";

  document.getElementById("fs-btn-nova-conta")?.addEventListener("click", () => abrirModalConta());
  document.getElementById("fs-btn-nova-conta-2")?.addEventListener("click", () => abrirModalConta());
  document.getElementById("fs-fechar-conta")?.addEventListener("click", fecharModalConta);
  document.getElementById("fs-cancelar-conta")?.addEventListener("click", fecharModalConta);
  document.getElementById("fs-conta-tipo")?.addEventListener("change", aplicarRegraTipoConta);

  document.getElementById("fs-modal-conta")?.addEventListener("click", (event) => {
    if (event.target.id === "fs-modal-conta") fecharModalConta();
  });

  document.addEventListener("keydown", (event) => {
    const modal = document.getElementById("fs-modal-conta");
    if (event.key === "Escape" && modal?.getAttribute("aria-hidden") === "false") {
      fecharModalConta();
    }
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    erro.hidden = true;

    const botao = document.getElementById("fs-btn-salvar-conta");
    if (botao) botao.disabled = true;

    try {
      const id = document.getElementById("fs-conta-id").value;
      const name = document.getElementById("fs-conta-nome").value.trim();
      const accountType = document.getElementById("fs-conta-tipo").value;
      const includeInCash = document.getElementById("fs-conta-caixa").checked;
      const includeInNetWorth = document.getElementById("fs-conta-patrimonio").checked;
      const color = document.getElementById("fs-conta-cor").value || null;

      if (!name) throw new Error("Informe o nome da conta.");

      if (id) {
        await atualizarConta({
          id,
          name,
          account_type: accountType,
          include_in_cash: includeInCash,
          include_in_net_worth: includeInNetWorth,
          color,
        });
      } else {
        const saldo = Math.round(Number(document.getElementById("fs-conta-saldo").value || 0) * 100);
        const data = document.getElementById("fs-conta-data").value;
        await criarConta({
          name,
          account_type: accountType,
          opening_balance_cents: saldo,
          opening_balance_on: data,
        });
      }

      fecharModalConta();
      await carregarContas();
    } catch (error) {
      console.error(error);
      if (error?.code === "23505" || error?.message?.includes("accounts_active_name_unique") || error?.message?.includes("account_name_already_exists")) {
        erro.textContent = "Já existe uma conta ativa com esse nome. Escolha outro nome.";
      } else if (error?.message?.includes("account_type_locked_by_history")) {
        erro.textContent = "O tipo dessa conta não pode ser alterado porque ela já possui histórico financeiro.";
      } else {
        erro.textContent = error?.message || "Não foi possível salvar a conta.";
      }
      erro.hidden = false;
    } finally {
      if (botao) botao.disabled = false;
    }
  });
}
