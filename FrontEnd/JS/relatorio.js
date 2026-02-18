// =================== VARIÁVEIS GLOBAIS DE ESTADO ===================
let allHistoricos = []; // Guarda a lista COMPLETA de históricos vinda da API
let filteredHistoricos = []; // Guarda a lista FILTRADA que será exibida na tela
let currentPage = 1;
const rowsPerPage = 10;
let totalPages = 1;

// =================== FUNÇÕES GLOBAIS E DE EXPORTAÇÃO ===================
window.exportar = function (formato, scope) {
    // 1. Seleção dos dados
    const dadosParaExportar = scope === 'tudo'
        ? filteredHistoricos
        : filteredHistoricos.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

    if (dadosParaExportar.length === 0) {
        alert("Nenhum registro para exportar.");
        return;
    }

    // 2. Funções de Formatação (Mantidas do seu código)
    function formatarData(dataISO) {
        if (!dataISO || dataISO === "N/A") return "N/A";
        const d = new Date(dataISO);
        return d.toLocaleString("pt-BR", {
            day: "2-digit", month: "2-digit", year: "numeric",
            hour: "2-digit", minute: "2-digit"
        });
    }

    function formatarCusto(valor) {
        if (!valor) valor = 0;
        return parseFloat(valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    }

    function formatarDuracao(valor) {
        if (!valor) return "0m";
        const horas = Math.floor(valor);
        const minutos = Math.round((valor - horas) * 60);
        let resultado = "";
        if (horas > 0) resultado += `${horas}h `;
        if (minutos > 0) resultado += `${minutos}m`;
        return resultado.trim();
    }

    // 3. Definição de Colunas e Linhas
    const colunas = [
        "ID Manut.", "ID Ordem", "ID Ativo", "Descrição", "Abertura", "Fechamento",
        "Status", "Prioridade", "Custo", "Duração", "Tipo", "Campo", 
        "Antigo", "Novo", "ID Sol.", "Resp.", "Modificação"
    ];

    const linhas = dadosParaExportar.map(h => [
        h.id_Manutencao,
        h.id_Ordem,
        h.id_Ativo,
        h.Descricao_Problema,
        formatarData(h.Data_Abertura),
        formatarData(h.Data_Fechamento),
        h.Status,
        h.Prioridade,
        formatarCusto(h.Custo),
        formatarDuracao(h.Duracao),
        h.Tipo_Manutencao,
        h.Campo_Alterado || "-",
        h.Valor_Antigo || "-",
        h.Valor_Novo || "-",
        h.id_Solicitacao,
        h.id_Funcionario_Consertou || "-",
        formatarData(h.Data_Modificacao)
    ]);

    const dataHora = new Date().toLocaleString('pt-BR').replace(/[/:]/g, '-').replace(', ', '_');
    const nomeArquivo = `historico_manutencao_${scope}_${dataHora}`;

    // ---------------- EXCEL ----------------
    if (formato === 'excel') {
        const worksheet = XLSX.utils.aoa_to_sheet([colunas, ...linhas]);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Histórico");
        XLSX.writeFile(workbook, `${nomeArquivo}.xlsx`);

    // ---------------- PDF ----------------
    } else if (formato === 'pdf') {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
        
        doc.autoTable({
            head: [colunas],
            body: linhas,
            styles: { fontSize: 5, cellPadding: 2 }, // Fonte pequena para caber tudo
            headStyles: { fillColor: [44, 62, 80] },
            alternateRowStyles: { fillColor: [240, 240, 240] }
        });
        doc.save(`${nomeArquivo}.pdf`);

    // ---------------- CSV ----------------
    } else if (formato === 'csv') {
        const separator = ';';
        let csvContent = "\uFEFF"; // BOM para acentos
        
        // Cabeçalho
        csvContent += colunas.join(separator) + "\n";

        // Dados
        linhas.forEach(row => {
            const rowString = row.map(item => {
                let text = String(item !== null && item !== undefined ? item : "");
                // Remove quebras de linha dentro das células (causa erro no CSV)
                text = text.replace(/(\r\n|\n|\r)/gm, " ");
                // Se tiver o separador, coloca entre aspas
                if (text.search(separator) !== -1) {
                    text = `"${text}"`;
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
        const rowHeight = 25;
        const colWidth = 70; // Colunas estreitas
        const fontSize = 8;
        const headerColor = "#2c3e50";
        const headerTextColor = "#ffffff";
        const borderColor = "#cccccc";

        const totalWidth = colunas.length * colWidth;
        const totalHeight = (linhas.length + 1) * rowHeight;

        let svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="${totalHeight}" style="font-family: Arial, sans-serif; font-size: ${fontSize}px;">`;

        // Desenha Cabeçalho
        colunas.forEach((col, index) => {
            const x = index * colWidth;
            const y = 0;
            svgContent += `<rect x="${x}" y="${y}" width="${colWidth}" height="${rowHeight}" fill="${headerColor}" stroke="${borderColor}" />`;
            svgContent += `<text x="${x + 2}" y="${y + 18}" fill="${headerTextColor}" font-weight="bold">${col}</text>`;
        });

        // Desenha Linhas
        linhas.forEach((row, rowIndex) => {
            const y = (rowIndex + 1) * rowHeight;
            row.forEach((cellData, colIndex) => {
                const x = colIndex * colWidth;
                let cellText = String(cellData !== null && cellData !== undefined ? cellData : "");
                
                // Trunca texto longo para não vazar no SVG
                if (cellText.length > 12) {
                    cellText = cellText.substring(0, 10) + "...";
                }

                svgContent += `<rect x="${x}" y="${y}" width="${colWidth}" height="${rowHeight}" fill="#ffffff" stroke="${borderColor}" />`;
                svgContent += `<text x="${x + 2}" y="${y + 18}" fill="#000000">${cellText}</text>`;
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

// =================== INICIALIZAÇÃO ===================
document.addEventListener('DOMContentLoaded', () => {
    carregarDadosIniciais();
    configurarEventListeners();
});

async function carregarDadosIniciais() {
    try {
        const [historicosResponse] = await Promise.all([
            fetch('http://localhost:5000/historico')
        ]);

        const historicos = await historicosResponse.json();
 

        allHistoricos = Array.isArray(historicos) ? historicos : [];

        aplicarFiltros();

    } catch (error) {
        console.error("Erro ao carregar dados iniciais:", error);
        document.getElementById('historicoTableBody').innerHTML = `<tr><td colspan="9" class="text-center text-danger">Falha ao carregar dados. Verifique a conexão com a API.</td></tr>`;
    }
}

function configurarEventListeners() {
    // Filtros de Texto e Seleção
    document.getElementById('filtro_descricao').addEventListener('input', aplicarFiltros);
    document.getElementById('filtro_tipo').addEventListener('change', aplicarFiltros);
    
    // Status e Datas
    document.getElementById('filtro_status').addEventListener('change', aplicarFiltros);
    document.getElementById('filtro_data_inicio').addEventListener('change', aplicarFiltros);
    document.getElementById('filtro_data_fim').addEventListener('change', aplicarFiltros);

    // Botão Limpar 
    document.getElementById('limpar_filtros').addEventListener('click', () => {
        document.getElementById('filtro_descricao').value = '';
        document.getElementById('filtro_tipo').value = '';
        document.getElementById('filtro_status').value = '';
        document.getElementById('filtro_data_inicio').value = '';
        document.getElementById('filtro_data_fim').value = '';
        
        aplicarFiltros();
    });

    // Paginação
    document.getElementById("prevBtn").addEventListener("click", () => changePage(currentPage - 1));
    document.getElementById("nextBtn").addEventListener("click", () => changePage(currentPage + 1));
}


// =================== LÓGICA DA TABELA, FILTRO E PAGINAÇÃO ===================

function aplicarFiltros() {
    let tempHistoricos = [...allHistoricos]; // Cria uma cópia para não estragar o original
    
    // 1. Coleta os valores dos inputs
    const searchDesc = document.getElementById('filtro_descricao').value.toLowerCase();
    const tipoFiltro = document.getElementById('filtro_tipo').value;
    const statusFiltro = document.getElementById('filtro_status').value;
    const dataInicio = document.getElementById('filtro_data_inicio').value;
    const dataFim = document.getElementById('filtro_data_fim').value;

    // 2. Filtro de Descrição
    if (searchDesc) {
        tempHistoricos = tempHistoricos.filter(h => h.Descricao_Problema && h.Descricao_Problema.toLowerCase().includes(searchDesc));
    }

    // 3. Filtro de Tipo
    if (tipoFiltro) {
        tempHistoricos = tempHistoricos.filter(h => h.Tipo_Manutencao === tipoFiltro);
    }

    // 4. Filtro de Status
    if (statusFiltro) {
        tempHistoricos = tempHistoricos.filter(h => h.Status === statusFiltro);
    }

    // 5. Filtro de Data por Período 
    // Se tiver data inicio, filtra. Se tiver data fim, filtra.
    if (dataInicio || dataFim) {
        tempHistoricos = tempHistoricos.filter(h => {
            if (!h.Data_Abertura) return false; // Se não tiver data, some

            // Pega só a parte YYYY-MM-DD da data do banco (que vem como "2024-02-05T14:30...")
            const dataItem = h.Data_Abertura.split('T')[0];

            // Se existe Data Inicio e a data do item for MENOR, remove.
            if (dataInicio && dataItem < dataInicio) return false;

            // Se existe Data Fim e a data do item for MAIOR, remove.
            if (dataFim && dataItem > dataFim) return false;

            return true; // Passou no teste
        });
    }

    // 6. Atualiza a tabela e paginação
    filteredHistoricos = tempHistoricos;
    totalPages = Math.ceil(filteredHistoricos.length / rowsPerPage) || 1;
    createPagination();
    changePage(1); // Volta pra página 1 sempre que filtrar
}

function renderTableRows() {
    const tbody = document.getElementById('historicoTableBody');
    tbody.innerHTML = "";
    const start = (currentPage - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    const dadosPagina = filteredHistoricos.slice(start, end);

    if (dadosPagina.length === 0) {
        tbody.innerHTML = `<tr><td colspan="16" class="text-center">Nenhum registro encontrado.</td></tr>`;
        return;
    }

    let contador = start + 1; // contador da primeira coluna

    dadosPagina.forEach(item => {
        const row = `
<tr>
   <td id="total"></td>
    <td>${item.id_Manutencao}</td>
    <td>${item.id_Ordem}</td>
    <td>${item.id_Ativo}</td>
    <td>${item.Descricao_Problema}</td>
    <td>${item.Data_Abertura}</td>
    <td>${item.Data_Fechamento || 'N/A'}</td>
    <td>${item.Status}</td>
    <td>${item.Prioridade}</td>
    <td>${item.Custo ? parseFloat(item.Custo).toFixed(2) : '0.00'}</td>
    <td>${item.Duracao ? parseFloat(item.Duracao).toFixed(2) : '0.00'}</td>
    <td>${item.Tipo_Manutencao}</td>
    <td>${item.Campo_Alterado}</td>
    <td>${item.Valor_Antigo}</td>
    <td>${item.Valor_Novo}</td>
    <td>${item.id_Solicitacao}</td>
    <td>${item.id_Funcionario_Consertou || 'N/A'}</td>
    <td>${item.Data_Modificacao}</td>
</tr>
        `;
        tbody.innerHTML += row;
    });
}



function createPagination() {
    const paginationContainer = document.getElementById("paginationLines");
    paginationContainer.innerHTML = "";
    for (let i = 1; i <= totalPages; i++) {
        const btn = document.createElement("button");
        btn.className = "btn";
        btn.innerHTML = `<hr class="page-line" id="line${i}">`;
        btn.onclick = () => changePage(i);
        paginationContainer.appendChild(btn);
    }
}

function changePage(page) {
    if (page < 1) page = 1;
    if (page > totalPages) page = totalPages;
    currentPage = page;

    renderTableRows();

    document.querySelectorAll(".page-line").forEach(line => line.classList.remove("active-line"));
    const activeLine = document.getElementById("line" + currentPage);
    if (activeLine) activeLine.classList.add("active-line");

    document.getElementById("prevBtn").disabled = (currentPage === 1);
    document.getElementById("nextBtn").disabled = (currentPage === totalPages || totalPages === 0);
    document.getElementById("content").innerText = `Página ${currentPage}`;
}