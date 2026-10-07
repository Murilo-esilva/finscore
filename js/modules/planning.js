import {
  listarCompromissos,
  listarRecorrencias,
  listarCategoriasPlanejamento,
  criarCompromisso,
  atualizarCompromisso,
  excluirCompromisso,
  criarRecorrencia,
  atualizarRecorrencia,
  encerrarRecorrencia,
  rotuloTipoConta,
} from "../../services/planningService.js?v=20261007-planning4";
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

function rotuloFrequencia(frequency, interval) {
  const valor = Number(interval || 1);
  const mapa = {
    weekly: valor === 1 ? "Semanal" : `A cada ${valor} semanas`,
    monthly: valor === 1 ? "Mensal" : `A cada ${valor} meses`,
    yearly: valor === 1 ? "Anual" : `A cada ${valor} anos`,
  };
  return mapa[frequency] || frequency;
}


function limparEstadoEdicao() {
  document.getElementById("fs-compromisso-id").value = "";
  document.getElementById("fs-recorrencia-id").value = "";
  document.getElementById("fs-titulo-compromisso").textContent = "Novo compromisso";
  document.getElementById("fs-btn-salvar-compromisso").textContent = "Salvar compromisso";
  const recorrente = document.getElementById("fs-compromisso-recorrente");
  if (recorrente) {
    recorrente.checked = false;
    recorrente.disabled = false;
  }
  document.getElementById("fs-recorrencia-opcoes").hidden = true;
  alternarDiaRecorrencia();
}

function prepararModal(categoria = null, recorrencia = null) {
  const modal = document.getElementById("fs-modal-compromisso");
  const form = document.getElementById("fs-form-compromisso");
  const erro = document.getElementById("fs-form-compromisso-erro");
  if (!modal) return;

  form?.reset();
  if (erro) erro.hidden = true;
  limparEstadoEdicao();

  const id = categoria?.id || "";
  const ruleId = recorrencia?.id || "";
  const template = recorrencia?.template || null;

  document.getElementById("fs-compromisso-id").value = id;
  document.getElementById("fs-recorrencia-id").value = ruleId;

  if (categoria) {
    document.getElementById("fs-titulo-compromisso").textContent = "Editar compromisso";
    document.getElementById("fs-btn-salvar-compromisso").textContent = "Salvar alterações";
    document.getElementById("fs-compromisso-tipo").value = categoria.kind || "expense";
    document.getElementById("fs-compromisso-conta").value = categoria.account_id || "";
    document.getElementById("fs-compromisso-categoria").value = categoria.category_id || "";
    document.getElementById("fs-compromisso-valor").value = Number(categoria.amount_cents || 0) / 100;
    document.getElementById("fs-compromisso-data").value = categoria.due_on || "";
    document.getElementById("fs-compromisso-descricao").value = categoria.description || "";
    const recorrente = document.getElementById("fs-compromisso-recorrente");
    recorrente.checked = false;
    recorrente.disabled = true;
    document.getElementById("fs-recorrencia-opcoes").hidden = true;
    atualizarCategoriasPorTipo();
    document.getElementById("fs-compromisso-categoria").value = categoria.category_id || "";
  } else if (recorrencia) {
    document.getElementById("fs-titulo-compromisso").textContent = "Editar recorrência";
    document.getElementById("fs-btn-salvar-compromisso").textContent = "Salvar recorrência";

    document.getElementById("fs-compromisso-tipo").value = template?.kind || "expense";
    document.getElementById("fs-compromisso-conta").value = template?.account_id || "";
    atualizarCategoriasPorTipo();
    document.getElementById("fs-compromisso-categoria").value = template?.category_id || "";
    document.getElementById("fs-compromisso-valor").value = Number(template?.amount_cents || 0) / 100;
    document.getElementById("fs-compromisso-data").value = recorrencia.anchor_date || "";
    document.getElementById("fs-compromisso-descricao").value = template?.description || "";

    const recorrente = document.getElementById("fs-compromisso-recorrente");
    recorrente.checked = true;
    recorrente.disabled = true;
    document.getElementById("fs-recorrencia-opcoes").hidden = false;
    document.getElementById("fs-recorrencia-frequencia").value = recorrencia.frequency || "monthly";
    document.getElementById("fs-recorrencia-intervalo").value = recorrencia.interval_count || 1;
    document.getElementById("fs-recorrencia-dia-valor").value = recorrencia.day_of_month || "";
    document.getElementById("fs-recorrencia-fim").value = recorrencia.ends_on || "";
    document.getElementById("fs-recorrencia-quantidade").value = recorrencia.max_occurrences || "";
    alternarDiaRecorrencia();
  }

  modal.setAttribute("aria-hidden", "false");
  modal.style.display = "grid";
  requestAnimationFrame(() => document.getElementById("fs-compromisso-descricao")?.focus());
}

