// home.js 


// --- FUNÇÕES DE ATUALIZAÇÃO DE DADOS ---

/**
 * Busca no backend a LISTA DETALHADA de ativos que não estão operacionais.
 */
async function fetchAtivosComAlerta() {
    try {
        const response = await fetch(`${API_BASE_URL}/ativos/alertas`);
        if (!response.ok) {
            throw new Error(`Erro na API ao buscar alertas: ${response.statusText}`);
        }
        return await response.json(); // Retorna a lista de ativos.
    } catch (error) {
        console.error(error);
        const container = document.getElementById('ativos-com-alerta-container');
        container.innerHTML = `<div class="status-item"><span style="opacity: 0.7;">Não foi possível carregar os alertas.</span></div>`;
        // Em caso de erro, retorna um array vazio para não quebrar o resto do código.
        return [];
    }
}


async function atualizarIndicadores() {
    try {
        // --- PEÇAS EM ESTOQUE ---
        const pecasResponse = await fetch(`${API_BASE_URL}/estoque_pecas`);
        const pecasData = await pecasResponse.json();
        document.getElementById('estoque-total').textContent = pecasData.estoque;
        document.getElementById('entrada-pecas').textContent = pecasData.entrada;
        document.getElementById('saida-pecas').textContent = pecasData.saida;

        // 1. Busca o total de ativos operacionais (sua chamada de API existente).
        const totalAtivosResponse = await fetch(`${API_BASE_URL}/ativos/status`);
        const totalAtivosData = await totalAtivosResponse.json();
        const ativosMap = new Map(totalAtivosData.map(s => [s.Status, s.quantidade]));
        document.getElementById('ativos-ativo').textContent = ativosMap.get('ativo') || 0;

        // 2. Busca a LISTA REAL de ativos que precisam de atenção.
        const ativosComAlerta = await fetchAtivosComAlerta();
        const container = document.getElementById('ativos-com-alerta-container');
        container.innerHTML = ''; // Limpa o container antes de adicionar os novos itens.

        // 3. Se não houver alertas, exibe uma mensagem informativa.
        if (ativosComAlerta.length === 0) {
            container.innerHTML = `<div class="status-item"><span style="opacity: 0.7;">Nenhum ativo com alerta no momento.</span></div>`;
        }

        // 4. Cria a interface dinamicamente para cada ativo com alerta.
        ativosComAlerta.forEach(ativo => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'ativo-alerta-item';

            const iconMap = {
                'Inativo': 'fa-times-circle',
                'Em Manutenção': 'fa-wrench',
                'Condenado': 'fa-ban'
            };
            const iconClass = iconMap[ativo.status] || 'fa-exclamation-circle';
            const corStatus = ativo.cor_status || '#9ca3af'; // Cor padrão

            const infoDiv = document.createElement('div');
            infoDiv.className = 'info';
            infoDiv.innerHTML = `
                <span class="asset-name"><i class="fas ${iconClass}" style="color:${corStatus};"></i> ${ativo.nome}</span>
                <span class="asset-status ms-4">${ativo.status}</span>
            `;

            const button = document.createElement('button');
            button.className = 'btn-gemini';
            button.innerHTML = '<i class="fas fa-brain me-1"></i> Analisar';
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                handleGeminiAnalysis(ativo);
            });

            itemDiv.appendChild(infoDiv);
            itemDiv.appendChild(button);
            container.appendChild(itemDiv);
        });

        // --- STATUS DAS ORDENS DE MANUTENÇÃO ---
        const omResponse = await fetch(`${API_BASE_URL}/om/status`);
        const statusOm = await omResponse.json();
        const omMap = new Map(statusOm.map(s => [s.Status, s.quantidade]));
        document.getElementById('om-aberto').textContent = omMap.get('Aberta') || 0;
        document.getElementById('om-em-andamento').textContent = omMap.get('Em Andamento') || 0;
        document.getElementById('om-concluida').textContent = omMap.get('Concluida') || 0;

    } catch (error) {
        console.error("Erro ao atualizar indicadores:", error);
    }
}

