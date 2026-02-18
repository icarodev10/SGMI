// ==================== CONFIGURAÇÃO GLOBAL ====================
Chart.defaults.color = '#ffffff';
Chart.defaults.plugins.legend.labels.color = '#ffffff';
Chart.defaults.plugins.title.color = '#ffffff';
Chart.defaults.font.family = "'Arial', sans-serif";
Chart.defaults.elements.line.borderWidth = 2;
Chart.defaults.elements.point.radius = 3;

// ==================== VARIÁVEIS GLOBAIS ====================
let totalPIR = 0;
let ultimoPIR = 0; // timestamp do último registro PIR processado

// ==================== FUNÇÃO AUXILIAR ====================
function formatarHora(dataHora) {
    if (!dataHora) return "";
    const data = new Date(dataHora);
    return data.toLocaleTimeString();
}

// ==================== FUNÇÃO PARA CRIAR GRÁFICOS ====================
function criarGrafico(canvasId, label, borderColor, backgroundColor, stepped = false, yMin = null, yMax = null, stepSize = null) {
    return new Chart(document.getElementById(canvasId), {
        type: "line",
        data: { datasets: [{ label, data: [], borderColor, backgroundColor, tension: stepped ? 0 : 0.3, stepped }] },
        options: {
            responsive: true,
            plugins: {
                legend: { labels: { color: "#ffffff" } },
                title: { display: false },
                tooltip: { callbacks: { label: ctx => ctx.dataset.label + ": " + ctx.raw.y } }
            },
            scales: {
                x: {
                    type: "time",
                    time: { unit: "second", tooltipFormat: "HH:mm:ss" },
                    ticks: { color: "#ffffff" },
                    grid: { color: "rgba(255,255,255,0.2)" }
                },
                y: {
                    min: yMin,
                    max: yMax,
                    ticks: { stepSize: stepSize, color: "#ffffff" },
                    grid: { color: "rgba(255,255,255,0.2)" }
                }
            }
        }
    });
}

// ==================== INICIALIZAÇÃO DOS GRÁFICOS ====================
const chartTemp = criarGrafico("graficoTemp", "Temperatura (°C)", "#f87171", "#fca5a5");
const chartUmid = criarGrafico("graficoUmid", "Umidade (%)", "#60a5fa", "#93c5fd");
const chartPir = criarGrafico("graficoPir", "Detecção PIR", "#34d399", "#6ee7b7", true, 0, 1, 1);
const chartEstoque = criarGrafico("graficoEstoque", "Estoque", "#a78bfa", "#c4b5fd");
const chartVibracao = criarGrafico("graficoVibracao", "Vibração (microns)", "#fbbf24", "#fde68a");
const chartLuminosidade = criarGrafico("graficoLuminosidade", "Luminosidade (lx)", "#eb66b8ff", "#ee7dbfff");

// ==================== FUNÇÃO PARA ATUALIZAR PIR ====================
function atualizarPIR(dados) {
    // Converte Valor de string JSON para objeto
    const PIR = dados
        .filter(d => d.Topico === "Cypher/Presenca")
        .map(d => {
            try { 
                return { ...d, Valor: JSON.parse(d.Valor) }; 
            } catch { 
                return d; 
            }
        });

    // Filtra apenas registros novos com base no timestamp
    const novos = PIR.filter(d => d.Valor && d.Valor.hora > ultimoPIR);

    // Atualiza contagem total de movimento
    totalPIR += novos.filter(d => d.Valor && d.Valor.valor == 1).length; // usa == para aceitar string "1"
    document.getElementById("pir_total").textContent = totalPIR;

    // Últimos 15 registros para gráfico
    const PIRultimos = PIR.slice(-15);

    // Atualiza status do sensor
    let ultimoValor = PIRultimos.length ? PIRultimos.at(-1).Valor.valor : 0;
    document.getElementById("pir_status").textContent = (ultimoValor == 1) ? "Detectado" : "Sem movimento";

    // Atualiza gráfico
    chartPir.data.datasets[0].data = PIRultimos.map(d => ({
        x: new Date(d.Valor.hora * 1000),
        y: (d.Valor.valor == 1 ? 1 : 0)
    }));
    chartPir.update();

    // Atualiza último timestamp processado
    if (PIRultimos.length > 0) {
        ultimoPIR = PIRultimos.at(-1).Valor.hora;
    }
}

