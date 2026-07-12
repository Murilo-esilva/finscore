/**
 * modules/expenses.js
 * ---------------------------------------------------------
 * Regras de negócio de despesas: CRUD completo, categorias
 * padrão + personalizadas, captura automática de localização
 * (geolocalização do navegador + geocodificação reversa) e
 * filtros/ordenação/paginação client-side.
 * ---------------------------------------------------------
 */
import {
  salvarDocumento,
  atualizarDocumento,
  excluirDocumento,
  consultarPorUsuario,
  gerarNovoId,
  adicionarAoArray,
} from "../../services/firestore.js";

export const CATEGORIAS_PADRAO = [
  { id: "alimentacao", nome: "Alimentação", icone: "utensils" },
  { id: "transporte", nome: "Transporte", icone: "car" },
  { id: "moradia", nome: "Moradia", icone: "home" },
  { id: "contas", nome: "Contas", icone: "file-text" },
  { id: "saude", nome: "Saúde", icone: "heart-pulse" },
  { id: "educacao", nome: "Educação", icone: "graduation-cap" },
  { id: "compras", nome: "Compras", icone: "shopping-bag" },
  { id: "lazer", nome: "Lazer", icone: "party-popper" },
  { id: "viagem", nome: "Viagem", icone: "plane" },
  { id: "investimentos", nome: "Investimentos", icone: "trending-up" },
  { id: "pets", nome: "Pets", icone: "dog" },
  { id: "outros", nome: "Outros", icone: "more-horizontal" },
];

export const FORMAS_PAGAMENTO = [
  "Dinheiro",
  "Cartão de débito",
  "Cartão de crédito",
  "Pix",
  "Transferência",
  "Boleto",
  "Outro",
];

/**
 * Retorna a lista de categorias disponíveis para o usuário:
 * as padrão do sistema + as personalizadas que ele já criou
 * (guardadas em /users/{uid}.categoriasCustom).
 * @param {{categoriasCustom?: string[]}} usuarioDoc
 */
export function categoriasDisponiveis(usuarioDoc) {
  const custom = (usuarioDoc?.categoriasCustom || []).map((nome) => ({
    id: nome,
    nome,
    icone: "tag",
    personalizada: true,
  }));
  return [...CATEGORIAS_PADRAO, ...custom];
}

/** Adiciona uma nova categoria personalizada ao usuário. */
export function criarCategoriaPersonalizada(uid, nomeCategoria) {
  return adicionarAoArray("users", uid, "categoriasCustom", nomeCategoria.trim());
}

/**
 * Cria um novo gasto para o usuário.
 * @param {string} uid
 * @param {object} dados - valor, categoria, subcategoria, descricao, formaPagamento,
 *   dataHora (ISO string), latitude, longitude, cidade, estado, pais, endereco, observacoes, comprovanteUrl
 */
export async function criarGasto(uid, dados) {
  const id = gerarNovoId("expenses");
  const agora = new Date().toISOString();

  await salvarDocumento("expenses", id, {
    uid,
    valor: Number(dados.valor) || 0,
    categoria: dados.categoria || "Outros",
    subcategoria: dados.subcategoria || "",
    descricao: dados.descricao || "",
    formaPagamento: dados.formaPagamento || "Outro",
    latitude: dados.latitude ?? null,
    longitude: dados.longitude ?? null,
    cidade: dados.cidade || "",
    estado: dados.estado || "",
    pais: dados.pais || "",
    endereco: dados.endereco || "",
    observacoes: dados.observacoes || "",
    comprovanteUrl: dados.comprovanteUrl || "",
    dataHora: dados.dataHora || agora,
    createdAt: agora,
    updatedAt: agora,
  });

  return id;
}

/**
 * Atualiza um gasto existente.
 * @param {string} expenseId
 * @param {object} dados
 */
export function atualizarGasto(expenseId, dados) {
  return atualizarDocumento("expenses", expenseId, {
    ...dados,
    valor: dados.valor !== undefined ? Number(dados.valor) || 0 : undefined,
    updatedAt: new Date().toISOString(),
  });
}