async function carregarDadosSensores() {
    try {
        const response = await fetch(`${API_BASE_URL}/dados`);
        const dados = await response.json();
        const temperatura = dados.filter(d => d.Topico === 'Cypher/Temperatura' && !isNaN(d.Valor));
        const umidade = dados.filter(d => d.Topico === 'Cypher/Umidade' && !isNaN(d.Valor));
        const valorTempAtual = temperatura.length > 0 ? temperatura[temperatura.length - 1].Valor : '--';
        const valorUmidAtual = umidade.length > 0 ? umidade[umidade.length - 1].Valor : '--';
        document.getElementById('temp').textContent = valorTempAtual + ' °C';
        document.getElementById('umid').textContent = valorUmidAtual + ' %';
        const media = (arr) => arr.length > 0 ? (arr.reduce((soma, item) => soma + parseFloat(item.Valor), 0) / arr.length).toFixed(1) : '--';
        document.getElementById('mediaTemp').textContent = media(temperatura) + ' °C';
        document.getElementById('mediaUmid').textContent = media(umidade) + ' %';
        if (chartTemp && chartUmid) {
            chartTemp.data.labels = temperatura.map(d => new Date(d.Data_Hora).toLocaleTimeString());
            chartTemp.data.datasets[0].data = temperatura.map(d => parseFloat(d.Valor));
            chartTemp.update();
            chartUmid.data.labels = umidade.map(d => new Date(d.Data_Hora).toLocaleTimeString());
            chartUmid.data.datasets[0].data = umidade.map(d => parseFloat(d.Valor));
            chartUmid.update();
        }
    } catch (erro) {
        console.error('Erro ao carregar dados dos sensores:', erro);
    }
}


// =========================================================
//  FUNÇÃO DE COMUNICAÇÃO COM A API (GEMINI)
// =========================================================
async function callGeminiAPI(prompt) {

    const apiUrl = `http://localhost:5000/analisar_ia`; 

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: prompt })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Erro na ponte do servidor.');
        }

        const result = await response.json();


        return result.candidates?.[0]?.content?.parts?.[0]?.text || "Erro: O Gemini respondeu vazio.";

    } catch (error) {
        console.error("Erro na Requisição via Backend:", error);
        throw error;
    }
}

// =========================================================
//  FORMATAÇÃO VISUAL (HTML/MARKDOWN)
// =========================================================
function formatAIResponse(text) {
    if (!text) return '<p class="text-danger">Sem resposta para formatar.</p>';

    let html = '';
    const lines = text.split('\n').filter(line => line.trim() !== '');
    let inList = false;

    lines.forEach(line => {
        // Transforma **texto** em negrito
        let processedLine = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

        // Transforma linhas com * em lista (bullet points)
        if (processedLine.trim().startsWith('*')) {
            if (!inList) { html += '<ul>'; inList = true; }
            html += `<li>${processedLine.trim().substring(1).trim()}</li>`;
        } else {
            if (inList) { html += '</ul>'; inList = false; }

            // Se tiver negrito na linha, assume que é título, senão é parágrafo
            if (processedLine.includes('<strong>')) {
                html += `<h6 class="mt-3 text-primary">${processedLine}</h6>`;
            } else {
                html += `<p>${processedLine}</p>`;
            }
        }
    });

    if (inList) { html += '</ul>'; }
    return `<div class="ai-response-formatted">${html}</div>`;
}

// =========================================================
// FUNÇÃO DA TELA (QUEM CHAMA TUDO)
// =========================================================
async function handleGeminiAnalysis(ativo) {
    // 1. Abre o Modal
    if (!geminiModal) return;
    geminiModal.show();

    const responseEl = document.getElementById('gemini-response');
    const titleName = document.getElementById('gemini-asset-name');
    const titleStatus = document.getElementById('gemini-asset-status');

    // 2. Preenche dados iniciais e mostra Loading
    titleName.textContent = ativo.nome || "Ativo Desconhecido";
    titleStatus.textContent = ativo.status || "Status N/A";

    responseEl.style.textAlign = 'center';
    responseEl.innerHTML = `
        <div class="d-flex flex-column align-items-center justify-content-center py-4">
            <div class="spinner-border text-primary" role="status"></div>
            <p class="mt-3 text-muted">Consultando IA especializada...</p>
        </div>
    `;

    // 3. Monta o Prompt
    const prompt = `
        Atue como especialista em manutenção industrial.
        Ativo: "${ativo.nome}" (ID: ${ativo.id})
        Status Atual: "${ativo.status}"
        Último Erro/Log: "${ativo.ultimo_erro || 'Nenhum erro registrado'}"
        
        Gere uma análise técnica curta e direta contendo:
        **1. Possíveis Causas:** Cite 3 prováveis motivos técnicos.
        **2. Plano de Ação:** Cite 3 passos imediatos para o técnico executar.
        
        Use linguagem técnica, português do Brasil.
    `;

    // 4. Chama a API e Trata o Resultado
    try {
        const textoResposta = await callGeminiAPI(prompt);

        // Formata e exibe
        responseEl.style.textAlign = 'left';
        responseEl.innerHTML = formatAIResponse(textoResposta);

    } catch (erro) {
        // Se der ruim, mostra mensagem bonita pro usuário em vez de travar
        responseEl.style.textAlign = 'center';
        responseEl.innerHTML = `
            <div class="alert alert-danger" role="alert">
                <i class="fa-solid fa-triangle-exclamation me-2"></i>
                Falha ao consultar a Inteligência Artificial.<br>
                <small class="text-muted">${erro.message}</small>
            </div>
        `;
    }
}

