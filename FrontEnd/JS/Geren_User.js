// =================== VARIÁVEIS GLOBAIS DE ESTADO ===================
let allFuncionarios = []; // Guarda TODOS os funcionários carregados da API (cache)
let filteredFuncionarios = []; // Guarda os funcionários após aplicar os filtros
let funcionarioParaDeletar = { id: null, nome: null }; // Guarda dados para o modal de exclusão
let currentPage = 1;
const rowsPerPage = 10;

// =================== FUNÇÕES GLOBAIS (ACESSÍVEIS PELO HTML VIA ONCLICK) ===================

/**
 * Abre o modal de edição e preenche com os dados do funcionário.
 */
window.abrirModalEditarfuncionario = function (button) {
    const row = button.closest('tr');
    if (!row) return;

    const id = parseInt(row.cells[1].innerText, 10);
    const funcionario = allFuncionarios.find(f => f.id_Cadastro === id);

    if (!funcionario) {
        console.error("Funcionário não encontrado para edição.");
        exibirMensagemGeral("Erro: Funcionário não encontrado.", 'danger');
        return;
    }

    document.getElementById('id_usuario').value = funcionario.id_Cadastro;
    document.getElementById('nome_usuario').value = funcionario.Nome;
    document.getElementById('email_usuario').value = funcionario.Email;
    document.getElementById('senha_usuario').value = funcionario.Senha; // Limpar senha por segurança
    document.getElementById('senha_usuario').placeholder = "Deixe em branco para não alterar";
    document.getElementById('login_usuario').value = funcionario.Login;
    document.getElementById('telefone_usuario').value = funcionario.Telefone;
    document.getElementById('cep_usuario').value = funcionario.CEP;
    document.getElementById('cidade_usuario').value = funcionario.Cidade || '';
    document.getElementById('bairro_usuario').value = funcionario.Bairro || '';
    document.getElementById('rua_usuario').value = funcionario.Rua || '';
    document.getElementById('numero_usuario').value = funcionario.Numero;
    document.getElementById('complemento_usuario').value = funcionario.Complemento || '';
    document.getElementById('sexo_usuario').value = funcionario.Sexo;
    document.getElementById('cpf_usuario').value = funcionario.CPF;
    document.getElementById('data_nascimento_usuario').value = converterDataParaInput(funcionario.Data_Nascimento);
    document.getElementById('data_admissao_usuario').value = converterDataParaInput(funcionario.Data_Admissao);
    document.getElementById('tipo_usuario').value = funcionario.Tipo_Usuario;
    document.getElementById('cargo_usuario').value = funcionario.Cargo;
    document.getElementById('departamento_usuario').value = funcionario.Departamento;

    const fotoPreview = document.getElementById('foto_usuario_preview');
    if (funcionario.Foto_Usuario) {
        fotoPreview.src = `data:image/jpeg;base64,${funcionario.Foto_Usuario}`;
        fotoPreview.style.display = 'block';
    } else {
        fotoPreview.style.display = 'none';
    }

    const modal = new bootstrap.Modal(document.getElementById('usuarioModal'));
    modal.show();
};


/**
 * Abre o modal de confirmação para deletar um funcionário.
 */
window.abrirModalDeletar = function (id, nome) {
    funcionarioParaDeletar = { id, nome };
    document.getElementById('deleteUserName').textContent = nome;
    const modal = new bootstrap.Modal(document.getElementById('deleteModal'));
    modal.show();
}

/**
 * Exporta os dados da tabela para Excel ou PDF.
 */
/**
 * Exporta os dados da tabela para Excel, PDF, CSV ou SVG.
 */
