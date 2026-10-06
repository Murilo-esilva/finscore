import {
  listarContas,
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
            <i data-lucide="${conta.account_type === "credit_card" ? "credit-card" : "landmark"}" class="w-5 h-5"></i>
          </div>
          <div style="min-width:0;">
            <strong style="font-size:.9rem;">${conta.name}</strong>
            <p style="font-size:.73rem;color:var(--fs-text-muted);margin-top:3px;">${rotuloTipoConta(conta.account_type)}</p>
          </div>
        </div>
        <strong class="fs-mono" style="font-size:.92rem;white-space:nowrap;">${formatarSaldo(conta.opening_balance_cents)}</strong>
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
