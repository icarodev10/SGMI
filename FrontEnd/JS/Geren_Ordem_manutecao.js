// =================== VARIÁVEIS GLOBAIS DE ESTADO ===================
let allOrdens = [];
let filteredOrdens = [];
let ordemParaDeletarId = null;
let ordemAtualID = null;
let currentPage = 1;
const rowsPerPage = 10;

// =================== FUNÇÕES GLOBAIS (ACESSÍVEIS PELO HTML) ===================

// A VERSÃO BRASIL - Ignora GMT e força a exibição do horário como está
function formatarDataParaDateTimeLocal(dataStringGMT) {
    if (!dataStringGMT) {
        return '';
    }

    // 1. Cria um objeto Date. Ele continuará pensando que a string é GMT.
    const data = new Date(dataStringGMT);

    // 2. O TRUQUE: Usamos os métodos getUTC...() para pegar os números EXATOS
    // que estão na string (14, 00, etc.), ignorando o fuso do seu navegador.
    const ano = data.getUTCFullYear();
    const mes = String(data.getUTCMonth() + 1).padStart(2, '0');
    const dia = String(data.getUTCDate()).padStart(2, '0');
    const horas = String(data.getUTCHours()).padStart(2, '0');
    const minutos = String(data.getUTCMinutes()).padStart(2, '0');

    // 3. Montamos a string final, tratando esses números UTC como se fossem a hora local.
    // Basicamente, estamos mentindo para o input, e ele vai nos obedecer.
    const dataFormatada = `${ano}-${mes}-${dia}T${horas}:${minutos}`;

    return dataFormatada;
}


function formatarDataParaBR(dataString) {
    if (!dataString) return '';
    const data = new Date(dataString);
    return data.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
}

function formatarDataParaInput(dataString) {
    if (!dataString) return '';
    const data = new Date(dataString);
    data.setMinutes(data.getMinutes() + data.getTimezoneOffset());
    return data.toISOString().split('T')[0];
}