// --- INICIALIZAÇÃO DA PÁGINA ---
document.addEventListener("DOMContentLoaded", () => {
    const geminiModalElement = document.getElementById('geminiAnalysisModal');
    if (geminiModalElement) {
        geminiModal = new bootstrap.Modal(geminiModalElement);
    }
    const ctxTemp = document.getElementById('graficoTemp').getContext('2d');
    const ctxUmid = document.getElementById('graficoUmid').getContext('2d');
    chartTemp = new Chart(ctxTemp, { type: 'line', data: { labels: [], datasets: [{ label: 'Temperatura (°C)', data: [], borderColor: 'white', borderWidth: 2, tension: 0.2 }] }, options: { plugins: { legend: { labels: { color: 'white' } } }, scales: { x: { ticks: { color: 'white' }, grid: { color: 'rgba(255, 255, 255, 0.2)' } }, y: { ticks: { color: 'white' }, grid: { color: 'rgba(255, 255, 255, 0.2)' } } } } });
    chartUmid = new Chart(ctxUmid, { type: 'line', data: { labels: [], datasets: [{ label: 'Umidade (%)', data: [], borderColor: 'white', borderWidth: 2, tension: 0.2 }] }, options: { plugins: { legend: { labels: { color: 'white' } } }, scales: { x: { ticks: { color: 'white' }, grid: { color: 'rgba(255, 255, 255, 0.2)' } }, y: { ticks: { color: 'white' }, grid: { color: 'rgba(255, 255, 255, 0.2)' } } } } });
    particlesJS('particles-js', { particles: { number: { value: 50, density: { enable: true, value_area: 800 } }, color: { value: "#0d6efd" }, shape: { type: "circle" }, opacity: { value: 0.7, random: true }, size: { value: 3, random: true }, line_linked: { enable: true, distance: 150, color: "#0d6efd", opacity: 0.2, width: 1 }, move: { enable: true, speed: 1, direction: "none", out_mode: "out" } }, interactivity: { detect_on: "canvas", events: { onhover: { enable: true, mode: "grab" } }, modes: { grab: { distance: 140, line_linked: { opacity: 0.5 } } } }, retina_detect: true });

    atualizarIndicadores();
    carregarDadosSensores();
    setInterval(atualizarIndicadores, 15000);
    setInterval(carregarDadosSensores, 10000);
});