// ==================== FUNÇÃO PRINCIPAL ====================
async function carregarDados() {
    try {
        const resposta = await fetch("http://localhost:5000/dados");
        const dados = await resposta.json();
        console.log("📊 Dados recebidos:", dados);

        // --- TEMPERATURA ---
        const Temperatura = dados.filter(d => d.Topico === "Cypher/Temperatura" && !isNaN(parseFloat(d.Valor))).slice(-15);
        document.getElementById("temp").textContent = Temperatura.at(-1)?.Valor + " °C" || "-- °C";
        document.getElementById("mediaTemp").textContent = Temperatura.length ? 
            (Temperatura.reduce((s,v)=>s+parseFloat(v.Valor),0)/Temperatura.length).toFixed(1)+" °C" : "-- °C";
        chartTemp.data.datasets[0].data = Temperatura.map(d => ({ x: d.Data_Hora, y: parseFloat(d.Valor) }));
        chartTemp.update();

        // --- UMIDADE ---
        const Umidade = dados.filter(d => d.Topico === "Cypher/Umidade" && !isNaN(parseFloat(d.Valor))).slice(-15);
        document.getElementById("umid").textContent = Umidade.at(-1)?.Valor + " %" || "-- %";
        document.getElementById("mediaUmid").textContent = Umidade.length ? 
            (Umidade.reduce((s,v)=>s+parseFloat(v.Valor),0)/Umidade.length).toFixed(1)+" %" : "-- %";
        chartUmid.data.datasets[0].data = Umidade.map(d => ({ x: d.Data_Hora, y: parseFloat(d.Valor) }));
        chartUmid.update();

        // --- PIR ---
        atualizarPIR(dados);

        // --- ESTOQUE ---
        const Estoque = dados.filter(d => d.Topico === "Cypher/Estoque" && !isNaN(parseFloat(d.Valor))).slice(-15);
        document.getElementById("estoque_Detc").textContent = Estoque.at(-1)?.Valor || "--";
        chartEstoque.data.datasets[0].data = Estoque.map(d => ({ x: d.Data_Hora, y: parseFloat(d.Valor) }));
        chartEstoque.update();

        // --- VIBRAÇÃO ---
        const Vibracao = dados.filter(d => d.Topico === "Cypher/Vibracao" && !isNaN(parseFloat(d.Valor))).slice(-15);
        document.getElementById("vibracao").textContent = Vibracao.length ? 
            (Vibracao.reduce((s,v)=>s+parseFloat(v.Valor),0)/Vibracao.length).toFixed(1)+" microns" : "-- microns";
        chartVibracao.data.datasets[0].data = Vibracao.map(d => ({ x: d.Data_Hora, y: parseFloat(d.Valor) }));
        chartVibracao.update();

        // --- LUMINOSIDADE ---
        const Luminosidade = dados.filter(d => d.Topico === "Cypher/Luminosidade" && !isNaN(parseFloat(d.Valor))).slice(-15);
        document.getElementById("luminosidade").textContent = Luminosidade.length ? 
            (Luminosidade.reduce((s,v)=>s+parseFloat(v.Valor),0)/Luminosidade.length).toFixed(1)+" lx" : "-- lx";
        chartLuminosidade.data.datasets[0].data = Luminosidade.map(d => ({ x: d.Data_Hora, y: parseFloat(d.Valor) }));
        chartLuminosidade.update();

    } catch (erro) {
        console.error("❌ Erro ao carregar dados:", erro);
    }
}

// ==================== ATUALIZAÇÃO AUTOMÁTICA ====================
(async function atualizar() {
    await carregarDados();
    setInterval(carregarDados, 5000);
})();