window.exportar = function (formato, escopo) {
    // Seleciona os dados
    const dadosDaPagina = filteredOrdens.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);
    const dadosParaExportar = escopo === 'tudo' ? filteredOrdens : dadosDaPagina;

    if (dadosParaExportar.length === 0) {
        exibirMensagemGeral("Nenhum dado para exportar.", "warning");
        return;
    }

    // Definição das colunas (expandida para incluir custos e fechamento)
    const colunas = [
        "ID Ordem", 
        "ID Ativo", 
        "Descrição", 
        "Data Abertura", 
        "Status", 
        "Prioridade", 
        "Custo Total", 
        "Data Fechamento", 
        "ID Func. Resp.", 
        "ID Solicitação"
    ];
    
    // Mapeamento dos dados
    const linhas = dadosParaExportar.map(ordem => [
        ordem.id_Ordem, 
        ordem.id_Ativo, 
        ordem.Descricao_Problema,
        formatarDataParaBR(ordem.Data_Abertura), 
        ordem.Status, 
        ordem.Prioridade,
        ordem.Custo ? `R$ ${parseFloat(ordem.Custo).toFixed(2).replace('.', ',')}` : "R$ 0,00",
        ordem.Data_Fechamento ? formatarDataParaBR(ordem.Data_Fechamento) : "-",
        ordem.id_Funcionario_Consertou || "-",
        ordem.id_Solicitacao || 'N/A'
    ]);

    // ---------------- EXCEL ----------------
    if (formato === 'excel') {
        const worksheet = XLSX.utils.aoa_to_sheet([colunas, ...linhas]);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Ordens");
        XLSX.writeFile(workbook, `ordens_${escopo}.xlsx`);

    // ---------------- PDF ----------------
    } else if (formato === 'pdf') {
        const { jsPDF } = window.jspdf;
        // Landscape obrigatório aqui, tabela larga
        const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
        
        doc.autoTable({
            head: [colunas],
            body: linhas,
            styles: { fontSize: 6, cellPadding: 2 }, // Fonte bem pequena para caber tudo
            headStyles: { fillColor: [52, 58, 64] },
            alternateRowStyles: { fillColor: [240, 240, 240] }
        });
        doc.save(`ordens_${escopo}.pdf`);

    // ---------------- CSV ----------------
    } else if (formato === 'csv') {
        const separator = ';';
        let csvContent = "\uFEFF"; // BOM para acentos
        
        csvContent += colunas.join(separator) + "\n";

        linhas.forEach(row => {
            const rowString = row.map(item => {
                let text = String(item !== null && item !== undefined ? item : "");
                // Limpa quebras de linha na descrição para não quebrar o CSV
                text = text.replace(/(\r\n|\n|\r)/gm, " ");
                
                if (text.search(separator) !== -1) {
                    text = `"${text.replace(/"/g, '""')}"`;
                }
                return text;
            }).join(separator);
            csvContent += rowString + "\n";
        });

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `ordens_${escopo}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

    // ---------------- SVG ----------------
    } else if (formato === 'svg') {
        const rowHeight = 30;
        const colWidth = 80; // Colunas estreitas
        const fontSize = 9;
        const headerColor = "#343a40";
        const headerTextColor = "#ffffff";
        const borderColor = "#cccccc";

        const totalWidth = colunas.length * colWidth;
        const totalHeight = (linhas.length + 1) * rowHeight;

        let svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="${totalHeight}" style="font-family: Arial, sans-serif; font-size: ${fontSize}px;">`;

        // Cabeçalho
        colunas.forEach((col, index) => {
            const x = index * colWidth;
            const y = 0;
            svgContent += `<rect x="${x}" y="${y}" width="${colWidth}" height="${rowHeight}" fill="${headerColor}" stroke="${borderColor}" />`;
            svgContent += `<text x="${x + 3}" y="${y + 20}" fill="${headerTextColor}" font-weight="bold">${col}</text>`;
        });

        // Dados
        linhas.forEach((row, rowIndex) => {
            const y = (rowIndex + 1) * rowHeight;
            row.forEach((cellData, colIndex) => {
                const x = colIndex * colWidth;
                let cellText = String(cellData !== null && cellData !== undefined ? cellData : "");
                
                // Trunca texto longo (Descrição do problema)
                if (cellText.length > 12) {
                    cellText = cellText.substring(0, 10) + "...";
                }

                svgContent += `<rect x="${x}" y="${y}" width="${colWidth}" height="${rowHeight}" fill="#ffffff" stroke="${borderColor}" />`;
                svgContent += `<text x="${x + 3}" y="${y + 20}" fill="#000000">${cellText}</text>`;
            });
        });

        svgContent += `</svg>`;

        const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `ordens_${escopo}.svg`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

// =================== LÓGICA PRINCIPAL (EXECUTADA APÓS O DOM CARREGAR) ===================
document.addEventListener('DOMContentLoaded', function () {


    // Variável para guardar a ação que será executada ao confirmar
    let actionToConfirm = null;

    // Nova função para abrir o modal genérico
    function abrirModalConfirmacao(title, body, action) {
        document.getElementById('confirmActionModalTitle').textContent = title;
        document.getElementById('confirmActionModalBody').innerHTML = body; // innerHTML para aceitar <strong>
        actionToConfirm = action; // Guarda a função que deve ser executada

        const modal = new bootstrap.Modal(document.getElementById('confirmActionModal'));
        modal.show();
    }

    // Adiciona o listener para o botão de confirmação do novo modal
    document.getElementById('confirmActionBtn').addEventListener('click', () => {
        if (typeof actionToConfirm === 'function') {
            actionToConfirm(); // Executa a ação guardada
        }
        const modal = bootstrap.Modal.getInstance(document.getElementById('confirmActionModal'));
        modal.hide(); // Esconde o modal
    });

    // --- FUNÇÕES DE CARREGAMENTO E API ---

    async function carregarOrdens() {
        const tbody = document.getElementById('ordem_manutencaoTableBody');
        tbody.innerHTML = `<tr><td colspan="9" class="text-center">Carregando...</td></tr>`;
        try {
            const response = await fetch('http://localhost:5000/ordens');
            if (!response.ok) throw new Error('Erro ao buscar ordens de manutenção.');
            allOrdens = await response.json();
            aplicarFiltrosERenderizar();
        } catch (error) {
            console.error("Erro ao carregar ordens:", error);
            tbody.innerHTML = `<tr><td colspan="9" class="text-center text-danger">${error.message}</td></tr>`;
        }
    }

    // --- LÓGICA DE FILTRO ---

    function aplicarFiltrosERenderizar() {
        const status = document.getElementById('filtroStatus').value;
        const prioridade = document.getElementById('filtroPrioridade').value;
        const dataInicio = document.getElementById('filtroDataInicio').value;
        const dataFim = document.getElementById('filtroDataFim').value;

        filteredOrdens = allOrdens.filter(ordem => {
            const statusOk = !status || ordem.Status === status;
            const prioridadeOk = !prioridade || ordem.Prioridade === prioridade;
            let dataOk = true;
            if (dataInicio) {
                dataOk = dataOk && (ordem.Data_Abertura.split('T')[0] >= dataInicio);
            }
            if (dataFim) {
                dataOk = dataOk && (ordem.Data_Abertura.split('T')[0] <= dataFim);
            }
            return statusOk && prioridadeOk && dataOk;
        });
        currentPage = 1;
        renderTableRows();
        createPagination();
    }

    // --- RENDERIZAÇÃO E PAGINAÇÃO ---

    function renderTableRows() {
        const tbody = document.getElementById('ordem_manutencaoTableBody');
        tbody.innerHTML = "";
        const start = (currentPage - 1) * rowsPerPage;
        const end = start + rowsPerPage;
        const dadosPagina = filteredOrdens.slice(start, end);
        if (dadosPagina.length === 0) {
            tbody.innerHTML = `<tr><td colspan="9" class="text-center">Nenhuma ordem encontrada.</td></tr>`;
            return;
        }
        dadosPagina.forEach(ordem => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td id="total"></td>
                <td>${ordem.id_Ordem}</td>
                <td>${ordem.id_Ativo}</td>
                <td>${ordem.Descricao_Problema}</td>
                <td>${formatarDataParaBR(ordem.Data_Abertura)}</td>
                <td>${ordem.Status}</td>
                <td>${ordem.Prioridade}</td>
                <td>${ordem.Custo}</td>
                <td>${ordem.id_Solicitacao || 'N/A'}</td>
                <td id="center">
                    <button class="delete-btn" onclick="abrirModalDeletar(${ordem.id_Ordem})"><i class="fa-solid fa-trash-can"></i></button>
                    <button class="func-btn" onclick="mostrarFunc(${ordem.id_Ordem})"><i class="fa-solid fa-user-gear"></i></button>
                    <button class="edit-btn" onclick="abrirModalEditarOrdem(this)"><i class="fa-solid fa-square-pen"></i></button>
                    <button class="peca-btn" onclick="mostrarPeca(${ordem.id_Ordem})"><i class="fa-solid fa-gear"></i></button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    function createPagination() {
        const paginationContainer = document.getElementById("paginationLines");
        const totalPages = Math.ceil(filteredOrdens.length / rowsPerPage);
        paginationContainer.innerHTML = "";
        for (let i = 1; i <= totalPages; i++) {
            const btn = document.createElement("button");
            btn.className = "btn";
            btn.innerHTML = `<hr class="page-line" id="line${i}">`;
            btn.onclick = () => changePage(i);
            paginationContainer.appendChild(btn);
        }
        if (totalPages > 0) {
            changePage(currentPage > totalPages ? 1 : currentPage);
        } else {
            document.getElementById("prevBtn").disabled = true;
            document.getElementById("nextBtn").disabled = true;
            document.getElementById("content").innerText = "Página 0";
        }
    }

    window.changePage = function (page) {
        const totalPages = Math.ceil(filteredOrdens.length / rowsPerPage);
        if (page < 1 || (page > totalPages && totalPages > 0)) return;
        currentPage = page;
        renderTableRows();
        document.querySelectorAll(".page-line").forEach(line => line.classList.remove("active-line"));
        const activeLine = document.getElementById("line" + currentPage);
        if (activeLine) activeLine.classList.add("active-line");
        document.getElementById("prevBtn").disabled = (currentPage === 1);
        document.getElementById("nextBtn").disabled = (currentPage === totalPages || totalPages === 0);
        document.getElementById("content").innerText = `Página ${currentPage}`;
    }

    // --- LÓGICA DE MODAIS E AÇÕES ---

    async function calcularECarregarCustosAoVivo(idOrdem) {
        try {
            const [pecasResponse, funcsResponse] = await Promise.all([
                fetch(`http://localhost:5000/ordens/${idOrdem}/pecas`),
                fetch(`http://localhost:5000/ordens/${idOrdem}/funcionarios`)
            ]);

            if (!pecasResponse.ok || !funcsResponse.ok) {
                throw new Error('Falha ao buscar dados para cálculo de custos.');
            }

            const pecasVinculadas = await pecasResponse.json();
            const funcsVinculados = await funcsResponse.json();

            let custoPecas = 0;
            pecasVinculadas.forEach(peca => {
                custoPecas += (parseFloat(peca.Valor_Unitario) || 0) * (peca.Quantidade || 0);
            });

            let custoMaoDeObra = 0;
            const status = document.getElementById('Status_update').value;
            const dataAberturaStr = document.getElementById('Data_Abertura_update').value;

            if (dataAberturaStr && funcsVinculados.length > 0) { // Só calcula se tiver funcionários
                const dataAbertura = new Date(dataAberturaStr);
                let dataFechamento;

                if (status === 'Concluida') {
                    const dataFechamentoStr = document.getElementById('Data_Fechamento_update').value;
                    if (dataFechamentoStr) {
                        dataFechamento = new Date(dataFechamentoStr);
                    }
                } else {
                    dataFechamento = new Date(); // Hora atual para estimativa
                }

                if (dataFechamento) {
                    const duracaoMs = dataFechamento - dataAbertura;
                    const duracaoHoras = duracaoMs > 0 ? duracaoMs / (1000 * 60 * 60) : 0;

                    let valorHoraTotal = 0;
                    funcsVinculados.forEach(func => {
                        valorHoraTotal += (parseFloat(func.Valor_Hora) || 0);
                    });

                    custoMaoDeObra = valorHoraTotal * duracaoHoras;
                }
            }

            document.getElementById('peca_update').value = custoPecas.toFixed(2);
            document.getElementById('mao_obra_update').value = custoMaoDeObra.toFixed(2);
            document.getElementById('custo_update').value = (custoPecas + custoMaoDeObra).toFixed(2);

        } catch (error) {
            console.error("Erro ao calcular custos em tempo real:", error);
        }
    }

    function exibirMensagemGeral(mensagem, tipo = 'danger', elementoId = 'mensagemErro') {
        const mensagemDiv = document.getElementById(elementoId);
        if (mensagemDiv) {
            mensagemDiv.textContent = mensagem;
            mensagemDiv.className = `alert alert-${tipo}`;
            mensagemDiv.classList.remove('d-none');
            setTimeout(() => {
                mensagemDiv.classList.add('d-none');
            }, 4000);
        } else {
            alert(mensagem);
        }
    }

    document.getElementById('ordem_servicoForm').addEventListener('submit', async function (event) {
        event.preventDefault();

        const saveButton = this.querySelector('button[type="submit"]');
        const spinner = document.getElementById('loadingSpinnerCadastro');

        // --- Inicia o loading ---
        saveButton.disabled = true;
        spinner.classList.remove('d-none');
        saveButton.textContent = 'Salvando...';

        const Id_Ativo = document.getElementById('ativo_input').value;
        const Descricao = document.getElementById('Descricao').value;
        const Prioridade = document.getElementById('Prioridade').value;
        const solicitacao = document.getElementById('solicitacaoSelect').value || null;

        if (!Id_Ativo || !Descricao || !Prioridade) {
            exibirMensagemGeral("Preencha todos os campos obrigatórios.", "warning", "mensagemErroInserir");
            // --- Reverte o loading em caso de erro de validação ---
            saveButton.disabled = false;
            spinner.classList.add('d-none');
            saveButton.textContent = 'Salvar';
            return;
        }

        const agora = new Date();
        const Data_Abertura = agora.toISOString();

        const dados = {
            table: "ordens_servico",
            data: {
                id_Ativo: Id_Ativo,
                id_Solicitacao: solicitacao,
                Descricao_Problema: Descricao,
                Data_Abertura: Data_Abertura,
                Status: 'Aberta',
                Prioridade: Prioridade
            },
            database: "sgmi"
        };

        try {
            const response = await fetch('http://localhost:5000/insert', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dados)
            });
            const data = await response.json();
            if (!response.ok) {
                const erroMsg = Array.isArray(data.mensagem) ? data.mensagem.join('\n') : (data.mensagem || 'Erro desconhecido');
                throw new Error(erroMsg);
            }
            exibirMensagemGeral('Ordem de serviço cadastrada com sucesso!', 'success', 'mensagemSucesso');
            await carregarOrdens();
            this.reset();
            bootstrap.Modal.getInstance(document.getElementById('exampleModal')).hide();
        } catch (error) {
            exibirMensagemGeral('Erro: ' + error.message, 'danger', 'mensagemErroInserir');
        } finally {
            // --- Finaliza o loading ---
            saveButton.disabled = false;
            spinner.classList.add('d-none');
            saveButton.textContent = 'Salvar';
        }
    });


    window.abrirModalEditarOrdem = async function (button) {

        const row = button.closest('tr');
        const id_Ordem = row.cells[1].innerText;
        // Busca a ordem completa com todos os dados salvos, incluindo o custo final
        const ordem = allOrdens.find(o => o.id_Ordem == id_Ordem);

        // =====================================================================
        // NOVA CÂMERA DE SEGURANÇA - VAMOS INSPECIONAR O OBJETO 'ordem'
        console.log("Objeto 'ordem' encontrado para edição:", ordem);
        // =====================================================================

        if (!ordem) {
            exibirMensagemGeral("Erro: Não foi possível carregar os dados desta ordem.", "danger");
            return;
        }

        // --- Preenchimento dos dados básicos  ---
        document.getElementById('id_Ordem_update').value = ordem.id_Ordem;
        document.getElementById('ativo_input_update').value = ordem.id_Ativo;
        document.getElementById('Descricao_update').value = ordem.Descricao_Problema;
        document.getElementById('Status_update').value = ordem.Status;
        document.getElementById('Prioridade_update').value = ordem.Prioridade;
        document.getElementById('manutencao_update').value = ordem.Tipo_Manutencao || 'Preditiva';
        document.getElementById('Data_Abertura_update').value = formatarDataParaDateTimeLocal(ordem.Data_Abertura);
        await carregarSolicitacoes(document.getElementById('solicitacaoSelectEditar'), ordem.id_Solicitacao);

        // Mostra o modal
        const modalElement = document.getElementById('exampleModalUpdate');
        const modal = bootstrap.Modal.getOrCreateInstance(modalElement);
        modal.show();

        // =========================================================================
        // LÓGICA DE CUSTO 
        // =========================================================================
        if (ordem.Status === 'Concluida') {
            // Se a ordem JÁ ESTÁ CONCLUÍDA, apenas exibe os valores FINAIS salvos no banco.
            console.log("Ordem concluída. Exibindo custos finais do banco.");

            // Precisamos buscar os custos de mão de obra e peças separadamente para preencher os campos
            const response = await fetch(`http://localhost:5000/ordens/${id_Ordem}/pecas`);
            const pecasVinculadas = await response.json();
            let custoPecasFinal = 0;
            pecasVinculadas.forEach(p => {
                custoPecasFinal += (parseFloat(p.Valor_Unitario) || 0) * (p.Quantidade || 0);
            });

            const custoTotalFinal = parseFloat(ordem.Custo) || 0;
            const custoMaoDeObraFinal = custoTotalFinal - custoPecasFinal;

            document.getElementById('peca_update').value = custoPecasFinal.toFixed(2);
            document.getElementById('mao_obra_update').value = custoMaoDeObraFinal.toFixed(2);
            document.getElementById('custo_update').value = custoTotalFinal.toFixed(2);

        } else {
            // Se a ordem está ABERTA ou EM ANDAMENTO, roda a sua função de estimativa.
            console.log("Ordem em andamento. Calculando estimativa de custos.");
            await calcularECarregarCustosAoVivo(id_Ordem);
        }
        // =========================================================================

        // Lógica condicional para campos de fechamento 
        if (ordem.Status === 'Concluida') {
            document.querySelector('[data-fechamento]').style.display = 'block';
            document.querySelector('[data-funcionario]').style.display = 'block';
            document.getElementById('Data_Fechamento_update').value = formatarDataParaDateTimeLocal(ordem.Data_Fechamento);
            await carregarFuncionariosVinculados(ordem.id_Ordem, ordem.id_Funcionario_Consertou);
        } else {
            document.querySelector('[data-fechamento]').style.display = 'none';
            document.querySelector('[data-funcionario]').style.display = 'none';
        }
    };

    // No seu arquivo Geren_Ordem_manutencao.js

    document.getElementById('ordem_servicoForm_Update').addEventListener('submit', async function (event) {
        event.preventDefault();

        const saveButton = this.querySelector('button[type="submit"]');
        const spinner = document.getElementById('loadingSpinnerUpdate');
        saveButton.disabled = true;
        spinner.classList.remove('d-none');

        const Id_Ordem = document.getElementById('id_Ordem_update').value;

        // ====================== CÓDIGO CORRIGIDO ======================
        // Monta o payload para enviar ao backend coletando TODOS os campos do formulário
        const payload = {
            id_Ativo: document.getElementById('ativo_input_update').value,
            Descricao_Problema: document.getElementById('Descricao_update').value,
            Status: document.getElementById('Status_update').value,
            Prioridade: document.getElementById('Prioridade_update').value,
            Tipo_Manutencao: document.getElementById('manutencao_update').value,
            id_Solicitacao: document.getElementById('solicitacaoSelectEditar').value || null,
            // Só envia o ID do funcionário se o status for 'Concluida'
            id_Funcionario_Consertou: document.getElementById('Status_update').value === 'Concluida'
                ? document.getElementById('funcionario_update').value || null
                : null
        };
        // =============================================================

        // ====================== PONTO DE DEPURAÇÃO ======================
        // Esta linha vai mostrar o objeto completo no console do navegador ANTES de enviar
        console.log("--> Enviando este payload para o backend:", payload);
        // ================================================================

        try {
            const response = await fetch(`http://localhost:5000/update_ordens/${Id_Ordem}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.mensagem || 'Erro desconhecido');

            // A maneira mais segura de garantir que a tabela esteja 100% atualizada
            // é recarregar os dados diretamente do backend.
            await carregarOrdens();

            exibirMensagemGeral('Ordem atualizada com sucesso!', 'success', 'mensagemSucessoEditar');

            setTimeout(() => {
                bootstrap.Modal.getInstance(document.getElementById('exampleModalUpdate')).hide();
            }, 1500);

        } catch (error) {
            exibirMensagemGeral('Erro: ' + error.message, 'danger', 'mensagemErroEditar');
        } finally {
            saveButton.disabled = false;
            spinner.classList.add('d-none');
        }
    });


    window.abrirModalDeletar = function (id) {
        const title = 'Confirmar Exclusão';
        const body = `Você tem certeza que deseja excluir a Ordem de Manutenção de ID: <strong>${id}</strong>?`;

        const acao = async () => {
            try {
                const response = await fetch(`http://localhost:5000/delete_ordens/${id}`, { method: 'DELETE' });
                const data = await response.json();
                if (!response.ok || !data.affected_rows) throw new Error(data.mensagem);
                exibirMensagemGeral("Ordem excluída com sucesso!", "success");
                await carregarOrdens();
            } catch (error) {
                exibirMensagemGeral("Erro ao excluir ordem: " + error.message, "danger");
            }
        };

        abrirModalConfirmacao(title, body, acao);
    }

    // --- VINCULAR FUNCIONÁRIOS ---
    window.mostrarFunc = async function (idOrdem) {
        ordemAtualID = idOrdem;
        try {
            const response = await fetch(`http://localhost:5000/ordens/${idOrdem}/funcionarios`);
            const funcionarios = await response.json();
            const tbody = document.getElementById('funcInfoTableBody');
            tbody.innerHTML = '';
            if (funcionarios.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4">Nenhum funcionário vinculado.</td></tr>';
            } else {
                funcionarios.forEach(func => {
                    tbody.innerHTML += `<tr><td>${func.id_Cadastro || 'N/A'}</td><td>${func.Nome || 'N/A'}</td><td>${func.Cargo || 'N/A'}</td><td><button class="btn btn-danger btn-sm" onclick="desvincularFuncionario(${func.id_Cadastro}, ${idOrdem})">Desvincular</button></td></tr>`;
                });
            }
            await preencherFuncionariosParaVincular();
            let funcModal = bootstrap.Modal.getOrCreateInstance(document.getElementById('funcModal'));
            funcModal.show();
        } catch (error) { exibirMensagemGeral('Erro ao carregar dados do funcionário.', 'danger'); }
    };

    async function preencherFuncionariosParaVincular() {
        try {
            const [todosResponse, vinculadosResponse] = await Promise.all([fetch('http://localhost:5000/usuario'), fetch(`http://localhost:5000/ordens/${ordemAtualID}/funcionarios`)]);
            const todosFuncionarios = await todosResponse.json();
            const funcionariosVinculados = await vinculadosResponse.json();
            const idsVinculados = new Set(funcionariosVinculados.map(f => f.id_Cadastro));
            const tbody = document.getElementById('tabelaFuncionarios');
            tbody.innerHTML = '';
            todosFuncionarios.filter(f => !idsVinculados.has(f.id_Cadastro)).forEach(func => {
                const tr = document.createElement('tr');
                tr.innerHTML = `<td>${func.id_Cadastro}</td><td>${func.Nome}</td>`;
                tr.style.cursor = 'pointer';
                tr.onclick = () => {
                    document.getElementById('funcSelecionadoTexto').textContent = `${func.id_Cadastro} - ${func.Nome}`;
                    document.getElementById('funcSelecionadoID').value = func.id_Cadastro;
                };
                tbody.appendChild(tr);
            });
        } catch (error) { exibirMensagemGeral('Erro ao carregar funcionários para vincular.', 'danger'); }
    }

    document.getElementById('vincularFunc').addEventListener('click', async () => {
        const vincularButton = document.getElementById('vincularFunc');
        const spinner = document.getElementById('loadingSpinnerFunc');

        // --- Inicia o loading ---
        vincularButton.disabled = true;
        spinner.classList.remove('d-none');
        vincularButton.textContent = 'Vinculando...';

        const idFuncionario = document.getElementById('funcSelecionadoID').value;

        if (!idFuncionario || !ordemAtualID) {
            exibirMensagemGeral('Selecione um funcionário.', 'warning');
            // Reverte o loading
            vincularButton.disabled = false;
            spinner.classList.add('d-none');
            vincularButton.textContent = 'Vincular';
            return;
        }

        try {
            const response = await fetch(`http://localhost:5000/ordens/${ordemAtualID}/funcionarios`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id_Funcionario: parseInt(idFuncionario) })
            });
            if (!response.ok) throw new Error('Erro na API ao vincular funcionário.');

            exibirMensagemGeral('Funcionário vinculado com sucesso!', 'success');
            await mostrarFunc(ordemAtualID); // Atualiza a lista de vinculados no modal

            // --- Limpa a seleção ---
            document.getElementById('funcSelecionadoTexto').textContent = 'Nenhum';
            document.getElementById('funcSelecionadoID').value = '';

        } catch (error) {
            exibirMensagemGeral(error.message, 'danger');
        } finally {
            // --- Finaliza o loading ---
            vincularButton.disabled = false;
            spinner.classList.add('d-none');
            vincularButton.textContent = 'Vincular';
        }
    });

    window.desvincularFuncionario = async (idFuncionario, idOrdem) => {
        const title = 'Confirmar Desvinculação';
        const body = `Você tem certeza que deseja desvincular o funcionário de ID <strong>${idFuncionario}</strong>?`;

        // A ação a ser executada é a chamada da API
        const acao = async () => {
            try {
                const response = await fetch(`http://localhost:5000/ordens/${idOrdem}/funcionarios/${idFuncionario}`, { method: 'DELETE' });
                if (!response.ok) throw new Error('Erro na API');

                exibirMensagemGeral('Funcionário desvinculado com sucesso!', 'success');
                await mostrarFunc(idOrdem); // Atualiza o modal de funcionários
                await carregarOrdens(); // Atualiza a tabela principal
            } catch (error) {
                exibirMensagemGeral('Erro ao desvincular funcionário.', 'danger');
            }
        };

        abrirModalConfirmacao(title, body, acao);
    };

    // =========================================================================
    // LÓGICA DE VINCULAR PEÇAS
    // =========================================================================

    // Vamos declarar a variável aqui para que ela seja acessível por outras funções
    let pecasVinculadasNaOrdem = [];

    window.mostrarPeca = async function (idOrdem) {
        ordemAtualID = idOrdem;
        try {
            const response = await fetch(`http://localhost:5000/ordens/${idOrdem}/pecas`);
            pecasVinculadasNaOrdem = await response.json(); // Armazena na variável global

            const tbody = document.getElementById('pecaInfoTableBody');
            tbody.innerHTML = '';

            if (pecasVinculadasNaOrdem.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5">Nenhuma peça vinculada.</td></tr>';
            } else {
                pecasVinculadasNaOrdem.forEach(peca => {
                    tbody.innerHTML += `<tr>
                    <td>${peca.id_Peca || 'N/A'}</td>
                    <td>${peca.Nome_Peca || 'N/A'}</td>
                    <td>${peca.Quantidade || 'N/A'}</td>
                    <td>${peca.Estoque !== null ? peca.Estoque : 'N/A'}</td>
                    <td><button class="btn btn-danger btn-sm" onclick="desvincularPeca(${peca.id_Ordens_Peca}, ${idOrdem})">Desvincular</button></td>
                </tr>`;
                });
            }
            await preencherPecasParaVincular();

            let pecaModal = bootstrap.Modal.getOrCreateInstance(document.getElementById('PecaModal'));
            pecaModal.show();
        } catch (error) {
            exibirMensagemGeral('Erro ao carregar dados da peça: ' + error.message, 'danger');
        }
    };

    async function preencherPecasParaVincular() {
        try {
            // Busca todas as peças e as já vinculadas para não mostrá-las na lista de seleção
            const [todasResponse, vinculadasResponse] = await Promise.all([
                fetch('http://localhost:5000/pecas'),
                fetch(`http://localhost:5000/ordens/${ordemAtualID}/pecas`)
            ]);
            const todasPecas = await todasResponse.json();
            const pecasVinculadas = await vinculadasResponse.json();
            const idsVinculadas = new Set(pecasVinculadas.map(p => p.id_Peca));
            const tbody = document.getElementById('tabelaPecas');
            tbody.innerHTML = '';

            const pecasDisponiveis = todasPecas.filter(p => p.Estoque > 0);

            pecasDisponiveis.forEach(peca => {
                const tr = document.createElement('tr');
                tr.innerHTML = `<td>${peca.id_Peca}</td><td>${peca.Nome_Peca}</td><td>${peca.Estoque}</td>`;
                tr.style.cursor = 'pointer';
                tr.onclick = () => {
                    // Remove a classe 'table-primary' de qualquer outra linha selecionada
                    tbody.querySelectorAll('tr').forEach(row => row.classList.remove('table-primary'));
                    // Adiciona a classe na linha clicada
                    tr.classList.add('table-primary');

                    document.getElementById('pecaSelecionadaTexto').textContent = `${peca.id_Peca} - ${peca.Nome_Peca}`;
                    document.getElementById('pecaSelecionadaID').value = peca.id_Peca;
                    document.getElementById('pecaSelecionadaEstoque').value = peca.Estoque;
                    // Ajusta o 'max' do input de quantidade para o estoque disponível
                    document.getElementById('quantidadePeca').max = peca.Estoque;
                };
                tbody.appendChild(tr);
            });
        } catch (error) {
            exibirMensagemGeral('Erro ao carregar peças para vincular.', 'danger');
        }
    }

    document.getElementById('vincularPeca').addEventListener('click', async () => {
        const vincularButton = document.getElementById('vincularPeca');
        const spinner = document.getElementById('loadingSpinnerPeca');

        // --- Inicia o loading ---
        vincularButton.disabled = true;
        spinner.classList.remove('d-none');
        vincularButton.textContent = 'Vinculando...';

        const idPeca = document.getElementById('pecaSelecionadaID').value;
        const quantidade = parseInt(document.getElementById('quantidadePeca').value, 10);
        const estoqueDisponivel = parseInt(document.getElementById('pecaSelecionadaEstoque').value, 10);

        // Validações 
        if (!idPeca || isNaN(quantidade) || quantidade <= 0 || quantidade > estoqueDisponivel) {
            let msg = 'Selecione uma peça.';
            if (idPeca && (isNaN(quantidade) || quantidade <= 0)) msg = 'A quantidade deve ser maior que zero.';
            if (idPeca && quantidade > estoqueDisponivel) msg = `Quantidade excede o estoque disponível (${estoqueDisponivel}).`;
            exibirMensagemGeral(msg, 'warning');
            vincularButton.disabled = false;
            spinner.classList.add('d-none');
            vincularButton.textContent = 'Vincular';
            return;
        }

        try {
            const vinculoExistente = pecasVinculadasNaOrdem.find(p => p.id_Peca == idPeca);

            if (vinculoExistente) {
                // ATUALIZA (PUT)
                const payload = { Quantidade: quantidade };
                const idDoVinculo = vinculoExistente.id_Ordens_Peca;

                // ADICIONADO PARA DEPURAR
                console.log("Enviando para ATUALIZAR (PUT):", JSON.stringify(payload));

                const response = await fetch(`http://localhost:5000/ordens/${ordemAtualID}/pecas/${idDoVinculo}`, {
                    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
                });
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.mensagem || 'Erro ao atualizar quantidade.');
                }
                exibirMensagemGeral('Quantidade da peça atualizada com sucesso!', 'success');
            } else {
                // CRIA (POST)
                const payload = { id_Ordem: ordemAtualID, id_Peca: parseInt(idPeca), Quantidade: quantidade };

                // ADICIONADO PARA DEPURAR
                console.log("Enviando para CRIAR (POST):", JSON.stringify(payload));

                const response = await fetch(`http://localhost:5000/ordens/${ordemAtualID}/pecas`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
                });
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.mensagem || 'Erro ao vincular peça.');
                }
                exibirMensagemGeral('Peça vinculada com sucesso!', 'success');
            }

            await mostrarPeca(ordemAtualID);
            document.getElementById('pecaSelecionadaTexto').textContent = "Nenhum";
            document.getElementById('pecaSelecionadaID').value = '';
            document.getElementById('pecaSelecionadaEstoque').value = '0';
            document.getElementById('quantidadePeca').value = '1';

        } catch (error) {
            exibirMensagemGeral('Erro: ' + error.message, 'danger');
        } finally {
            // --- Finaliza o loading ---
            vincularButton.disabled = false;
            spinner.classList.add('d-none');
            vincularButton.textContent = 'Vincular';
        }
    });

    window.desvincularPeca = async (idOrdemPeca, idOrdem) => {
        const title = 'Confirmar Desvinculação';
        const body = `Você tem certeza que deseja desvincular esta peça da ordem?`;

        const acao = async () => {
            try {
                const response = await fetch(`http://localhost:5000/ordens/${idOrdem}/pecas/${idOrdemPeca}`, { method: 'DELETE' });
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.mensagem || 'Erro na API ao desvincular peça.');
                }
                exibirMensagemGeral('Peça desvinculada com sucesso!', 'success');
                await mostrarPeca(idOrdem); // Atualiza o modal de peças
                await carregarOrdens(); // Atualiza a tabela principal
            } catch (error) {
                exibirMensagemGeral('Erro ao desvincular peça: ' + error.message, 'danger');
            }
        };

        abrirModalConfirmacao(title, body, acao);
    };

    // --- EVENT LISTENERS ---

    const createModal = document.getElementById('exampleModal');
    if (createModal) {
        createModal.addEventListener('show.bs.modal', function () {
            // Pega o formulário e o reseta para garantir que esteja limpo
            const form = document.getElementById('ordem_servicoForm');
            form.reset();

            // =================================================================
            // Reseta a visibilidade do campo do ativo
            // =================================================================
            const ativoWrapper = createModal.querySelector('.ativo-wrapper');
            if (ativoWrapper) {
                ativoWrapper.style.display = 'none';
            }
            // =================================================================

            // Pega a data e hora atuais
            const agora = new Date();

            // Função para adicionar um zero à esquerda se o número for menor que 10
            const pad = (num) => String(num).padStart(2, '0');

            // Formata a data manualmente para o padrão 'YYYY-MM-DDTHH:mm'
            const dataFormatada = `${agora.getFullYear()}-${pad(agora.getMonth() + 1)}-${pad(agora.getDate())}T${pad(agora.getHours())}:${pad(agora.getMinutes())}`;

            // Atribui o valor formatado ao input
            const dataAberturaInput = document.getElementById('Data_Abertura');
            if (dataAberturaInput) {
                dataAberturaInput.value = dataFormatada;
            }
        });
    }

    document.getElementById('filtroStatus').addEventListener('change', aplicarFiltrosERenderizar);
    document.getElementById('filtroPrioridade').addEventListener('change', aplicarFiltrosERenderizar);
    document.getElementById('filtroDataInicio').addEventListener('change', aplicarFiltrosERenderizar);
    document.getElementById('filtroDataFim').addEventListener('change', aplicarFiltrosERenderizar);

    document.getElementById('limparFiltros').addEventListener('click', () => {
        document.getElementById('filtroStatus').value = '';
        document.getElementById('filtroPrioridade').value = '';
        document.getElementById('filtroDataInicio').value = '';
        document.getElementById('filtroDataFim').value = '';
        aplicarFiltrosERenderizar();
    });

    document.getElementById('prevBtn').addEventListener('click', () => changePage(currentPage - 1));
    document.getElementById('nextBtn').addEventListener('click', () => changePage(currentPage + 1));


    // =========================================================================
    // VERSÃO DE DEPURAÇÃO DA FUNÇÃO
    // =========================================================================
    async function carregarFuncionariosVinculados(idOrdem, idFuncionarioSelecionado = null) {
        // Câmera 1: A função foi chamada?
        console.log("--- DEBUG: Função carregarFuncionariosVinculados foi chamada para a ordem:", idOrdem);

        const selectElement = document.getElementById('funcionario_update');

        // Câmera 2: O elemento <select> foi encontrado no HTML?
        console.log("--- DEBUG: Elemento <select> encontrado no HTML:", selectElement);

        if (!selectElement) {
            console.error("--- ERRO GRAVE: O elemento com id 'funcionario_update' NÃO FOI ENCONTRADO no HTML! ---");
            return;
        }

        selectElement.innerHTML = '<option value="">Carregando...</option>';

        try {
            const response = await fetch(`http://localhost:5000/ordens/${idOrdem}/funcionarios`);
            if (!response.ok) throw new Error('Falha ao buscar funcionários vinculados.');

            const funcionarios = await response.json();

            // Câmera 3: Quais dados o JavaScript recebeu APÓS o .json()?
            console.log("--- DEBUG: Funcionários recebidos pela API:", funcionarios);

            // Limpa o select para adicionar as novas opções
            selectElement.innerHTML = '<option value="">Selecione um responsável...</option>';

            if (funcionarios.length === 0) {
                selectElement.innerHTML = '<option value="">Nenhum funcionário vinculado</option>';
                console.log("--- DEBUG: A lista de funcionários está vazia. Fim da execução.");
                return;
            }

            funcionarios.forEach(func => {
                // Câmera 4: O loop está sendo executado para cada funcionário?
                console.log("--- DEBUG: Criando <option> para o funcionário:", func);

                const option = document.createElement('option');
                option.value = func.id_Cadastro;
                option.textContent = `${func.Nome} (ID: ${func.id_Cadastro})`;

                if (func.id_Cadastro == idFuncionarioSelecionado) {
                    option.selected = true;
                }
                selectElement.appendChild(option);
            });

            console.log("--- DEBUG: Fim da execução. O select deveria estar populado.");

        } catch (error) {
            console.error("--- ERRO DURANTE A EXECUÇÃO:", error);
            selectElement.innerHTML = '<option value="">Erro ao carregar</option>';
        }
    }


    async function carregarSolicitacoes(selectElement, idSelecionado = null) {
        try {
            const response = await fetch('http://localhost:5000/solicitacoes');
            const solicitacoes = await response.json();
            const solicitacoesValidas = solicitacoes.filter(s => s.Status !== 'Recusada');
            selectElement.innerHTML = '<option value="">Sem solicitação vinculada</option>';
            solicitacoesValidas.forEach(s => {
                const option = document.createElement('option');
                option.value = s.id_Solicitacao;
                option.textContent = `${s.Titulo} (ID: ${s.id_Solicitacao})`;
                if (s.id_Solicitacao == idSelecionado) option.selected = true;
                selectElement.appendChild(option);
            });
        } catch (error) {
            console.error('Erro ao carregar solicitações:', error);
        }
    }

    async function buscarAtivoPorSolicitacao(selectElement, inputAtivo) {
        // Encontra o container 'pai' do input do ativo
        const ativoWrapper = inputAtivo.closest('.ativo-wrapper');

        const idSolicitacao = selectElement.value;

        if (!idSolicitacao) {
            inputAtivo.value = '';
            if (ativoWrapper) {
                ativoWrapper.style.display = 'none'; // Esconde se nenhuma solicitação for escolhida
            }
            return;
        }

        try {
            const response = await fetch(`http://localhost:5000/solicitacoes/${idSolicitacao}`);
            const dados = await response.json();

            inputAtivo.value = (dados && dados.id_Ativo) ? dados.id_Ativo : '';

            if (ativoWrapper) {
                ativoWrapper.style.display = 'block'; // Mostra o container, pois uma solicitação foi escolhida
            }

        } catch (error) {
            inputAtivo.value = '';
            if (ativoWrapper) {
                ativoWrapper.style.display = 'none'; // Esconde em caso de erro também
            }
        }
    }


    document.getElementById('solicitacaoSelect').addEventListener('change', () => buscarAtivoPorSolicitacao(document.getElementById('solicitacaoSelect'), document.getElementById('ativo_input')));
    document.getElementById('solicitacaoSelectEditar').addEventListener('change', () => buscarAtivoPorSolicitacao(document.getElementById('solicitacaoSelectEditar'), document.getElementById('ativo_input_update')));

    document.getElementById('Status_update').addEventListener('change', async function () {
        const status = this.value;
        const dataFechamentoContainer = document.querySelector('[data-fechamento]');
        const funcionarioContainer = document.querySelector('[data-funcionario]');
        const dataFechamentoInput = document.getElementById('Data_Fechamento_update');
        // Pega o ID da ordem que está sendo editada no modal
        const idOrdem = document.getElementById('id_Ordem_update').value;

        if (status === 'Concluida') {
            // Mostra os campos de conclusão
            dataFechamentoContainer.style.display = 'block';
            funcionarioContainer.style.display = 'block';

            // Preenche a data de fechamento com a hora local correta
            const agora = new Date();
            agora.setMinutes(agora.getMinutes() - agora.getTimezoneOffset());
            dataFechamentoInput.value = agora.toISOString().slice(0, 16);

            // Se temos um ID de ordem, chama a função para popular o select
            if (idOrdem) {
                console.log("Status alterado para 'Concluida'. Carregando funcionários no select...");
                await carregarFuncionariosVinculados(idOrdem);
            }
            // ===================================================================

        } else {
            // Se o status voltar a ser Aberta/Em Andamento, esconde os campos
            dataFechamentoContainer.style.display = 'none';
            funcionarioContainer.style.display = 'none';
            dataFechamentoInput.value = '';
        }

        // Recalcula a estimativa de custo toda vez que o status muda
        if (idOrdem) {
            await calcularECarregarCustosAoVivo(idOrdem);
        }
    });

    // --- INICIALIZAÇÃO ---
    carregarOrdens();
    carregarSolicitacoes(document.getElementById('solicitacaoSelect'));

    // =========================================================================
    // 
    // =========================================================================

    async function carregarCustos(idOrdem) {
        try {
            let response = await fetch(`http://localhost:5000/api/custos/${idOrdem}`);

            if (!response.ok) {
                throw new Error("Erro ao buscar custos");
            }

            let data = await response.json();

            document.getElementById("mao_obra_update").value = data.mao_obra.toFixed(2);
            document.getElementById("peca_update").value = data.pecas.toFixed(2);
            document.getElementById("custo_update").value = data.total.toFixed(2);

        } catch (error) {
            console.error("Erro:", error);
        }
    }

    // Exemplo: quando clicar no botão de editar ordem
    function abrirModalUpdate(idOrdem) {
        carregarCustos(idOrdem); // passa o id da ordem aqui
        const modal = new bootstrap.Modal(document.getElementById('updateModal'));
        modal.show();
    }

});

// Bloco do Particles.js mantido separado
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('particles-js')) {
        particlesJS('particles-js', {
            "particles": { "number": { "value": 50, "density": { "enable": true, "value_area": 800 } }, "color": { "value": "#0d6efd" }, "shape": { "type": "circle" }, "opacity": { "value": 0.7, "random": true }, "size": { "value": 3, "random": true }, "line_linked": { "enable": true, "distance": 150, "color": "#0d6efd", "opacity": 0.2, "width": 1 }, "move": { "enable": true, "speed": 1, "direction": "none", "out_mode": "out" } }, "interactivity": { "detect_on": "canvas", "events": { "onhover": { "enable": true, "mode": "grab" } }, "modes": { "grab": { "distance": 140, "line_linked": { "opacity": 0.5 } } } }, "retina_detect": true
        });
    }
});

