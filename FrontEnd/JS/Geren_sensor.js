// =================== VARIÁVEIS GLOBAIS DE ESTADO ===================
let allSensores = [];       // Guarda a lista COMPLETA de sensores vinda da API
let sensores = [];          // Guarda a lista FILTRADA que será exibida na tela
let currentPage = 1;
const rowsPerPage = 10;
let totalPages = 1;
let sensorParaExcluirId = null; // Guarda o ID para o modal de exclusão

// =================== FUNÇÕES DE EXPORTAÇÃO E AUXILIARES ===================

function getSensoresParaExportar(scope) {
    if (scope === 'tudo') {
        // Exporta a lista atualmente filtrada, completa (sem paginação)
        return sensores;
    } else { // 'pagina'
        // Exporta apenas a página visível da lista filtrada
        const start = (currentPage - 1) * rowsPerPage;
        const end = start + rowsPerPage;
        return sensores.slice(start, end);
    }
}

window.exportar = function (formato, scope) {
    if (!sensores || sensores.length === 0) {
        exibirMensagemGeral("Nenhum sensor na tabela para exportar!", "warning");
        return;
    }
    
    const sensoresParaExportar = getSensoresParaExportar(scope);
    
    if (sensoresParaExportar.length === 0) {
        exibirMensagemGeral("Nenhum sensor para exportar no escopo selecionado.", "warning");
        return;
    }

    const colunas = ["ID", "Nome", "Tipo", "Unidade", "Status", "Modelo", "Nº de Série", "ID da Máquina"];
    
    // Prepara os dados
    const linhas = sensoresParaExportar.map(s => [
        s.id_Sensor, 
        s.Nome_Sensor, 
        s.Tipo, 
        s.Unidade_Medida, 
        s.Status,
        s.Modelo, 
        s.Numero_Serie, 
        s.id_Ativo !== null ? s.id_Ativo : "N/A"
    ]);

    // ---------------- EXCEL ----------------
    if (formato === 'excel') {
        const worksheet = XLSX.utils.aoa_to_sheet([colunas, ...linhas]);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Sensores");
        XLSX.writeFile(workbook, `sensores_${scope}.xlsx`);

    // ---------------- PDF ----------------
    } else if (formato === 'pdf') {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF("l", "pt", "a4");
        doc.autoTable({
            head: [colunas], 
            body: linhas, 
            styles: { fontSize: 8, cellPadding: 4 },
            headStyles: { fillColor: [52, 58, 64], textColor: 255, halign: "center" },
            alternateRowStyles: { fillColor: [240, 240, 240] }
        });
        doc.save(`sensores_${scope}.pdf`);

    // ---------------- CSV ----------------
    } else if (formato === 'csv') {
        const separator = ';';
        let csvContent = "\uFEFF"; // BOM para acentos
        
        csvContent += colunas.join(separator) + "\n";

        linhas.forEach(row => {
            const rowString = row.map(item => {
                let text = String(item !== null && item !== undefined ? item : "");
                if (text.search(separator) !== -1 || text.search(/(\r\n|\n|\r)/) !== -1) {
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
        link.setAttribute("download", `sensores_${scope}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

    // ---------------- SVG ----------------
    } else if (formato === 'svg') {
        const rowHeight = 30;
        const colWidth = 100; // Ajustado para caber na largura
        const fontSize = 11;
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
            svgContent += `<text x="${x + 5}" y="${y + 20}" fill="${headerTextColor}" font-weight="bold">${col}</text>`;
        });

        // Dados
        linhas.forEach((row, rowIndex) => {
            const y = (rowIndex + 1) * rowHeight;
            row.forEach((cellData, colIndex) => {
                const x = colIndex * colWidth;
                let cellText = String(cellData !== null && cellData !== undefined ? cellData : "");
                
                if (cellText.length > 13) {
                    cellText = cellText.substring(0, 11) + "...";
                }

                svgContent += `<rect x="${x}" y="${y}" width="${colWidth}" height="${rowHeight}" fill="#ffffff" stroke="${borderColor}" />`;
                svgContent += `<text x="${x + 5}" y="${y + 20}" fill="#000000">${cellText}</text>`;
            });
        });

        svgContent += `</svg>`;

        const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `sensores_${scope}.svg`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

// =================== LÓGICA PRINCIPAL (EXECUTADA APÓS O DOM CARREGAR) ===================
document.addEventListener('DOMContentLoaded', function () {

    // --- FUNÇÕES DE CARREGAMENTO E FILTROS ---

    async function carregarSensores() {
        const tbody = document.getElementById("sensorTableBody");
        tbody.innerHTML = `<tr><td colspan="10" class="text-center">Carregando...</td></tr>`;

        try {
            const response = await fetch("http://localhost:5000/sensores");
            if (!response.ok) throw new Error("Falha na comunicação com o servidor.");
            allSensores = await response.json();
            aplicarFiltros();
        } catch (error) {
            tbody.innerHTML = `<tr><td colspan="10" class="text-center text-danger">${error.message}</td></tr>`;
        }
    }

    function aplicarFiltros() {
        let tempSensores = [...allSensores];

        // Lógica de filtro
        const searchTerm = document.getElementById('search_input').value.toLowerCase();
        if (searchTerm) {
            tempSensores = tempSensores.filter(sensor => sensor.Nome_Sensor.toLowerCase().includes(searchTerm));
        }
        const statusAtivo = document.querySelector('.list-group-item.active');
        if (statusAtivo) {
            const status = statusAtivo.textContent.trim().toLowerCase();
            tempSensores = tempSensores.filter(sensor => sensor.Status.toLowerCase() === status);
        }

        sensores = tempSensores;
        totalPages = Math.ceil(sensores.length / rowsPerPage) || 1;

        createPagination(); // <--- ADICIONA A CHAMADA AQUI
        changePage(1);      // E depois MUDA para a página 1
    }
    // --- FUNÇÕES DE TABELA E PAGINAÇÃO ---

    function renderTableRows() {
        const tbody = document.getElementById("sensorTableBody");
        tbody.innerHTML = "";
        const start = (currentPage - 1) * rowsPerPage;
        const end = start + rowsPerPage;
        const dadosPagina = sensores.slice(start, end);

        if (dadosPagina.length === 0) {
            tbody.innerHTML = `<tr><td colspan="10" class="text-center">Nenhum sensor encontrado.</td></tr>`;
            return;
        }

        dadosPagina.forEach((sensor) => {
            const row = document.createElement("tr");
            const safeNomeSensor = sensor.Nome_Sensor.replace(/'/g, "\\'").replace(/"/g, "&quot;");
            row.innerHTML = `
                <td id="total"></td>
                <td>${sensor.id_Sensor}</td>
                <td>${sensor.Nome_Sensor}</td>
                <td>${sensor.Tipo}</td>
                <td>${sensor.Unidade_Medida}</td>
                <td>${sensor.Status}</td>
                <td>${sensor.Modelo}</td>
                <td>${sensor.Numero_Serie}</td>
                <td>${sensor.id_Ativo != null ? sensor.id_Ativo : "Sem máquina"}</td>
                <td id="center">
                    <button class="delete-btn" onclick="deletarSensores(${sensor.id_Sensor}, '${safeNomeSensor}')">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                    <button class="edit-btn" onclick="abrirModalEditarSensor(this)">
                        <i class="fa-solid fa-square-pen"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    let changing = false;
    function changePage(pageNumber) {
        if (changing) return;
        changing = true;

        if (pageNumber < 1 && totalPages > 0) pageNumber = 1;
        if (pageNumber > totalPages) pageNumber = totalPages;

        currentPage = pageNumber;
        renderTableRows(); // Renderiza a tabela

        // Lógica para ativar a linha 
        document.getElementById("content").innerText = "Página " + currentPage;
        document.querySelectorAll(".page-line").forEach(line => line.classList.remove("active-line"));
        const currentLine = document.getElementById("line" + currentPage);
        if (currentLine) {
            currentLine.classList.add("active-line");
        }

        document.getElementById("prevBtn").disabled = (currentPage === 1);
        document.getElementById("nextBtn").disabled = (currentPage === totalPages);

        setTimeout(() => changing = false, 200);
    }

    function createPagination() {
        const paginationContainer = document.getElementById("paginationLines");
        paginationContainer.innerHTML = "";

        if (totalPages > 0) {
            for (let i = 1; i <= totalPages; i++) {
                const btn = document.createElement("button");
                btn.className = "btn";
                btn.innerHTML = `<hr class="page-line" id="line${i}">`;
                btn.onclick = () => changePage(i);
                paginationContainer.appendChild(btn);
            }
        }
    }

    // --- FUNÇÕES CRUD (CREATE, UPDATE, DELETE) ---

    // Deletar Sensor
    window.deletarSensores = function (id, nome) {
        sensorParaExcluirId = id;
        document.getElementById('deleteSensorName').textContent = nome;
        new bootstrap.Modal(document.getElementById('deleteModal')).show();
    };

    async function executarExclusao() {
        if (!sensorParaExcluirId) return;

        try {
            const response = await fetch(`http://localhost:5000/delete_sensor/${sensorParaExcluirId}`, {
                method: 'DELETE'
            });
            const data = await response.json();

            if (!response.ok || !data.affected_rows) {
                throw new Error(data.mensagem || 'Sensor não encontrado.');
            }
            exibirMensagemGeral("Sensor excluído com sucesso!", "success");
            await carregarSensores();

        } catch (error) {
            console.error("Erro ao excluir sensor:", error);
            exibirMensagemGeral('Erro ao excluir o sensor: ' + error.message, "danger");
        } finally {
            const deleteModal = bootstrap.Modal.getInstance(document.getElementById('deleteModal'));
            if (deleteModal) deleteModal.hide();
            sensorParaExcluirId = null;
        }
    }

    // Editar Sensor
    window.abrirModalEditarSensor = function (button) {
        const row = button.closest('tr');
        const idSensor = parseInt(row.cells[1].innerText);
        const sensor = allSensores.find(s => s.id_Sensor === idSensor);

        if (!sensor) {
            console.error("Sensor não encontrado para edição.");
            exibirMensagemGeral("Sensor não encontrado.", "danger");
            return;
        }

        document.getElementById('id_sensor').value = sensor.id_Sensor;
        document.getElementById('nome_update').value = sensor.Nome_Sensor;
        document.getElementById('tipo_update').value = sensor.Tipo;
        document.getElementById('unidade_update').value = sensor.Unidade_Medida;
        document.getElementById('status_update').value = sensor.Status;
        document.getElementById('modelo_update').value = sensor.Modelo;
        document.getElementById('numero_update').value = sensor.Numero_Serie;
        carregarAtivosParaSelects('ativo_update', sensor.id_Ativo);

        new bootstrap.Modal(document.getElementById('exampleModalUpdate')).show();
    }

    // --- FUNÇÕES AUXILIARES ---

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
            alert(mensagem); // Fallback
        }
    }

    async function carregarAtivosParaSelects(selectId, selectedValue = null) {
        try {
            const response = await fetch('http://localhost:5000/ativos');
            const ativos = await response.json();
            const select = document.getElementById(selectId);
            if (!select) return;

            select.innerHTML = '<option value="">Sem máquina vinculada</option>';
            ativos.forEach(ativo => {
                const option = document.createElement('option');
                option.value = ativo.id_Ativo;
                option.textContent = `${ativo.id_Ativo} - ${ativo.Nome_Ativo}`;
                if (selectedValue && ativo.id_Ativo == selectedValue) {
                    option.selected = true;
                }
                select.appendChild(option);
            });
        } catch (error) {
            console.error('Erro ao carregar máquinas:', error);
        }
    }

    // --- INICIALIZAÇÃO E EVENT LISTENERS ---

    // Carrega a lista de sensores e as opções de máquinas nos formulários
    carregarAtivosParaSelects('ativoSelect');
    carregarSensores();

    // Listener para o botão de confirmação de exclusão
    document.getElementById('confirmDeleteBtn').addEventListener('click', executarExclusao);

    // =========================================================================
    // FILTROS EM TEMPO REAL
    // =========================================================================
    document.getElementById('search_input').addEventListener('input', aplicarFiltros);

    document.querySelectorAll('.list-group-item').forEach(btn => {
        btn.addEventListener('click', function () {
            if (this.classList.contains('active')) {
                this.classList.remove('active');
            } else {
                document.querySelectorAll('.list-group-item').forEach(b => b.classList.remove('active'));
                this.classList.add('active');
            }
            aplicarFiltros();
        });
    });

    document.getElementById('limpar_filtros').addEventListener('click', () => {
        document.getElementById('search_input').value = '';
        const statusAtivo = document.querySelector('.list-group-item.active');
        if (statusAtivo) statusAtivo.classList.remove('active');
        aplicarFiltros();
        const dropdownInstance = bootstrap.Dropdown.getInstance(document.getElementById('filterDropdown'));
        if (dropdownInstance) dropdownInstance.hide();
    });

    // Listeners de paginação
    document.getElementById("prevBtn").addEventListener("click", () => changePage(currentPage - 1));
    document.getElementById("nextBtn").addEventListener("click", () => changePage(currentPage + 1));

    // Listener para o formulário de CADASTRO
    document.getElementById('formulario').addEventListener('submit', async function (event) {
        event.preventDefault();

        const saveButton = this.querySelector('#save');
        const spinner = document.getElementById('loadingSpinnerCadastro');

        // --- Inicia o loading ---
        saveButton.disabled = true;
        spinner.classList.remove('d-none');
        saveButton.textContent = 'Salvando...';

        const nome = document.getElementById('nome').value;
        const tipo = document.getElementById('tipo').value;
        const unidade = document.getElementById('unidade').value;
        const status = document.getElementById('status').value;
        const modelo = document.getElementById('modelo').value;
        const numero = document.getElementById('numero').value;
        const ativoSelect = document.getElementById('ativoSelect');
        const ativo = ativoSelect && ativoSelect.value !== "" ? parseInt(ativoSelect.value) : null;

        const payload = {
            table: "sensores",
            database: "sgmi",
            data: {
                Nome_Sensor: nome, Tipo: tipo, Unidade_Medida: unidade, Status: status,
                Modelo: modelo, Numero_Serie: numero, id_Ativo: ativo
            }
        };

        try {
            const response = await fetch('http://localhost:5000/insert', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await response.json();
            if (!response.ok) { // A verificação de erro de 'insert' já estava boa
                const erroMsg = Array.isArray(data.mensagem) ? data.mensagem.join('\n') : (data.mensagem || 'Erro desconhecido');
                throw new Error(erroMsg);
            }
            exibirMensagemGeral("Sensor cadastrado com sucesso!", "success", "mensagemSucesso");
            await carregarSensores();
            this.reset();
            bootstrap.Modal.getInstance(document.getElementById('exampleModal')).hide();
        } catch (error) {
            exibirMensagemGeral('Erro: ' + error.message, 'danger', 'mensagemErroInserir');
        } finally {
            // --- Finaliza o loading ---
            saveButton.disabled = false;
            spinner.classList.add('d-none');
            saveButton.textContent = 'Save changes';
        }
    });

    // Listener para o formulário de ATUALIZAÇÃO
    document.getElementById('formularioUpdate').addEventListener('submit', async function (event) {
        event.preventDefault();

        const saveButton = this.querySelector('#save');
        const spinner = document.getElementById('loadingSpinnerUpdate');

        // --- Inicia o loading ---
        saveButton.disabled = true;
        spinner.classList.remove('d-none');
        saveButton.textContent = 'Salvando...';

        const usuarioLogado = localStorage.getItem("Nome") || "sistema";
        const id_Sensor = document.getElementById('id_sensor').value;
        const id_ativo_raw = document.getElementById('ativo_update').value.trim();
        const dados = {
            id_Sensor: id_Sensor,
            Nome_Sensor: document.getElementById('nome_update').value,
            Tipo: document.getElementById('tipo_update').value,
            Unidade_Medida: document.getElementById('unidade_update').value,
            Status: document.getElementById('status_update').value,
            Modelo: document.getElementById('modelo_update').value,
            Numero_Serie: document.getElementById('numero_update').value,
            id_Ativo: id_ativo_raw === '' ? null : parseInt(id_ativo_raw),
            Usuario: localStorage.getItem('Nome') || 'sistema'
        };

        try {
            const response = await fetch(`http://localhost:5000/update_sensor/${id_Sensor}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dados)
            });
            const data = await response.json();

            // A verificação de erro
            if (!response.ok) {
                const erroMsg = Array.isArray(data.mensagem) ? data.mensagem.join('\n') : (data.mensagem || 'Erro desconhecido');
                throw new Error(erroMsg);
            }

            exibirMensagemGeral('Sensor atualizado com sucesso!', 'success', 'mensagemSucessoEditar');
            await carregarSensores();
            bootstrap.Modal.getInstance(document.getElementById('exampleModalUpdate')).hide();

        } catch (error) {
            exibirMensagemGeral('Erro: ' + error.message, 'danger', 'mensagemErroEditar');
        } finally {
            // --- Finaliza o loading ---
            saveButton.disabled = false;
            spinner.classList.add('d-none');
            saveButton.textContent = 'Save changes';
        }
    });
});


// Bloco do Particles.js
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('particles-js')) {
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
});