/** Exclui um gasto. */
export function excluirGasto(expenseId) {
  return excluirDocumento("expenses", expenseId);
}

/** Busca todos os gastos do usuário (sem filtro/ordenação — feito no cliente). */
export function listarGastosDoUsuario(uid) {
  return consultarPorUsuario("expenses", uid);
}

/**
 * Aplica filtros, busca textual, ordenação e paginação sobre uma
 * lista de gastos já carregada em memória.
 * @param {Array<object>} gastos
 * @param {{
 *   categoria?: string, formaPagamento?: string, busca?: string,
 *   dataInicio?: string, dataFim?: string,
 *   ordenarPor?: 'dataHora'|'valor', direcao?: 'asc'|'desc',
 *   pagina?: number, porPagina?: number
 * }} opcoes
 */
export function filtrarOrdenarPaginar(gastos, opcoes = {}) {
  let resultado = [...gastos];

  if (opcoes.categoria) {
    resultado = resultado.filter((g) => g.categoria === opcoes.categoria);
  }
  if (opcoes.formaPagamento) {
    resultado = resultado.filter((g) => g.formaPagamento === opcoes.formaPagamento);
  }
  if (opcoes.dataInicio) {
    resultado = resultado.filter((g) => new Date(g.dataHora) >= new Date(opcoes.dataInicio));
  }
  if (opcoes.dataFim) {
    resultado = resultado.filter((g) => new Date(g.dataHora) <= new Date(`${opcoes.dataFim}T23:59:59`));
  }
  if (opcoes.busca) {
    const termo = opcoes.busca.trim().toLowerCase();
    resultado = resultado.filter((g) =>
      [g.descricao, g.categoria, g.subcategoria, g.cidade, g.observacoes]
        .filter(Boolean)
        .some((campo) => campo.toLowerCase().includes(termo))
    );
  }

  const campo = opcoes.ordenarPor || "dataHora";
  const direcao = opcoes.direcao || "desc";
  resultado.sort((a, b) => {
    const va = campo === "valor" ? Number(a.valor) || 0 : new Date(a.dataHora).getTime();
    const vb = campo === "valor" ? Number(b.valor) || 0 : new Date(b.dataHora).getTime();
    return direcao === "asc" ? va - vb : vb - va;
  });

  const totalItens = resultado.length;
  const porPagina = opcoes.porPagina || 10;
  const pagina = opcoes.pagina || 1;
  const inicio = (pagina - 1) * porPagina;
  const itensDaPagina = resultado.slice(inicio, inicio + porPagina);

  return {
    itens: itensDaPagina,
    totalItens,
    totalPaginas: Math.max(1, Math.ceil(totalItens / porPagina)),
    pagina,
  };
}

/**
 * Captura a localização atual do navegador e resolve o endereço
 * (cidade/estado/país) via geocodificação reversa gratuita e sem
 * chave de API (BigDataCloud, client-side, com suporte a CORS).
 * @returns {Promise<{latitude:number, longitude:number, cidade:string, estado:string, pais:string, endereco:string}>}
 */
export function capturarLocalizacaoAtual() {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      reject(new Error("Geolocalização não é suportada neste navegador."));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (posicao) => {
        const { latitude, longitude } = posicao.coords;
        try {
          const resposta = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=pt`
          );
          const dados = await resposta.json();
          resolve({
            latitude,
            longitude,
            cidade: dados.city || dados.locality || "",
            estado: dados.principalSubdivision || "",
            pais: dados.countryName || "",
            endereco: [dados.locality, dados.principalSubdivision, dados.countryName]
              .filter(Boolean)
              .join(", "),
          });
        } catch (erro) {
          // Mesmo sem conseguir resolver o endereço, ainda temos as coordenadas.
          resolve({ latitude, longitude, cidade: "", estado: "", pais: "", endereco: "" });
        }
      },
      (erro) => reject(erro),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });
}
