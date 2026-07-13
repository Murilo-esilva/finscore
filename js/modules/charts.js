/**
 * modules/charts.js
 * ---------------------------------------------------------
 * STUB — Etapa 1 (estrutura do projeto).
 * Este módulo será implementado em uma etapa futura do plano
 * de entrega do FinScore, conforme "Forma de Entrega" do prompt.
 * A estrutura já existe para manter a arquitetura modular
 * prevista desde o início.
 * ---------------------------------------------------------
 */
/**
 * Cria um gráfico de pizza para gastos por categoria
 * @param {string} canvasId - ID do elemento canvas
 * @param {Array} despesas - Lista de despesas
 * @param {Object} opcoes - { tema: 'dark'|'light' }
 */
export function criarGraficoPizza(canvasId, despesas, opcoes = {}) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return null;
  const tema = opcoes.tema || "light";
  const isDark = tema === "dark" || document.documentElement.getAttribute("data-theme") === "dark";
  const textColor = isDark ? "#e0e0e0" : "#333";
  const gridColor = isDark ? "#444" : "#eee";
  // Agrupar por categoria
  const porCategoria = {};
  despesas.forEach((d) => {
    const cat = d.categoria || "Outro";
    porCategoria[cat] = (porCategoria[cat] || 0) + (d.valor || 0);
  });
  const labels = Object.keys(porCategoria);
  const dados = Object.values(porCategoria);
  const cores = gerarCoresGrafico(labels.length, isDark);
  // Carregar Chart.js se necessário
  if (typeof Chart === "undefined") {
    console.warn("Chart.js não está carregado");
    return null;
  }
  const ctx = canvas.getContext("2d");
  return new Chart(ctx, {
    type: "doughnut",
    data: {
      labels,
      datasets: [
        {
          data: dados,
          backgroundColor: cores,
          borderColor: isDark ? "#1a1a1a" : "#fff",
          borderWidth: 2,
          hoverBorderWidth: 3,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            color: textColor,
            font: { size: 12 },
            padding: 15,
          },
        },
        tooltip: {
          backgroundColor: isDark ? "#333" : "#fff",
          titleColor: textColor,
          bodyColor: textColor,
          borderColor: gridColor,
          borderWidth: 1,
          padding: 12,
          displayColors: true,
          callbacks: {
            label: function (context) {
              const value = context.parsed;
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const percentual = ((value / total) * 100).toFixed(1);
              return `R$ ${value.toFixed(2)} (${percentual}%)`;
            },
          },
        },
      },
    },
  });
}
/**
 * Cria um gráfico de linha para evolução diária de gastos
 * @param {string} canvasId - ID do elemento canvas
 * @param {Array} despesas - Lista de despesas
 * @param {Object} opcoes - { tema: 'dark'|'light', dias: 30 }
 */
export function criarGraficoLinha(canvasId, despesas, opcoes = {}) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return null;
  const tema = opcoes.tema || "light";
  const isDark = tema === "dark" || document.documentElement.getAttribute("data-theme") === "dark";
  const textColor = isDark ? "#e0e0e0" : "#333";
  const gridColor = isDark ? "#444" : "#eee";
  const lineColor = "#6366f1"; // Indigo
  const areaColor = isDark ? "rgba(99, 102, 241, 0.1)" : "rgba(99, 102, 241, 0.05)";
  // Gerar últimos 30 dias
  const diasData = {};
  for (let i = 29; i >= 0; i--) {
    const data = new Date();
    data.setDate(data.getDate() - i);
    const chave = data.toLocaleDateString("pt-BR");
    diasData[chave] = 0;
  }
  despesas.forEach((d) => {
    const data = new Date(d.dataHora).toLocaleDateString("pt-BR");
    if (diasData.hasOwnProperty(data)) {
      diasData[data] += d.valor || 0;
    }
  });
  const labels = Object.keys(diasData);
  const dados = Object.values(diasData);
  if (typeof Chart === "undefined") {
    console.warn("Chart.js não está carregado");
    return null;
  }
  const ctx = canvas.getContext("2d");
  return new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Gastos por dia (R$)",
          data: dados,
          borderColor: lineColor,
          backgroundColor: areaColor,
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          pointBackgroundColor: lineColor,
          pointBorderColor: isDark ? "#1a1a1a" : "#fff",
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          labels: { color: textColor },
        },
        tooltip: {
          backgroundColor: isDark ? "#333" : "#fff",
          titleColor: textColor,
          bodyColor: textColor,
          borderColor: gridColor,
          borderWidth: 1,
          padding: 12,
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: { color: gridColor },
          ticks: { color: textColor },
          title: { display: true, text: "R$" },
        },
        x: {
          grid: { color: gridColor },
          ticks: { color: textColor },
        },
      },
    },
  });
}
/**
 * Cria um gráfico de barras para gastos por semana
 * @param {string} canvasId - ID do elemento canvas
 * @param {Array} despesas - Lista de despesas
 * @param {Object} opcoes - { tema: 'dark'|'light' }
 */
