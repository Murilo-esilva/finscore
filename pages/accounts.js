import { listarContas, criarConta } from "../services/accountsService.js";

const labels = {
  checking: "Conta corrente",
  cash: "Dinheiro",
  savings: "Poupança",
  investment: "Investimentos",
  credit_card: "Cartão de crédito"
};

export async function inicializarContas() {
  const lista = document.getElementById("fs-contas-lista");
  const empty = document.getElementById("fs-contas-empty");
  try {
    const contas = await listarContas();
    lista.innerHTML = contas.length ? contas.map(conta => `
      <div class="fs-surface" style="padding:16px;display:flex;align-items:center;justify-content:space-between;gap:16px">
        <div style="display:flex;align-items:center;gap:12px">
          <span style="width:10px;height:10px;border-radius:50%;background:${conta.color || "var(--fs-indigo)"}"></span>
          <div><strong style="font-size:.9rem">${conta.name}</strong><p style="font-size:.74rem;color:var(--fs-text-muted);margin-top:3px">${labels[conta.account_type] || conta.account_type}</p></div>
        </div>
        <strong class="fs-mono" style="font-size:.9rem">${formatarMoeda((conta.opening_balance_cents || 0) / 100)}</strong>
      </div>`).join("") : "";
    empty.style.display = contas.length ? "none" : "block";
  } catch (error) {
    console.error(error);
    lista.innerHTML = "";
    empty.style.display = "block";
    empty.querySelector("p").textContent = "Não foi possível carregar suas contas.";
  }
}

function formatarMoeda(valor) {
  return new Intl.NumberFormat("pt-BR", { style:"currency", currency:"BRL" }).format(valor);
}

export function abrirFormularioConta() {
  const nome = prompt("Nome da conta:");
  if (!nome) return;
  criarConta({
    name: nome,
    account_type: "checking",
    opening_balance_on: new Date().toISOString().slice(0,10),
    opening_balance: 0,
    include_in_cash: true,
    include_in_net_worth: true
  }).then(inicializarContas).catch(error => {
    console.error(error);
    alert("Não foi possível criar a conta.");
  });
}
