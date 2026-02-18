// relatorioSensor.js

// =================== VARIÁVEIS GLOBAIS ===================
let allHistoricos = [];
let filteredHistoricos = [];
let currentPage = 1;
const rowsPerPage = 10;
let totalPages = 1;
let historicoParaExcluirId = null;
const API_BASE_URL = 'http://localhost:5000'; // Ajuste conforme sua API

// =================== FUNÇÃO DE EXPORTAÇÃO ===================
window.exportar = function (formato, scope) {
    const dadosParaExportar = scope === 'tudo'
        ? filteredHistoricos
        : filteredHistoricos.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

    if (!dadosParaExportar || dadosParaExportar.length === 0) {
        alert("Nenhum registro para exportar.");
        return;
    }

    const colunas = ["ID", "ID Sensor", "Campo Alterado", "Valor Antigo", "Valor Novo", "Data Modificação", "Usuário"];

    const linhas = dadosParaExportar.map(h => [
        h.id_historico ?? 'N/A',
        h.id_Sensor ?? 'N/A',
        h.Campo_Alterado ?? 'N/A',
        h.Valor_Antigo ?? 'N/A',
        h.Valor_Novo ?? 'N/A',
        h.Data_Modificacao ? new Date(h.Data_Modificacao).toLocaleString('pt-BR') : 'N/A',
        h.Usuario ?? 'N/A'
    ]);

    const dataHora = new Date().toLocaleString('pt-BR').replace(/[/:]/g, '-').replace(/\s/g, '_');
    const nomeArquivo = `historico_sensores_${scope}_${dataHora}`;

    // ---------------- EXCEL ----------------
    if (formato === 'excel') {
        const worksheet = XLSX.utils.aoa_to_sheet([colunas, ...linhas]);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Histórico Sensores");
        XLSX.writeFile(workbook, `${nomeArquivo}.xlsx`);

        // ---------------- PDF ----------------
    } else if (formato === 'pdf') {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });

        doc.autoTable({
            head: [colunas],
            body: linhas,
            styles: { fontSize: 9, cellPadding: 3 },
            headStyles: { fillColor: [44, 62, 80] },
            alternateRowStyles: { fillColor: [240, 240, 240] }
        });
        doc.save(`${nomeArquivo}.pdf`);

        // ---------------- CSV ----------------
    } else if (formato === 'csv') {
        const separator = ';';
        let csvContent = "\uFEFF"; // BOM para acentos

        csvContent += colunas.join(separator) + "\n";

        linhas.forEach(row => {
            const rowString = row.map(item => {
                let text = String(item !== null && item !== undefined ? item : "");
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
        link.setAttribute("download", `${nomeArquivo}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // ---------------- SVG ----------------
    } else if (formato === 'svg') {
        const rowHeight = 30;
        const colWidth = 110;
        const fontSize = 10;
        const headerColor = "#2c3e50";
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

                if (cellText.length > 15) {
                    cellText = cellText.substring(0, 13) + "...";
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
        link.setAttribute("download", `${nomeArquivo}.svg`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

// =================== CARREGAMENTO DE DADOS ===================
async function carregarDadosSensores() {
    try {
        const response = await fetch(`${API_BASE_URL}/historico_sensores`);
        if (!response.ok) throw new Error('Falha ao buscar dados da API.');

        const historicos = await response.json();
        allHistoricos = Array.isArray(historicos) ? historicos : [];

        aplicarFiltros();
    } catch (error) {
        console.error("Erro ao carregar histórico de sensores:", error);
        document.getElementById('historicoSensorTableBody').innerHTML =
            `<tr><td colspan="9" class="text-center text-danger">Erro ao carregar dados. Verifique a API.</td></tr>`;
    }
}

// =================== FILTROS ===================
function aplicarFiltros() {
    let tempHistoricos = [...allHistoricos]; // Cópia do array original

    // 1. Coleta os valores
    const idFiltro = document.getElementById('filtro_id').value;
    const usuarioFiltro = document.getElementById('filtro_usuario').value.toLowerCase();
    const campoFiltro = document.getElementById('filtro_campo').value;
    const dataInicio = document.getElementById('filtro_data_inicio').value;
    const dataFim = document.getElementById('filtro_data_fim').value;

    tempHistoricos = tempHistoricos.filter(item => {
        // --- FILTRO 1: ID ---
        const idDoItem = item.id_Sensor;
        if (idFiltro && idDoItem != idFiltro) {
            return false;
        }

        // --- FILTRO 2: Usuário (Texto parcial) ---
        if (usuarioFiltro && item.Usuario && !item.Usuario.toLowerCase().includes(usuarioFiltro)) {
            return false;
        }

        // --- FILTRO 3: Campo Alterado (Exato) ---
        if (campoFiltro && item.Campo_Alterado !== campoFiltro) {
            return false;
        }

        // --- FILTRO 4: Datas ---
        if (dataInicio || dataFim) {
            if (!item.Data_Modificacao) return false;

            let dataItem;
            try {
                dataItem = new Date(item.Data_Modificacao).toISOString().split('T')[0];
            } catch (e) {
                // Se a data for inválida, ignora esse item ou usa substring bruta
                dataItem = String(item.Data_Modificacao).substring(0, 10);
            }

            if (dataInicio && dataItem < dataInicio) return false;
            if (dataFim && dataItem > dataFim) return false;
        }

        return true; // Passou em tudo
    });

    // Renderiza
    filteredHistoricos = tempHistoricos;
    totalPages = Math.ceil(filteredHistoricos.length / rowsPerPage) || 1;
    criarPaginacao();
    changePageSensores(1);
}

// =================== RENDERIZAÇÃO DA TABELA ===================
function renderizarTabelaSensores() {
    const tbody = document.getElementById('historicoSensorTableBody');
    tbody.innerHTML = "";

    const start = (currentPage - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    const dadosPagina = filteredHistoricos.slice(start, end);

    if (dadosPagina.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" class="text-center">Nenhum registro encontrado.</td></tr>`;
        return;
    }

    dadosPagina.forEach((item, index) => {
        const dataFormatada = item.Data_Modificacao ? new Date(item.Data_Modificacao).toLocaleString('pt-BR') : 'N/A';
        const row = `
            <tr>
                <td>${start + index + 1}</td>
                <td>${item.id_historico ?? 'N/A'}</td>
                <td>${item.id_Sensor ?? 'N/A'}</td>
                <td>${item.Campo_Alterado ?? 'N/A'}</td>
                <td>${item.Valor_Antigo ?? 'N/A'}</td>
                <td>${item.Valor_Novo ?? 'N/A'}</td>
                <td>${dataFormatada}</td>
                <td>${item.Usuario ?? 'N/A'}</td>
            </tr>
        `;
        tbody.innerHTML += row;
    });
}

// =================== PAGINAÇÃO ===================
function criarPaginacao() {
    const paginationContainer = document.getElementById("paginationLines");
    paginationContainer.innerHTML = "";
    for (let i = 1; i <= totalPages; i++) {
        const btn = document.createElement("button");
        btn.className = "btn";
        btn.innerHTML = `<hr class="page-line" id="line${i}">`;
        btn.onclick = () => changePageSensores(i);
        paginationContainer.appendChild(btn);
    }
}

function changePageSensores(page) {
    if (page < 1) page = 1;
    if (page > totalPages) page = totalPages;
    currentPage = page;
    renderizarTabelaSensores();

    document.querySelectorAll(".page-line").forEach(line => line.classList.remove("active-line"));
    const activeLine = document.getElementById("line" + currentPage);
    if (activeLine) activeLine.classList.add("active-line");

    document.getElementById("prevBtn").disabled = (currentPage === 1);
    document.getElementById("nextBtn").disabled = (currentPage === totalPages || totalPages === 0);
    document.getElementById("content").innerText = `Página ${currentPage}`;
}

// =================== EVENT LISTENERS ===================
document.addEventListener("DOMContentLoaded", () => {
    // Configurar os Listeners
    document.getElementById('filtro_id').addEventListener('input', aplicarFiltros);
    document.getElementById('filtro_usuario').addEventListener('input', aplicarFiltros);
    document.getElementById('filtro_campo').addEventListener('change', aplicarFiltros);
    document.getElementById('filtro_data_inicio').addEventListener('change', aplicarFiltros);
    document.getElementById('filtro_data_fim').addEventListener('change', aplicarFiltros);

    document.getElementById('limpar_filtros').addEventListener('click', () => {
        document.querySelectorAll('.dropdown-menu input, .dropdown-menu select').forEach(input => input.value = '');
        aplicarFiltros();
    });


    document.getElementById("prevBtn")?.addEventListener("click", () => changePageSensores(currentPage - 1));
    document.getElementById("nextBtn")?.addEventListener("click", () => changePageSensores(currentPage + 1));

    carregarDadosSensores();
});