export function criarGraficoBarras(canvasId, despesas, opcoes = {}) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return null;
  const tema = opcoes.tema || "light";
  const isDark = tema === "dark" || document.documentElement.getAttribute("data-theme") === "dark";
  const textColor = isDark ? "#e0e0e0" : "#333";
  const gridColor = isDark ? "#444" : "#eee";
  const barColor = "#8b5cf6"; // Purple
  // Agrupar por semana
  const porSemana = {};
  despesas.forEach((d) => {
    const data = new Date(d.dataHora);
    const semana = `Sem ${Math.ceil(data.getDate() / 7)}`;
    porSemana[semana] = (porSemana[semana] || 0) + (d.valor || 0);
  });
  const labels = Object.keys(porSemana);
  const dados = Object.values(porSemana);
  if (typeof Chart === "undefined") {
    console.warn("Chart.js não está carregado");
    return null;
  }
  const ctx = canvas.getContext("2d");
  return new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Gastos por semana (R$)",
          data: dados,
          backgroundColor: barColor,
          borderColor: isDark ? "#6d28d9" : "#7c3aed",
          borderWidth: 1,
          hoverBackgroundColor: "#7c3aed",
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      indexAxis: undefined,
      plugins: {
        legend: {
          labels: { color: textColor },
        },
        tooltip: {
          backgroundColor: isDark ? "#333" : "#fff",
          titleColor: textColor,
          bodyColor: textColor,
          borderColor: gridColor,
          borderWidth: 1,
          padding: 12,
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: { color: gridColor },
          ticks: { color: textColor },
        },
        x: {
          grid: { color: gridColor },
          ticks: { color: textColor },
        },
      },
    },
  });
}
/**
 * Cria um gráfico de área para evolução mensal
 * @param {string} canvasId - ID do elemento canvas
 * @param {Array} despesas - Lista de despesas (histórico de meses)
 * @param {Object} opcoes - { tema: 'dark'|'light', meses: 12 }
 */
export function criarGraficoArea(canvasId, despesas, opcoes = {}) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return null;
  const tema = opcoes.tema || "light";
  const isDark = tema === "dark" || document.documentElement.getAttribute("data-theme") === "dark";
  const textColor = isDark ? "#e0e0e0" : "#333";
  const gridColor = isDark ? "#444" : "#eee";
  const areaColor = "#ec4899"; // Pink
  // Agrupar por mês
  const porMes = {};
  const agora = new Date();
  
  for (let i = 11; i >= 0; i--) {
    const data = new Date(agora);
    data.setMonth(data.getMonth() - i);
    const mes = data.toLocaleDateString("pt-BR", { month: "short", year: "numeric" });
    porMes[mes] = 0;
  }
  despesas.forEach((d) => {
    const data = new Date(d.dataHora);
    const mes = data.toLocaleDateString("pt-BR", { month: "short", year: "numeric" });
    if (porMes.hasOwnProperty(mes)) {
      porMes[mes] += d.valor || 0;
    }
  });
  const labels = Object.keys(porMes);
  const dados = Object.values(porMes);
  if (typeof Chart === "undefined") {
    console.warn("Chart.js não está carregado");
    return null;
  }
  const ctx = canvas.getContext("2d");
  return new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Gastos mensais (R$)",
          data: dados,
          borderColor: areaColor,
          backgroundColor: isDark ? "rgba(236, 72, 153, 0.1)" : "rgba(236, 72, 153, 0.05)",
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          pointBackgroundColor: areaColor,
          pointBorderColor: isDark ? "#1a1a1a" : "#fff",
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          labels: { color: textColor },
        },
        tooltip: {
          backgroundColor: isDark ? "#333" : "#fff",
          titleColor: textColor,
          bodyColor: textColor,
          borderColor: gridColor,
          borderWidth: 1,
          padding: 12,
          callbacks: {
            label: function (context) {
              return `R$ ${context.parsed.y.toFixed(2)}`;
            },
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: { color: gridColor },
          ticks: { color: textColor },
        },
        x: {
          grid: { color: gridColor },
          ticks: { color: textColor },
        },
      },
    },
  });
}
/**
 * Gera um array de cores harmoniosas para gráficos
 * @param {number} quantidade - Número de cores necessárias
 * @param {boolean} isDark - Se modo escuro
 */
function gerarCoresGrafico(quantidade, isDark = false) {
  const cores = [
    "#6366f1", // Indigo
    "#8b5cf6", // Purple
    "#d946ef", // Fuchsia
    "#ec4899", // Pink
    "#f43f5e", // Rose
    "#f97316", // Orange
    "#eab308", // Yellow
    "#84cc16", // Lime
    "#22c55e", // Green
    "#06b6d4", // Cyan
    "#0ea5e9", // Sky
    "#3b82f6", // Blue
  ];
  return cores.slice(0, quantidade);
}
/**
 * Heatmap de gastos por dia da semana (placeholder)
 * @param {string} canvasId - ID do elemento canvas
 * @param {Array} despesas - Lista de despesas
 * @param {Object} opcoes - { tema: 'dark'|'light' }
 */
export function criarHeatmap(canvasId, despesas, opcoes = {}) {
  // Estrutura preparada para implementação futura
  // Pode usar bibliotecas como plotly.js ou d3.js
  console.log("Heatmap preparado para implementação futura com plotly.js");
}
export default {
  criarGraficoPizza,
  criarGraficoLinha,
  criarGraficoBarras,
  criarGraficoArea,
  criarHeatmap,
};
