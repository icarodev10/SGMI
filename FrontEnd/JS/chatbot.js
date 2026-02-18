document.addEventListener('DOMContentLoaded', () => {
    // ----------------- PARTICLES -----------------
    if (window.particlesJS) {
        particlesJS('particles-js', {
            "particles": {
                "number": { "value": 50, "density": { "enable": true, "value_area": 800 } },
                "color": { "value": "#0d6efd" },
                "shape": { "type": "circle" },
                "opacity": { "value": 0.7, "random": true },
                "size": { "value": 3, "random": true },
                "line_linked": { "enable": true, "distance": 150, "color": "#0d6efd", "opacity": 0.2, "width": 1 },
                "move": { "enable": true, "speed": 1, "direction": "none", "out_mode": "out" }
            },
            "interactivity": {
                "detect_on": "canvas",
                "events": { "onhover": { "enable": true, "mode": "grab" } },
                "modes": { "grab": { "distance": 140, "line_linked": { "opacity": 0.5 } } }
            },
            "retina_detect": true
        });
    }

    // -------------------- ESTILO GLOBAL --------------------
    const estiloGlobal = document.createElement('style');
    estiloGlobal.textContent = `
        input[type="text"], input[type="number"], input[type="date"], select {
            height: 30px;
            line-height: 30px;
            color: white !important;
            background-color: transparent !important;
            border: 1px solid white !important;
            border-radius: 6px !important;
            padding: 0 8px !important;
            outline: none;
            display: inline-block;
            vertical-align: middle;
        }

        select option {
            background-color: rgb(25, 0, 99) !important;
            color: white !important;
        }

        input::placeholder {
            color: rgba(255, 255, 255, 0.8);
        }

        .form-select, .filtroSelect {
            background-color: transparent !important;
            color: white !important;
            border: 1px solid white !important;
            border-radius: 6px !important;
            padding: 4px 6px !important;
        }

        .form-select option, .filtroSelect option {
            background-color: rgb(25, 0, 99) !important;
            color: white !important;
        }
    `;
    document.head.appendChild(estiloGlobal);

    // -------------------- Elementos --------------------
    const dialog = document.getElementById("dialog");
    const btnEnviar = document.querySelector("#BtnEnviar button");
    const chatMessages = document.getElementById("ai-chat-messages");

    // -------------------- Estado Global --------------------
    let operacaoAtual = {
        tipo: null,
        tabela: null,
        id: null,
        subtipo: null,
        periodo: null,
        filtros: [],
        dia1: null,
        dia2: null,
        page: 1,
        page_size: 10,
        statusSelect: null,
        statusAnterior: null,
        statusAtual: null,
        prioridadeSelect: null
    };

    // -------------------- Função de Mensagens --------------------
    function addMessage(content, sender) {
        const div = document.createElement('div');
        div.className = sender === 'user' ? 'message user-message' : 'message ai-message';
        div.innerHTML = `<p style="color:white; margin:5px 0; white-space:pre-wrap;">${content}</p>`;
        chatMessages.appendChild(div);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // -------------------- Habilitar botão --------------------
    function habilitarBotao(inputId) {
        if (!inputId) {
            btnEnviar.disabled = false;
        } else {
            const input = document.getElementById(inputId);
            btnEnviar.disabled = !input.value;
            input.addEventListener('input', () => {
                btnEnviar.disabled = !input.value;
            });
        }
    }

    // -------------------- Função genérica de menus --------------------
    function criarMenu(dropdownButton, menuElement, itens, callback) {
        menuElement.innerHTML = '';
        itens.forEach(item => {
            const li = document.createElement('li');
            const a = document.createElement('a');
            a.className = 'dropdown-item';
            a.href = "#";
            a.textContent = item.text || item;
            if (item.dataset) Object.keys(item.dataset).forEach(k => a.dataset[k] = item.dataset[k]);
            li.appendChild(a);
            menuElement.appendChild(li);
            a.addEventListener('click', (e) => {
                e.preventDefault();
                callback(item, a);
            });
        });
        const bsDropdown = bootstrap.Dropdown.getOrCreateInstance(dropdownButton);
        bsDropdown.show();
    }

    // -------------------- Consulta por ID --------------------
    document.querySelectorAll("#menuConsultaId .dropdown-item").forEach(item => {
        item.addEventListener("click", () => {
            operacaoAtual = { tipo: 'consulta', tabela: item.textContent, id: null };
            dialog.innerHTML = `
                <span style="color:white;">Consultar o ID</span>
                <input type="number" id="inputId" placeholder="Digite o ID" style="margin-left:5px; margin-right:5px;">
                <span style="color:white;">na tabela <b>${operacaoAtual.tabela}</b></span>
            `;
            habilitarBotao("inputId");
        });
    });

    // -------------------- Total --------------------
    const dropdownButtonTotal = document.getElementById('dropdownButtonTotal');
    const menuTables = document.getElementById('menuTables');
    const totalTables = ['Ativos', 'Sensores', 'Ordens', 'Peças'];

    dropdownButtonTotal.addEventListener('click', () => {
        criarMenu(dropdownButtonTotal, menuTables, totalTables.map(t => ({ text: t })), (item) => {
            operacaoAtual = { tipo: 'total', tabela: item.text, page: 1, page_size: 10 };
            dialog.innerHTML = `<span style="color:white;">Verificar registros na tabela <b>${item.text}</b></span>`;
            habilitarBotao();
        });
    });

    // -------------------- Período --------------------
    const dropdownButtonPeriodo = document.getElementById('dropdownButtonPeriodo');
    const menuPeriodos = document.getElementById('menuPeriodos');
    const dropdownPeriodoInstance = bootstrap.Dropdown.getOrCreateInstance(dropdownButtonPeriodo);

    dropdownButtonPeriodo.addEventListener('click', gerarMenuPeriodos);

    function gerarMenuPeriodos() {
        menuPeriodos.innerHTML = `
            <li><a class="dropdown-item periodo-item" data-periodo="entre">Entre</a></li>
            <li><a class="dropdown-item periodo-item" data-periodo="apos">Após</a></li>
            <li><a class="dropdown-item periodo-item" data-periodo="antes">Antes</a></li>
            <li><a class="dropdown-item periodo-item" data-periodo="no dia">No dia</a></li>
        `;
        dropdownPeriodoInstance.show();

        document.querySelectorAll('.periodo-item').forEach(item => {
            item.addEventListener('click', () => {
                dropdownPeriodoInstance.hide();
                operacaoAtual.tipo = 'periodo';
                operacaoAtual.periodo = item.dataset.periodo;

                const tabelas = ['Ativos', 'Histórico de Ativos', 'Histórico de Sensor', 'Ordens de Serviço'];
                const tabelaOptions = tabelas.map(t => `<option value="${t}">${t}</option>`).join('');

                if (operacaoAtual.periodo === 'entre') {
                    dialog.innerHTML = `
                        <p>Informe o período <b>Entre</b>:</p>
                        <input type="date" id="dia1"> até <input type="date" id="dia2">
                        <p>Selecione a tabela:</p><select id="tabelaPeriodo">${tabelaOptions}</select>
                    `;
                } else {
                    dialog.innerHTML = `
                        <p>Informe a data:</p>
                        <input type="date" id="dia1">
                        <p>Selecione a tabela:</p><select id="tabelaPeriodo">${tabelaOptions}</select>
                    `;
                }

                btnEnviar.disabled = true;
                const dia1 = document.getElementById('dia1');
                const dia2 = document.getElementById('dia2'); 
                const tabelaSelect = document.getElementById('tabelaPeriodo');

                const validarDatas = () => btnEnviar.disabled = !dia1.value || (operacaoAtual.periodo === 'entre' && !dia2.value);

                dia1.addEventListener('input', validarDatas);
                if (dia2) dia2.addEventListener('input', validarDatas);

                const atualizarOperacao = () => {
                    operacaoAtual.tabela = tabelaSelect.value;
                    operacaoAtual.dia1 = dia1.value;
                    if (dia2) operacaoAtual.dia2 = dia2.value;
                };

                dia1.addEventListener('input', atualizarOperacao);
                if (dia2) dia2.addEventListener('input', atualizarOperacao);
                tabelaSelect.addEventListener('change', atualizarOperacao);
            });
        });
    }

    // -------------------- Status --------------------
    const dropdownButtonStatus = document.querySelectorAll('.dropup')[3].querySelector('a');
    const menuStatus = document.getElementById('menuStatus');
    const dropdownStatusInstance = bootstrap.Dropdown.getOrCreateInstance(dropdownButtonStatus);

    dropdownButtonStatus.addEventListener('click', gerarMenuStatus);

    function gerarMenuStatus() {
        const tabelas = ['Ativos', 'Ordens de Serviço', 'Sensores', 'Solicitações'];
        menuStatus.innerHTML = tabelas.map(t => `<li><a class="dropdown-item status-tabela">${t}</a></li>`).join('');
        dropdownStatusInstance.show();

        document.querySelectorAll('.status-tabela').forEach(item => {
            item.addEventListener('click', () => {
                const tabelaSelecionada = item.textContent;
                dropdownStatusInstance.hide();

                operacaoAtual.tipo = 'status';
                operacaoAtual.tabela = tabelaSelecionada;

                const statusOpcoes = {
                    'Ativos': ['Ativo', 'Inativo', 'Em Manutenção', 'Condenado'],
                    'Ordens de Serviço': ['Aberta', 'Em Andamento', 'Concluída'],
                    'Sensores': ['Ativo', 'Inativo', 'Em Manutenção'],
                    'Solicitações': ['Em Análise', 'Aceita', 'Recusada'],
                };

                if (tabelaSelecionada === 'Histórico Ativo') {
                    dialog.innerHTML = `
                        <p>Selecione os status:</p>
                        <label>Status Anterior:</label>
                        <select id="statusAnterior">
                            <option value="">Selecione...</option>
                            ${statusOpcoes[tabelaSelecionada].map(s => `<option value="${s}">${s}</option>`).join('')}
                        </select>
                        <label>Status Atual:</label>
                        <select id="statusAtual">
                            <option value="">Selecione...</option>
                            ${statusOpcoes[tabelaSelecionada].map(s => `<option value="${s}">${s}</option>`).join('')}
                        </select>
                    `;
                    btnEnviar.disabled = true;

                    const anteriorSelect = document.getElementById('statusAnterior');
                    const atualSelect = document.getElementById('statusAtual');

                    const validar = () => btnEnviar.disabled = !(anteriorSelect.value && atualSelect.value);

                    anteriorSelect.addEventListener('change', validar);
                    atualSelect.addEventListener('change', validar);
                } else {
                    dialog.innerHTML = `
                        <p>Selecione o status da tabela <b>${tabelaSelecionada}</b>:</p>
                        <select id="statusSelect">
                            <option value="">Selecione...</option>
                            ${statusOpcoes[tabelaSelecionada].map(s => `<option value="${s}">${s}</option>`).join('')}
                        </select>
                    `;
                    btnEnviar.disabled = true;
                    document.getElementById('statusSelect').addEventListener('change', (e) => btnEnviar.disabled = !e.target.value);
                }
            });
        });
    }

    // -------------------- Prioridade --------------------
    const dropdownButtonPrioridade = document.querySelectorAll('.dropup')[4].querySelector('a');
    const menuPrioridades = document.getElementById('menuPrioridades');
    const dropdownPrioridadeInstance = bootstrap.Dropdown.getOrCreateInstance(dropdownButtonPrioridade);

    dropdownButtonPrioridade.addEventListener('click', gerarMenuPrioridades);

    function gerarMenuPrioridades() {
        const tabelas = ['Solicitações', 'Ordens de Serviço'];
        menuPrioridades.innerHTML = tabelas.map(t => `<li><a class="dropdown-item prioridade-tabela">${t}</a></li>`).join('');
        dropdownPrioridadeInstance.show();

        document.querySelectorAll('.prioridade-tabela').forEach(item => {
            item.addEventListener('click', () => {
                const tabelaSelecionada = item.textContent;
                dropdownPrioridadeInstance.hide();

                operacaoAtual.tipo = 'prioridade';
                operacaoAtual.tabela = tabelaSelecionada;

                const prioridades = ['Alta', 'Média', 'Baixa'];
                dialog.innerHTML = `
                    <p>Selecione a prioridade da tabela <b>${tabelaSelecionada}</b>:</p>
                    <select id="prioridadeSelect">
                        <option value="">Selecione...</option>
                        ${prioridades.map(p => `<option value="${p}">${p}</option>`).join('')}
                    </select>
                `;
                btnEnviar.disabled = true;
                document.getElementById('prioridadeSelect').addEventListener('change', (e) => btnEnviar.disabled = !e.target.value);
            });
        });
    }

    // -------------------- Botão Enviar --------------------
    btnEnviar.addEventListener('click', async () => {
        // Consulta por ID
        if (operacaoAtual.tipo === 'consulta') {
            const inputId = document.getElementById('inputId');
            if (!inputId || !inputId.value) return alert("Digite um ID válido!");
            operacaoAtual.id = parseInt(inputId.value);
        }

        // Captura Status
        const statusSelect = document.getElementById('statusSelect');
        if (statusSelect) operacaoAtual.statusSelect = statusSelect.value || null;

        const statusAnterior = document.getElementById('statusAnterior');
        const statusAtual = document.getElementById('statusAtual');
        if (statusAnterior && statusAtual) {
            operacaoAtual.statusAnterior = statusAnterior.value || null;
            operacaoAtual.statusAtual = statusAtual.value || null;
        }

        // Captura Prioridade
        const prioridadeSelect = document.getElementById('prioridadeSelect');
        if (prioridadeSelect) operacaoAtual.prioridadeSelect = prioridadeSelect.value || null;

        addMessage(`Você selecionou:<br>${formatarOperacao(operacaoAtual)}`, 'user');

        btnEnviar.disabled = true;

        try {
            const response = await fetch('http://127.0.0.1:5000/executar_operacao', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(operacaoAtual)
            });
            const data = await response.json();
            if (data.erro) addMessage(`Erro: ${data.erro}`, 'ai');
            else if (!data.resultado || data.resultado.length === 0) addMessage('Nenhum registro encontrado.', 'ai');
            else addMessage(`Resultado (Página ${data.page} | ${data.page_size} registro(s) por página):<br><pre>${JSON.stringify(data.resultado, null, 2)}</pre>`, 'ai');
        } catch (err) {
            addMessage(`Erro ao conectar com o servidor: ${err}`, 'ai');
        }

        btnEnviar.disabled = false;
    });

    // -------------------- Formatar Operação --------------------
    function formatarOperacao(oper) {
        let msg = `<b>Tipo:</b> ${oper.tipo || '-'}<br>`;
        if (oper.tabela) msg += `<b>Tabela:</b> ${oper.tabela}<br>`;
        if (oper.id) msg += `<b>ID:</b> ${oper.id}<br>`;
        if (oper.periodo) {
            msg += `<b>Período:</b> ${oper.periodo}<br>`;
            if (oper.dia1) msg += `&nbsp;&nbsp;De: ${oper.dia1}<br>`;
            if (oper.dia2) msg += `&nbsp;&nbsp;Até: ${oper.dia2}<br>`;
        }
        if (oper.statusSelect) msg += `<b>Status:</b> ${oper.statusSelect}<br>`;
        if (oper.statusAnterior) msg += `<b>Status Anterior:</b> ${oper.statusAnterior}<br>`;
        if (oper.statusAtual) msg += `<b>Status Atual:</b> ${oper.statusAtual}<br>`;
        if (oper.prioridadeSelect) msg += `<b>Prioridade:</b> ${oper.prioridadeSelect}<br>`;
        msg += `<b>Pagina:</b> ${oper.page || 1}<br>`;
        msg += `<b>Registros por página:</b> ${oper.page_size || 10}<br>`;
        return msg;
    }
});