window.exportar = function (formato, escopo) {
    // Seleciona os dados com base no escopo
    const dadosDaPagina = filteredFuncionarios.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);
    const dadosParaExportar = escopo === 'tudo' ? filteredFuncionarios : dadosDaPagina;

    if (dadosParaExportar.length === 0) {
        exibirMensagemGeral("Nenhum dado para exportar.", "warning");
        return;
    }

    const colunas = ["ID", "Nome", "Email", "Login", "Telefone", "CEP", "CPF", "Tipo", "Cargo", "Departamento"];
    
    // Prepara as linhas de dados
    const linhas = dadosParaExportar.map(f => [
        f.id_Cadastro, 
        f.Nome, 
        f.Email, 
        f.Login, 
        f.Telefone || '', 
        f.CEP || '', 
        f.CPF, 
        f.Tipo_Usuario, 
        f.Cargo, 
        f.Departamento
    ]);

    // ---------------- EXCEL ----------------
    if (formato === 'excel') {
        const worksheet = XLSX.utils.aoa_to_sheet([colunas, ...linhas]);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Funcionários");
        XLSX.writeFile(workbook, `funcionarios_${escopo}.xlsx`);

    // ---------------- PDF ----------------
    } else if (formato === 'pdf') {
        const { jsPDF } = window.jspdf;
        // 'landscape' porque a tabela de usuários é larga
        const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });

        doc.autoTable({
            head: [colunas],
            body: linhas,
            styles: { fontSize: 7, cellPadding: 3 }, // Fonte menor para caber tudo
            headStyles: { fillColor: [52, 58, 64] },
            alternateRowStyles: { fillColor: [240, 240, 240] }
        });
        doc.save(`funcionarios_${escopo}.pdf`);

    // ---------------- CSV ----------------
    } else if (formato === 'csv') {
        const separator = ';';
        let csvContent = "\uFEFF"; // BOM para acentos
        
        // Cabeçalho
        csvContent += colunas.join(separator) + "\n";

        // Linhas
        linhas.forEach(row => {
            const rowString = row.map(item => {
                let text = String(item !== null && item !== undefined ? item : "");
                // Trata separadores e quebras de linha
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
        link.setAttribute("download", `funcionarios_${escopo}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

    // ---------------- SVG ----------------
    } else if (formato === 'svg') {
        const rowHeight = 30;
        const colWidth = 85; // Colunas mais estreitas para caber 10 colunas
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
                
                // Trunca texto longo (importante para emails e nomes)
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
        link.setAttribute("download", `funcionarios_${escopo}.svg`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}
/**
 * Abre o modal para visualizar a imagem do funcionário.
 */
window.abrirModalImagem = function (idUsuario) {
    const usuario = allFuncionarios.find(f => f.id_Cadastro === idUsuario);
    if (!usuario || !usuario.Foto_Usuario) {
        exibirMensagemGeral("Este funcionário não possui imagem.", "warning");
        return;
    }
    document.getElementById('imagemUsuarioModal').src = `data:image/jpeg;base64,${usuario.Foto_Usuario}`;
    document.getElementById('imagemModal').style.display = 'block';
}

/**
 * Fecha o modal de imagem.
 */
window.fecharModalImagem = function () {
    document.getElementById('imagemModal').style.display = 'none';
}

/**
 * Alterna a visibilidade da senha no modal de edição.
 */
window.mostrarSenha = function () {
    const inputPass = document.getElementById('senha_usuario');
    const btnShowPass = document.getElementById('btn-senha');
    if (inputPass.type === 'password') {
        inputPass.setAttribute('type', 'text');
        btnShowPass.classList.replace('fa-eye', 'fa-eye-slash');
    } else {
        inputPass.setAttribute('type', 'password');
        btnShowPass.classList.replace('fa-eye-slash', 'fa-eye');
    }
}


// =================== FUNÇÕES DE LÓGICA INTERNA ===================

/**
 * Carrega todos os funcionários da API e inicia a renderização.
 */
async function carregarFuncionarios() {
    const tbody = document.getElementById('funcionarioTableBody');
    tbody.innerHTML = `<tr><td colspan="17" class="text-center">Carregando...</td></tr>`;
    try {
        const response = await fetch('http://localhost:5000/usuario');
        if (!response.ok) throw new Error(`Erro na rede: ${response.statusText}`);
        allFuncionarios = await response.json();
        aplicarFiltrosERenderizar();
    } catch (error) {
        console.error("Erro ao carregar funcionários:", error);
        tbody.innerHTML = `<tr><td colspan="17" class="text-center text-danger">Erro ao carregar funcionários: ${error.message}</td></tr>`;
    }
}

/**
 * Deleta o funcionário selecionado após confirmação.
 */
async function deletarFuncionarioConfirmado() {
    const { id } = funcionarioParaDeletar;
    if (!id) return;

    const modal = bootstrap.Modal.getInstance(document.getElementById('deleteModal'));
    try {
        const response = await fetch(`http://localhost:5000/delete_usuario/${id}`, {
            method: 'DELETE'
        });
        const data = await response.json();
        if (!response.ok || !data.affected_rows) {
            throw new Error(data.mensagem || 'Funcionário não encontrado ou já deletado.');
        }
        exibirMensagemGeral("Funcionário excluído com sucesso!", "success");
        await carregarFuncionarios();
    } catch (error) {
        console.error("Erro ao excluir funcionário:", error);
        exibirMensagemGeral(error.message, "danger");
    } finally {
        modal.hide();
        funcionarioParaDeletar = { id: null, nome: null };
    }
}


/**
 * Filtra a lista de funcionários e chama as funções de renderização.
 */
function aplicarFiltrosERenderizar() {
    const filtroNome = document.getElementById('filtroNomeInput').value.trim().toLowerCase();
    const filtroCargo = document.getElementById('filtroCargoInput').value.trim().toLowerCase();
    const filtroDepto = document.getElementById('filtroDepartamentoInput').value.trim().toLowerCase();
    const filtroTipoAtivo = document.querySelector('.list-group-item.active');
    const filtroTipo = filtroTipoAtivo ? filtroTipoAtivo.textContent.trim() : null;

    filteredFuncionarios = allFuncionarios.filter(f => {
        const nomeOk = !filtroNome || f.Nome?.toLowerCase().includes(filtroNome);
        const cargoOk = !filtroCargo || f.Cargo?.toLowerCase().includes(filtroCargo);
        const deptoOk = !filtroDepto || f.Departamento?.toLowerCase().includes(filtroDepto);
        const tipoOk = !filtroTipo || f.Tipo_Usuario === filtroTipo;
        return nomeOk && cargoOk && deptoOk && tipoOk;
    });

    currentPage = 1;
    renderTableRows();
    createPagination();
}

/**
 * Renderiza as linhas da tabela na página.
 */
function renderTableRows() {
    const tbody = document.getElementById('funcionarioTableBody');
    tbody.innerHTML = "";

    const start = (currentPage - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    const dadosPagina = filteredFuncionarios.slice(start, end);

    if (dadosPagina.length === 0) {
        tbody.innerHTML = `<tr><td colspan="17" class="text-center">Nenhum funcionário encontrado.</td></tr>`;
        return;
    }

    dadosPagina.forEach(f => {
        const row = document.createElement('tr');
        // Mantendo sua estrutura e IDs originais
        row.innerHTML = `
            <td id="total"></td>
            <td>${f.id_Cadastro}</td>
            <td>${f.Nome}</td>
            <td>${f.Email}</td>
            <td>${f.Login}</td>
            <td>${f.Telefone || ''}</td>
            <td>${f.CEP || ''}</td>
            <td>${f.Numero || ''}</td>
            <td>${f.Sexo || ''}</td>
            <td>${f.CPF}</td>
            <td>${converterDataParaBR(f.Data_Nascimento)}</td>
            <td>${f.Tipo_Usuario}</td>
            <td>${f.Cargo}</td>
            <td>${f.Departamento}</td>
            <td>${converterDataParaBR(f.Data_Admissao)}</td>
            <td class="imagem-coluna">
                <button id="viewImagebtn" onclick="abrirModalImagem(${f.id_Cadastro})">
                    <i class="fa-solid fa-image" id="viewImagebtn"></i>
                </button>
            </td>
            <td class="center">
                <button id="deleteBtn" onclick="abrirModalDeletar(${f.id_Cadastro}, '${f.Nome}')">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
                <button id="editBtn" onclick="abrirModalEditarfuncionario(this)">
                    <i class="fa-solid fa-square-pen"></i>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// =================== FUNÇÕES DE PAGINAÇÃO E UTILITÁRIOS ===================

function createPagination() {
    const paginationContainer = document.getElementById("paginationLines");
    const totalPages = Math.ceil(filteredFuncionarios.length / rowsPerPage);
    paginationContainer.innerHTML = "";
    for (let i = 1; i <= totalPages; i++) {
        const btn = document.createElement("button");
        btn.className = "btn";
        btn.innerHTML = `<hr class="page-line" id="line${i}">`;
        btn.onclick = () => changePage(i);
        paginationContainer.appendChild(btn);
    }
    if (totalPages > 0) {
        changePage(1);
    } else {
        document.getElementById("prevBtn").disabled = true;
        document.getElementById("nextBtn").disabled = true;
    }
}

function changePage(pageNumber) {
    const totalPages = Math.ceil(filteredFuncionarios.length / rowsPerPage);
    if (pageNumber < 1 && totalPages > 0) pageNumber = 1;
    if (pageNumber > totalPages) pageNumber = totalPages;
    // Evita re-renderização desnecessária
    if (currentPage === pageNumber && document.getElementById('funcionarioTableBody').hasChildNodes()) return;

    currentPage = pageNumber;
    renderTableRows();

    document.querySelectorAll(".page-line").forEach(line => line.classList.remove("active-line"));
    const activeLine = document.getElementById("line" + currentPage);
    if (activeLine) activeLine.classList.add("active-line");

    document.getElementById("prevBtn").disabled = (currentPage === 1 || totalPages === 0);
    document.getElementById("nextBtn").disabled = (currentPage === totalPages || totalPages === 0);
}

function converterDataParaInput(valor) {
    if (!valor) return ''; // Se o valor for nulo ou vazio, retorna vazio
    try {
        // Apenas cria o objeto Date diretamente com o valor recebido
        const data = new Date(valor);

        // Pega o ano, mês e dia da data, já ajustado para o fuso horário local
        const ano = data.getFullYear();
        const mes = String(data.getMonth() + 1).padStart(2, '0'); // Mês começa em 0, então +1
        const dia = String(data.getDate()).padStart(2, '0');

        // Retorna a data no formato YYYY-MM-DD que o input[type=date] entende
        return `${ano}-${mes}-${dia}`;
    } catch (e) {
        console.error("Erro ao converter data:", e);
        return ''; // Retorna vazio em caso de erro
    }
}

function converterDataParaBR(valor) {
    if (!valor) return '';
    try {
        const data = new Date(valor);
        return data.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
    } catch (e) {
        return '';
    }
}

function exibirMensagemGeral(mensagem, tipo = 'danger') {
    const mensagemDiv = document.getElementById('mensagemErroGeral');
    mensagemDiv.textContent = mensagem;
    mensagemDiv.className = `alert alert-${tipo}`;
    mensagemDiv.classList.remove('d-none');
    setTimeout(() => {
        mensagemDiv.classList.add('d-none');
    }, 4000);
}


// =================== INICIALIZAÇÃO E EVENT LISTENERS ===================

document.addEventListener("DOMContentLoaded", () => {
    // Carregamento inicial dos dados
    carregarFuncionarios();

    // Listeners da Paginação
    document.getElementById("prevBtn").addEventListener("click", () => changePage(currentPage - 1));
    document.getElementById("nextBtn").addEventListener("click", () => changePage(currentPage + 1));

    // =============================================================================
    // ALTERAÇÃO PRINCIPAL: FILTROS EM TEMPO REAL E SEM ONCLICK
    // =============================================================================

    // Listeners para filtros de texto em TEMPO REAL
    document.getElementById('filtroNomeInput').addEventListener('input', aplicarFiltrosERenderizar);
    document.getElementById('filtroCargoInput').addEventListener('input', aplicarFiltrosERenderizar);
    document.getElementById('filtroDepartamentoInput').addEventListener('input', aplicarFiltrosERenderizar);

    // Listeners para os botões de filtro de Tipo de Conta
    document.querySelectorAll('.filter-dropdown .list-group-item-action').forEach(btn => {
        btn.addEventListener('click', function () {
            // Se o botão clicado já está ativo, desativa
            if (this.classList.contains('active')) {
                this.classList.remove('active');
            } else {
                // Remove a classe 'active' de todos e adiciona apenas no clicado
                document.querySelectorAll('.filter-dropdown .list-group-item-action').forEach(b => b.classList.remove('active'));
                this.classList.add('active');
            }
            // Aplica os filtros imediatamente ao clicar
            aplicarFiltrosERenderizar();
        });
    });

    // Listener do botão de Limpar Filtros
    document.getElementById('limpar_filtros').addEventListener('click', () => {
        document.getElementById('filtroNomeInput').value = '';
        document.getElementById('filtroCargoInput').value = '';
        document.getElementById('filtroDepartamentoInput').value = '';
        const filtroAtivo = document.querySelector('.list-group-item.active');
        if (filtroAtivo) {
            filtroAtivo.classList.remove('active');
        }
        aplicarFiltrosERenderizar();
        bootstrap.Dropdown.getInstance(document.getElementById('filterDropdown')).hide();
    });


    // Listener do Modal de Exclusão
    document.getElementById('confirmDeleteBtn').addEventListener('click', deletarFuncionarioConfirmado);

    // Listener do Modal de Edição (Submit do Formulário)
    document.getElementById('formularioUsuario').addEventListener('submit', async function (event) {
        event.preventDefault();

        const saveButton = this.querySelector('#save'); // 'this' é o formulário
        const spinner = document.getElementById('loadingSpinnerUpdate');

        // --- Inicia o loading ---
        saveButton.disabled = true;
        spinner.classList.remove('d-none');
        saveButton.textContent = 'Salvando...';

        const formData = new FormData(this);
        const idUsuario = formData.get('Id_Cadastro'); // Pega o ID do formulário

        // Se a senha estiver vazia, removemos para não enviar uma string vazia
        if (!formData.get('Senha')) {
            formData.delete('Senha');
        }

        // Se uma nova foto não foi selecionada, removemos para não enviar um arquivo vazio
        const fotoInput = document.getElementById('foto_usuario');
        if (fotoInput.files.length === 0) {
            formData.delete("Foto_Usuario");
        }

        const mensagemSucesso = document.getElementById('mensagemsucesso');
        const mensagemErro = document.getElementById('mensagemErroEditar');
        mensagemSucesso.classList.add('d-none');
        mensagemErro.classList.add('d-none');

        try {
            const response = await fetch(`http://localhost:5000/update_usuario/${idUsuario}`, {
                method: 'PUT',
                body: formData
            });
            const data = await response.json();

            // Verificação de erro 
            if (!response.ok) {
                const erroMsg = Array.isArray(data.mensagem) ? data.mensagem.join('\n') : (data.mensagem || 'Erro desconhecido ao atualizar');
                throw new Error(erroMsg);
            }

            mensagemSucesso.textContent = 'Usuário atualizado com sucesso';
            mensagemSucesso.classList.remove('d-none');

            setTimeout(async () => {
                const modal = bootstrap.Modal.getInstance(document.getElementById('usuarioModal'));
                if (modal) modal.hide();
                await carregarFuncionarios(); // Recarrega os dados após fechar o modal
            }, 1500);

        } catch (error) {
            mensagemErro.innerHTML = `Erro: ${error.message}`;
            mensagemErro.classList.remove('d-none');
        } finally {
            // --- Finaliza o loading (sempre executa) ---
            saveButton.disabled = false;
            spinner.classList.add('d-none');
            saveButton.textContent = 'Salvar Alterações';
        }
    });

    // Listener para busca de CEP no modal de edição
    document.getElementById('cep_usuario').addEventListener('blur', async function () {
        const cep = this.value.replace(/\D/g, '');
        if (cep.length === 8) {
            try {
                const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
                const data = await response.json();
                if (data.erro) {
                    exibirMensagemGeral('CEP não encontrado.', 'warning');
                } else {
                    document.getElementById('rua_usuario').value = data.logradouro || '';
                    document.getElementById('bairro_usuario').value = data.bairro || '';
                    document.getElementById('cidade_usuario').value = data.localidade || '';
                }
            } catch (error) {
                exibirMensagemGeral('Erro ao buscar o CEP.', 'danger');
            }
        }
    });

    // Listener para o preview da foto
    document.getElementById("foto_usuario").addEventListener("change", function () {
        const preview = document.getElementById("foto_usuario_preview");
        const file = this.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = e => {
                preview.src = e.target.result;
                preview.style.display = 'block';
            }
            reader.readAsDataURL(file);
        }
    });

    // Inicialização do Particles.js
    if (document.getElementById('particles-js')) {
        particlesJS('particles-js', {
            "particles": {
                "number": {
                    "value": 50,
                    "density": {
                        "enable": true,
                        "value_area": 800
                    }
                },
                "color": {
                    "value": "#0d6efd"
                },
                "shape": {
                    "type": "circle"
                },
                "opacity": {
                    "value": 0.7,
                    "random": true
                },
                "size": {
                    "value": 3,
                    "random": true
                },
                "line_linked": {
                    "enable": true,
                    "distance": 150,
                    "color": "#0d6efd",
                    "opacity": 0.2,
                    "width": 1
                },
                "move": {
                    "enable": true,
                    "speed": 1,
                    "direction": "none",
                    "out_mode": "out"
                }
            },
            "interactivity": {
                "detect_on": "canvas",
                "events": {
                    "onhover": {
                        "enable": true,
                        "mode": "grab"
                    }
                },
                "modes": {
                    "grab": {
                        "distance": 140,
                        "line_linked": {
                            "opacity": 0.5
                        }
                    }
                }
            },
            "retina_detect": true
        });
    }
});