function abrirModal() {
  prepararModal();
  const data = document.getElementById("fs-compromisso-data");
  if (data) data.value = adicionarDiasISO(1);
  document.getElementById("fs-recorrencia-frequencia").value = "monthly";
  document.getElementById("fs-recorrencia-intervalo").value = "1";
  document.getElementById("fs-recorrencia-dia-valor").value = String(new Date().getDate());
  alternarDiaRecorrencia();
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

function atualizarCategoriasPorTipo() {
  const tipo = document.getElementById("fs-compromisso-tipo")?.value || "expense";
  const select = document.getElementById("fs-compromisso-categoria");
  if (!select) return;

  const categorias = categoriasDisponiveis.filter((categoria) => categoria.nature === tipo);

  select.required = tipo === "expense";
  select.innerHTML =
    '<option value="">Selecione uma categoria</option>' +
    categorias
      .map((categoria) => `<option value="${esc(categoria.id)}">${esc(categoria.name)}</option>`)
      .join("");
}

function alternarRecorrencia() {
  const recorrente = document.getElementById("fs-compromisso-recorrente")?.checked;
  const opcoes = document.getElementById("fs-recorrencia-opcoes");
  const data = document.getElementById("fs-recorrencia-fim");
  const quantidade = document.getElementById("fs-recorrencia-quantidade");

  if (opcoes) opcoes.hidden = !recorrente;
  if (!recorrente) {
    if (data) data.value = "";
    if (quantidade) quantidade.value = "";
  }
}

function alternarDiaRecorrencia() {
  const frequencia = document.getElementById("fs-recorrencia-frequencia")?.value;
  const campo = document.getElementById("fs-recorrencia-dia");
  const numero = document.getElementById("fs-recorrencia-dia-valor");
  if (!campo) return;

  const mensal = frequencia === "monthly";
  campo.hidden = !mensal;
  if (numero) numero.disabled = !mensal;
}

function renderizarSelect(id, opcoes, placeholder) {
  const select = document.getElementById(id);
  if (!select) return;
  select.innerHTML =
    `<option value="">${placeholder}</option>` +
    opcoes
      .map((item) => `<option value="${esc(item.id)}">${esc(item.label || item.name)}</option>`)
      .join("");
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
  lista.innerHTML = compromissos
    .map((item) => {
      const receita = item.kind === "income";
      const tipo = receita ? "Receita" : "Despesa";
      const sinal = receita ? "+" : "-";
      const conta = item.conta?.name || "Sem conta";
      const categoria = item.categoria?.name || "Sem categoria";
      const recorrente = Boolean(item.recurrence_rule_id);
      const acoes = recorrente ? `
        <span style="font-size:.68rem;color:var(--fs-text-muted);">Gerenciado pela recorrência</span>
      ` : `
        <div style="display:flex;gap:6px;">
          <button type="button" class="fs-btn fs-btn-secondary fs-btn-editar-compromisso" data-id="${esc(item.id)}" style="padding:7px 9px;" title="Editar">
            <i data-lucide="pencil" class="w-4 h-4"></i>
          </button>
          <button type="button" class="fs-btn fs-btn-secondary fs-btn-excluir-compromisso" data-id="${esc(item.id)}" style="padding:7px 9px;" title="Excluir">
            <i data-lucide="trash-2" class="w-4 h-4"></i>
          </button>
        </div>`;

      return `
        <div style="display:flex;align-items:center;justify-content:space-between;gap:16px;padding:16px 20px;border-bottom:1px solid var(--fs-border);">
          <div style="min-width:0;display:flex;align-items:center;gap:12px;">
            <div style="width:38px;height:38px;border-radius:11px;background:var(--fs-surface-2);display:grid;place-items:center;flex-shrink:0;">
              <i data-lucide="${receita ? "arrow-down-left" : "calendar-clock"}" class="w-4 h-4"></i>
            </div>
            <div style="min-width:0;">
              <p style="font-size:.82rem;font-weight:600;">${esc(item.description)}</p>
              <p style="font-size:.68rem;color:var(--fs-text-muted);margin-top:4px;">
                ${formatarData(item.due_on)} · ${tipo} · ${esc(categoria)} · ${esc(conta)}${recorrente ? ' · Recorrente' : ''}
              </p>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:14px;flex-shrink:0;">
            <strong class="fs-mono" style="font-size:.82rem;white-space:nowrap;">${sinal} ${moeda(item.amount_cents)}</strong>
            ${acoes}
          </div>
        </div>`;
    })
    .join("");

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

function renderizarRecorrencias(recorrencias) {
  const lista = document.getElementById("fs-recorrencias-lista");
  const vazio = document.getElementById("fs-recorrencias-vazio");
  const contador = document.getElementById("fs-recorrencias-contador");
  if (!lista || !vazio) return;

  if (contador) contador.textContent = `${recorrencias.length} recorrência(s)`;

  const ativas = recorrencias.filter((item) => item.active);
  if (!ativas.length) {
    lista.innerHTML = "";
    vazio.hidden = false;
    return;
  }

  vazio.hidden = true;
  lista.innerHTML = ativas
    .map((rule) => {
      const template = rule.template;
      const nome = template?.description || "Recorrência";
      const valor = moeda(template?.amount_cents || 0);
      const tipo = template?.kind === "income" ? "Receita" : "Despesa";
      const conta = template?.conta?.name || "Sem conta";
      const frequencia = rotuloFrequencia(rule.frequency, rule.interval_count);
      const fim = rule.ends_on ? `até ${formatarData(rule.ends_on)}` : "sem data final";

      return `
        <div style="display:flex;align-items:center;justify-content:space-between;gap:16px;padding:16px 20px;border-bottom:1px solid var(--fs-border);">
          <div style="display:flex;align-items:center;gap:12px;min-width:0;">
            <div style="width:38px;height:38px;border-radius:11px;background:var(--fs-surface-2);display:grid;place-items:center;flex-shrink:0;">
              <i data-lucide="repeat-2" class="w-4 h-4"></i>
            </div>
            <div style="min-width:0;">
              <p style="font-size:.82rem;font-weight:600;">${esc(nome)}</p>
              <p style="font-size:.68rem;color:var(--fs-text-muted);margin-top:4px;">${frequencia} · ${tipo} · ${esc(conta)} · ${fim} · próxima geração até ${formatarData(rule.materialized_until)}</p>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:10px;flex-shrink:0;">
            <strong class="fs-mono" style="font-size:.82rem;white-space:nowrap;">${valor}</strong>
            <button type="button" class="fs-btn fs-btn-secondary fs-btn-editar-recorrencia" data-id="${esc(rule.id)}" style="padding:7px 9px;" title="Editar recorrência">
              <i data-lucide="pencil" class="w-4 h-4"></i>
            </button>
            <button type="button" class="fs-btn fs-btn-secondary fs-btn-encerrar-recorrencia" data-id="${esc(rule.id)}" style="padding:7px 9px;" title="Excluir recorrência">
              <i data-lucide="trash-2" class="w-4 h-4"></i>
            </button>
          </div>
        </div>`;
    })
    .join("");

  lista.querySelectorAll(".fs-btn-editar-compromisso").forEach((button) => {
    button.addEventListener("click", () => {
      const item = compromissos.find((value) => value.id === button.dataset.id);
      if (item) prepararModal(item);
    });
  });

  lista.querySelectorAll(".fs-btn-excluir-compromisso").forEach((button) => {
    button.addEventListener("click", async () => {
      const item = compromissos.find((value) => value.id === button.dataset.id);
      if (!item) return;
      if (!window.confirm(`Excluir "${item.description}"? O compromisso será cancelado e deixará de entrar na projeção.`)) return;

      button.disabled = true;
      try {
        await excluirCompromisso(item.id);
        await carregarDados();
      } catch (error) {
        const erro = document.getElementById("fs-planejamento-erro");
        if (erro) {
          erro.hidden = false;
          erro.textContent = error?.message || "Não foi possível excluir o compromisso.";
        }
      } finally {
        button.disabled = false;
      }
    });
  });

  lista.querySelectorAll(".fs-btn-editar-recorrencia").forEach((button) => {
    button.addEventListener("click", () => {
      const rule = recorrencias.find((item) => item.id === button.dataset.id);
      if (rule) prepararModal(null, rule);
    });
  });

  lista.querySelectorAll(".fs-btn-encerrar-recorrencia").forEach((button) => {
    button.addEventListener("click", async () => {
      const rule = recorrencias.find((item) => item.id === button.dataset.id);
      if (!rule) return;

      const nome = rule.template?.description || "esta recorrência";
      if (!window.confirm(`Encerrar "${nome}"? Os próximos compromissos dessa recorrência serão cancelados.`)) return;

      button.disabled = true;
      try {
        await encerrarRecorrencia(rule.id);
        await carregarDados();
      } catch (error) {
        const erro = document.getElementById("fs-planejamento-erro");
        if (erro) {
          erro.hidden = false;
          erro.textContent = error?.message || "Não foi possível encerrar a recorrência.";
        }
      } finally {
        button.disabled = false;
      }
    });
  });

  if (window.lucide) window.lucide.createIcons();
}

async function carregarDados() {
  const [contas, categorias, compromissos, recorrencias] = await Promise.all([
    listarContas(),
    listarCategoriasPlanejamento(),
    listarCompromissos(),
    listarRecorrencias(),
  ]);

  categoriasDisponiveis = categorias || [];

  renderizarSelect(
    "fs-compromisso-conta",
    contas.map((conta) => ({
      id: conta.id,
      label: `${conta.name} — ${rotuloTipoConta(conta.type)}`,
    })),
    "Selecione uma conta"
  );

  atualizarCategoriasPorTipo();
  renderizarCompromissos(compromissos);
  atualizarResumo(compromissos);
  renderizarRecorrencias(recorrencias);

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
  document.getElementById("fs-compromisso-tipo")?.addEventListener("change", atualizarCategoriasPorTipo);
  document.getElementById("fs-compromisso-recorrente")?.addEventListener("change", alternarRecorrencia);
  document.getElementById("fs-recorrencia-frequencia")?.addEventListener("change", alternarDiaRecorrencia);

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
      const dueOn = document.getElementById("fs-compromisso-data").value;
      const descricao = document.getElementById("fs-compromisso-descricao").value.trim();
      const recorrente = document.getElementById("fs-compromisso-recorrente").checked;

      if (!(valor > 0)) throw new Error("Informe um valor maior que zero.");
      if (kind === "expense" && !categoryId) throw new Error("Selecione uma categoria para a despesa.");
      if (!accountId) throw new Error("Selecione a conta que será impactada.");
      if (!dueOn) throw new Error("Informe a data.");

      const compromissoId = document.getElementById("fs-compromisso-id").value;
      const recorrenciaId = document.getElementById("fs-recorrencia-id").value;

      if (recorrenciaId) {
        const fim = document.getElementById("fs-recorrencia-fim").value || null;
        const quantidade = document.getElementById("fs-recorrencia-quantidade").value || null;
        const frequencia = document.getElementById("fs-recorrencia-frequencia").value;
        const intervalo = Number(document.getElementById("fs-recorrencia-intervalo").value || 1);
        const dia = frequencia === "monthly"
          ? Number(document.getElementById("fs-recorrencia-dia-valor").value || new Date(dueOn + "T12:00:00").getDate())
          : null;

        if (!(intervalo > 0)) throw new Error("Informe um intervalo válido.");
        if (dia !== null && (dia < 1 || dia > 31)) throw new Error("O dia deve estar entre 1 e 31.");
        if (fim && fim < dueOn) throw new Error("A data final deve ser igual ou posterior ao início.");
        if (quantidade && Number(quantidade) > 120) throw new Error("A recorrência pode ter no máximo 120 ocorrências.");

        await atualizarRecorrencia({
          id: recorrenciaId,
          account_id: accountId,
          category_id: categoryId || null,
          kind,
          amount_cents: Math.round(valor * 100),
          anchor_date: dueOn,
          description: descricao,
          frequency: frequencia,
          interval_count: intervalo,
          day_of_month: dia,
          ends_on: fim,
          max_occurrences: quantidade ? Number(quantidade) : null,
        });
      } else if (compromissoId) {
        await atualizarCompromisso({
          id: compromissoId,
          account_id: accountId,
          category_id: categoryId || null,
          kind,
          amount_cents: Math.round(valor * 100),
          due_on: dueOn,
          description: descricao,
        });
      } else {
        await criarCompromisso({
          account_id: accountId,
          category_id: categoryId || null,
          kind,
          amount_cents: Math.round(valor * 100),
          due_on: dueOn,
          description: descricao,
        });
      }

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