/* chatbot-button.js
   Módulo autônomo. Usa IIFE para não poluir o escopo global.
   Regras:
   - Não altera variáveis globais.
   - Event listeners anexados ao root apenas.
   - Fornece hooks (callbacks) para integração com chat backend.
*/
(function () {
    const ROOT_ID = 'sgmi-chatbot-root';
    const BTN_ID = 'sgmi-chatbot-btn';
    const MODAL_ID = 'sgmi-chatbot-modal';
    const CLOSE_SEL = '.sgmi-chatbot-close';

    const root = document.getElementById(ROOT_ID);
    if (!root) {
        console.warn('[sgmi-chatbot] root element not found. Skipping initialization.');
        return;
    }

    const btn = document.getElementById(BTN_ID);
    const modal = document.getElementById(MODAL_ID);
    const closeBtn = modal ? modal.querySelector(CLOSE_SEL) : null;

    // Estado encapsulado
    let state = { open: false };

    // Accessibility: allow open/close with keyboard
    function onKeyDown(e) {
        if (!state.open && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            toggleModal(true);
        } else if (state.open && e.key === 'Escape') {
            toggleModal(false);
        }
    }

    function toggleModal(open) {
        state.open = !!open;
        if (modal) modal.setAttribute('aria-hidden', (!state.open).toString());
        if (btn) {
            btn.setAttribute('aria-pressed', state.open ? 'true' : 'false');
            if (state.open) btn.classList.remove('sgmi-idle'); else btn.classList.add('sgmi-idle');
        }
        // focus management
        if (state.open) {
            // focus the modal for keyboard users
            const focusable = modal && modal.querySelector('button, [href], input, textarea, [tabindex]:not([tabindex="-1"])');
            if (focusable) focusable.focus();
        } else {
            if (btn) btn.focus();
        }
    }

    // Click handlers
    function onBtnClick(e) {
        e.stopPropagation && e.stopPropagation();
        toggleModal(!state.open);
    }

    function onOutsideClick(e) {
        // close modal when clicking outside (but be careful with nested components)
        if (!state.open || !modal) return;
        const within = modal.contains(e.target) || btn.contains(e.target);
        if (!within) toggleModal(false);
    }

    // Attach handlers safely
    btn && btn.addEventListener('click', onBtnClick);
    btn && btn.addEventListener('keydown', onKeyDown);
    closeBtn && closeBtn.addEventListener('click', () => toggleModal(false));
    document.addEventListener('click', onOutsideClick);

    // Initialize idle breathing animation
    // start as idle
    if (btn) btn.classList.add('sgmi-idle');

    // Expose a safe hook for integration (no global leak)
    // window.SGMI_CHATBOT is used only if developer explicitly sets it (not created here)
    // To integrate chat behavior, assign handlers to window.SGMI_CHATBOT in your own code:
    // window.SGMI_CHATBOT = { onOpen: fn(), onClose: fn(), onSendMessage: async fn(message) => response }
    try {
        if (window.SGMI_CHATBOT && typeof window.SGMI_CHATBOT.onOpen === 'function') {
            // call onOpen when modal is opened
            const originalToggle = toggleModal;
            toggleModal = function (open) {
                originalToggle(open);
                if (open) window.SGMI_CHATBOT.onOpen();
                else if (typeof window.SGMI_CHATBOT.onClose === 'function') window.SGMI_CHATBOT.onClose();
            };
        }
    } catch (err) {
        // fail silently
        console.warn('[sgmi-chatbot] hook init error', err);
    }

    // Clean-up API (returns a function to remove listeners) — useful if SPA changes route
    function uninstall() {
        btn && btn.removeEventListener('click', onBtnClick);
        btn && btn.removeEventListener('keydown', onKeyDown);
        closeBtn && closeBtn.removeEventListener('click', () => toggleModal(false));
        document.removeEventListener('click', onOutsideClick);
    }

    // Attach to root dataset for external control if needed
    root.sgmiChatbot = { toggleModal, uninstall };

    // safety: prevent accidental autosubmit in forms when pressing Enter on the button
    btn && btn.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') e.preventDefault();
    });

})();


// --- INICIALIZAÇÃO DA PÁGINA ---
document.addEventListener("DOMContentLoaded", () => {
    // Inicializa o modal de análise de ativos
    const geminiModalElement = document.getElementById('geminiAnalysisModal');
    if (geminiModalElement) {
        geminiModal = new bootstrap.Modal(geminiModalElement);
    }

});

document.addEventListener("DOMContentLoaded", () => {
    const idFuncionario = localStorage.getItem("ID");
    const notificacoesContainer = document.getElementById("notificacoesContainer");

    if (!idFuncionario) {
        notificacoesContainer.innerHTML = `<p class="text-gray-500">Nenhuma notificação disponível. Faça login como funcionário para continuar.</p>`;
        return;
    }

    const buscarOrdens = async () => {
        try {
            const res = await fetch(`http://localhost:5000/funcionarios/${idFuncionario}/ordens`);
            if (!res.ok) throw new Error(`Erro HTTP: ${res.status}`);
            const ordens = await res.json();

            const ordensFiltradas = ordens.filter(ordem =>
                ordem.Status === "Aberta" || ordem.Status === "Em Andamento"
            );

            notificacoesContainer.innerHTML = '';

            if (ordensFiltradas.length === 0) {
                notificacoesContainer.innerHTML = `<p class="text-gray-500">Nenhuma notificação no momento.</p>`;
                return;
            }

            ordensFiltradas.forEach(ordem => {
                const corStatus = ordem.Status === "Aberta" ? "red-400" : "yellow-400";
                const icone = ordem.Status === "Aberta" ? "fa-exclamation-circle" : "fa-exclamation-triangle";

                // Card clicável estilizado com Tailwind
                const cardHTML = `
                    <div 
                        class="status-item flex justify-between items-center p-3 mb-2 rounded-lg border-l-4 border-${corStatus} hover:bg-gray-100 cursor-pointer"
                        onclick="window.location.href='./Notificacao.html?idOrdem=${ordem.id_Ordem}'"
                    >
                        <span class="flex items-center gap-2">
                            <i class="fas ${icone} text-${corStatus}"></i>
                            Ordem ${ordem.id_Ordem}: ${ordem.Descricao_Problema}
                        </span>
                        <span class="status-value text-${corStatus} font-semibold">${ordem.Status}</span>
                    </div>
                `;

                notificacoesContainer.innerHTML += cardHTML;
            });

        } catch (err) {
            console.error("Erro ao buscar ordens:", err);
            notificacoesContainer.innerHTML = `<p class="text-red-400">Erro ao carregar notificações.</p>`;
        }
    };

    buscarOrdens();
});
