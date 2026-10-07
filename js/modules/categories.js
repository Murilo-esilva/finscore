import {
  listarCategorias,
  criarCategoria,
  atualizarCategoria,
  arquivarCategoria,
} from "../../services/categoryService.js?v=20261007-category2";

const esc = (value = "") =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

function naturezaLabel(nature) {
  return nature === "income" ? "Receita" : "Despesa";
}

function abrirModal(categoria = null) {
  const modal = document.getElementById("fs-modal-categoria");
  const form = document.getElementById("fs-form-categoria");
  if (!modal || !form) return;

  form.reset();
  document.getElementById("fs-categoria-id").value = categoria?.id || "";
  document.getElementById("fs-categoria-nome").value = categoria?.name || "";
  document.getElementById("fs-categoria-natureza").value = categoria?.nature || "expense";
  document.getElementById("fs-categoria-essencial").checked = Boolean(categoria?.is_essential);

  const titulo = document.getElementById("fs-titulo-categoria");
  if (titulo) titulo.textContent = categoria ? "Editar categoria" : "Nova categoria";

  const natureza = document.getElementById("fs-categoria-natureza");
  if (natureza) natureza.disabled = Boolean(categoria);

  const erro = document.getElementById("fs-form-categoria-erro");
  if (erro) erro.hidden = true;

  modal.setAttribute("aria-hidden", "false");
  modal.style.display = "grid";
  requestAnimationFrame(() => document.getElementById("fs-categoria-nome")?.focus());
}

function fecharModal() {
  const modal = document.getElementById("fs-modal-categoria");
  if (!modal) return;
  modal.setAttribute("aria-hidden", "true");
  modal.style.display = "none";
}

function renderizarCategorias(categorias) {
  const lista = document.getElementById("fs-categorias-lista");
  const vazio = document.getElementById("fs-categorias-vazio");
  const contador = document.getElementById("fs-categorias-contador");
  if (!lista || !vazio) return;

  if (contador) contador.textContent = `${categorias.length} categoria(s)`;

  if (!categorias.length) {
    lista.innerHTML = "";
    vazio.hidden = false;
    return;
  }

  vazio.hidden = true;

  const despesas = categorias.filter((c) => c.nature === "expense");
  const receitas = categorias.filter((c) => c.nature === "income");

  const bloco = (titulo, itens, icone) => `
    <section>
      <div style="padding:15px 20px;border-bottom:1px solid var(--fs-border);background:var(--fs-surface-2);">
        <h3 style="font-size:.8rem;font-weight:700;">${titulo}</h3>
      </div>
      ${itens.map((categoria) => `
        <div style="display:flex;align-items:center;justify-content:space-between;gap:16px;padding:15px 20px;border-bottom:1px solid var(--fs-border);">
          <div style="display:flex;align-items:center;gap:12px;min-width:0;">
            <div style="width:36px;height:36px;border-radius:10px;background:var(--fs-surface-2);display:grid;place-items:center;flex-shrink:0;">
              <i data-lucide="${icone}" class="w-4 h-4"></i>
            </div>
            <div style="min-width:0;">
              <p style="font-size:.82rem;font-weight:600;">${esc(categoria.name)}</p>
              <p style="font-size:.68rem;color:var(--fs-text-muted);margin-top:3px;">
                ${categoria.is_system ? "Categoria do sistema" : "Categoria personalizada"}
                ${categoria.is_essential ? " · Essencial" : ""}
              </p>
            </div>
          </div>
          ${categoria.is_system ? "" : `
            <div style="display:flex;gap:6px;">
              <button type="button" class="fs-btn fs-btn-secondary fs-btn-edit-category" data-id="${esc(categoria.id)}" style="padding:7px 9px;" title="Editar">
                <i data-lucide="pencil" class="w-4 h-4"></i>
              </button>
              <button type="button" class="fs-btn fs-btn-secondary fs-btn-archive-category" data-id="${esc(categoria.id)}" style="padding:7px 9px;" title="Arquivar">
                <i data-lucide="archive" class="w-4 h-4"></i>
              </button>
            </div>`}
        </div>
      `).join("")}
    </section>`;

  lista.innerHTML = bloco("Despesas", despesas, "arrow-down-right") + bloco("Receitas", receitas, "arrow-up-right");

  lista.querySelectorAll(".fs-btn-edit-category").forEach((btn) => {
    btn.addEventListener("click", () => {
      const categoria = categorias.find((c) => c.id === btn.dataset.id);
      abrirModal(categoria);
    });
  });

  lista.querySelectorAll(".fs-btn-archive-category").forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (!window.confirm("Arquivar esta categoria? Os lançamentos históricos continuarão preservados.")) return;

      try {
        await arquivarCategoria(btn.dataset.id);
        await carregarCategorias();
      } catch (error) {
        const erro = document.getElementById("fs-categorias-erro");
        if (erro) {
          erro.hidden = false;
          erro.textContent = error?.message || "Não foi possível arquivar a categoria.";
        }
      }
    });
  });

  if (window.lucide) window.lucide.createIcons();
}

async function carregarCategorias() {
  const categorias = await listarCategorias();
  renderizarCategorias(categorias);
}

export async function inicializarCategorias() {
  const erro = document.getElementById("fs-categorias-erro");
  document.getElementById("fs-btn-nova-categoria")?.addEventListener("click", () => abrirModal());
  document.getElementById("fs-fechar-categoria")?.addEventListener("click", fecharModal);
  document.getElementById("fs-cancelar-categoria")?.addEventListener("click", fecharModal);
  document.getElementById("fs-modal-categoria")?.addEventListener("click", (event) => {
    if (event.target.id === "fs-modal-categoria") fecharModal();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") fecharModal();
  });

  try {
    await carregarCategorias();
  } catch (error) {
    console.error("FinScore Categorias:", error);
    if (erro) {
      erro.hidden = false;
      erro.textContent = error?.message || "Não foi possível carregar as categorias.";
    }
  }
}

export function configurarFormularioCategoria() {
  const form = document.getElementById("fs-form-categoria");
  const erro = document.getElementById("fs-form-categoria-erro");
  if (!form || !erro || form.dataset.configurado === "true") return;

  form.dataset.configurado = "true";

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    erro.hidden = true;

    const botao = document.getElementById("fs-btn-salvar-categoria");
    if (botao) botao.disabled = true;

    try {
      const id = document.getElementById("fs-categoria-id").value;
      const nome = document.getElementById("fs-categoria-nome").value.trim();
      const natureza = document.getElementById("fs-categoria-natureza").value;
      const essencial = document.getElementById("fs-categoria-essencial").checked;

      if (!nome) throw new Error("Informe o nome da categoria.");

      if (id) {
        await atualizarCategoria({
          id,
          name: nome,
          is_essential: essencial,
        });
      } else {
        await criarCategoria({
          name: nome,
          nature: natureza,
          is_essential: essencial,
        });
      }

      fecharModal();
      await carregarCategorias();
    } catch (error) {
      console.error(error);
      erro.textContent = error?.message || "Não foi possível salvar a categoria.";
      erro.hidden = false;
    } finally {
      if (botao) botao.disabled = false;
    }
  });
}
