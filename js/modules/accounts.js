import {
  listarContas,
  criarConta,
  formatarSaldo,
  rotuloTipoConta,
} from "../../services/accountService.js";

export async function inicializarContas() {
  const lista = document.getElementById("fs-contas-lista");
  const vazio = document.getElementById("fs-contas-vazio");
  const erro = document.getElementById("fs-contas-erro");

  try {
    const contas = await listarContas();

    if (!contas.length) {
      lista.innerHTML = "";
      vazio.hidden = false;
      return;
    }

    vazio.hidden = true;
    lista.innerHTML = contas.map((conta) => `
      <article class="fs-surface" style="padding:18px;display:flex;align-items:center;justify-content:space-between;gap:16px;">
        <div style="display:flex;align-items:center;gap:12px;min-width:0;">
          <div style="width:42px;height:42px;border-radius:12px;background:var(--fs-surface-2);display:grid;place-items:center;flex-shrink:0;">
            <i data-lucide="${conta.type === "credit_card" ? "credit-card" : "landmark"}" class="w-5 h-5"></i>
          </div>
          <div style="min-width:0;">
            <strong style="font-size:.9rem;">${conta.name}</strong>
            <p style="font-size:.73rem;color:var(--fs-text-muted);margin-top:3px;">${rotuloTipoConta(conta.type)}</p>
          </div>
        </div>
        <strong class="fs-mono" style="font-size:.92rem;white-space:nowrap;">${formatarSaldo(conta.opening_cents)}</strong>
      </article>
    `).join("");

    if (window.lucide) window.lucide.createIcons();
  } catch (error) {
    console.error(error);
    if (erro) {
      erro.hidden = false;
      erro.textContent = error.message.includes("Supabase ainda não configurado")
        ? "Conexão com o Supabase ainda não configurada."
        : "Não foi possível carregar suas contas.";
    }
  }
}

export function configurarFormularioConta() {
  if (document.body.dataset.contaModalConfigurado === "true") return;
  document.body.dataset.contaModalConfigurado = "true";

  const modal = document.getElementById("fs-modal-conta");
  const form = document.getElementById("fs-form-conta");
  const erro = document.getElementById("fs-form-conta-erro");
  const campoNome = document.getElementById("fs-conta-nome");
  const campoData = document.getElementById("fs-conta-data");

  if (!modal || !form || !erro || !campoNome || !campoData) {
    console.error("Estrutura do modal de conta não encontrada.");
    return;
  }

  const abrir = (event) => {
    event?.preventDefault();
    form.reset();
    erro.hidden = true;
    campoData.value = new Date().toISOString().slice(0, 10);
    modal.hidden = false;
    modal.setAttribute("aria-hidden", "false");
    modal.style.display = "grid";
    requestAnimationFrame(() => campoNome.focus());
  };

  const fechar = (event) => {
    event?.preventDefault();
    modal.hidden = false;
    modal.setAttribute("aria-hidden", "true");
    modal.style.display = "none";
    form.reset();
    erro.hidden = true;
  };

  document
    .querySelectorAll("#btn-nova-conta, #btn-nova-conta-2")
    .forEach((botao) => botao.addEventListener("click", abrir));

  document
    .querySelectorAll("#fs-fechar-conta, #fs-cancelar-conta")
    .forEach((botao) => botao.addEventListener("click", fechar));

  modal.addEventListener("click", (event) => {
    if (event.target === modal) fechar(event);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && modal.getAttribute("aria-hidden") !== "true") {
      fechar(event);
    }
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    erro.hidden = true;

    const botao = form.querySelector('button[type="submit"]');
    if (!botao) return;

    botao.disabled = true;

    try {
      await criarConta({
        name: campoNome.value.trim(),
        account_type: document.getElementById("fs-conta-tipo").value,
        opening_balance_cents: Math.round(
          Number(document.getElementById("fs-conta-saldo").value || 0) * 100
        ),
        opening_balance_on: campoData.value,
      });

      fechar();
      await inicializarContas();
    } catch (error) {
      console.error(error);
      erro.textContent = error.message || "Não foi possível criar a conta.";
      erro.hidden = false;
    } finally {
      botao.disabled = false;
    }
  });
}
