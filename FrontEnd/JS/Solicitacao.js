document.addEventListener('DOMContentLoaded', () => {

    // --- FUNÇÃO AUXILIAR PARA EXIBIR MENSAGENS ---
    /**
     * Exibe uma mensagem de sucesso, aviso ou erro na tela.
     * @param {string} mensagem - O texto a ser exibido.
     * @param {string} tipo - 'sucesso', 'erro', ou 'aviso'.
     */
    function exibirMensagem(mensagem, tipo = 'erro') {
        const elementoSucesso = document.getElementById('mensagemSucesso');
        const elementoErro = document.getElementById('mensagemErro');

        // Esconde ambas as mensagens primeiro para garantir que só uma apareça
        elementoSucesso.classList.add('d-none');
        elementoErro.classList.add('d-none');

        const elemento = (tipo === 'sucesso') ? elementoSucesso : elementoErro;

        if (elemento) {
            // Define a cor do alerta com base no tipo
            if (tipo === 'aviso') {
                elemento.className = 'alert alert-warning';
            } else if (tipo === 'sucesso') {
                elemento.className = 'alert alert-success';
            } else {
                elemento.className = 'alert alert-danger';
            }

            elemento.textContent = mensagem;
            elemento.classList.remove('d-none');

            // Esconde a mensagem após 5 segundos
            setTimeout(() => {
                elemento.classList.add('d-none');
            }, 5000);
        }
    }

    // --- CARREGAMENTO DE DADOS INICIAIS ---

    const tabela = document.querySelector('#tabelaAtivos tbody');
    // Recupera ID e nome do usuário logado
    const userId = localStorage.getItem("ID");
    const userName = localStorage.getItem("Nome");

    // Campo visível (nome)
    const solicitanteNomeInput = document.getElementById("solicitanteNome");
    if (solicitanteNomeInput) solicitanteNomeInput.value = userName;

    // Campo oculto (ID) que será enviado
    const solicitanteInput = document.getElementById("solicitante");
    if (solicitanteInput) solicitanteInput.value = userId;

    // --- LÓGICA DO MODAL DE ATIVOS ---

    const modalAtivos = document.getElementById('modalAtivos');
    if (modalAtivos) {
        modalAtivos.addEventListener('show.bs.modal', async () => {
            try {
                tabela.innerHTML = '<tr><td colspan="2">Carregando...</td></tr>';
                const response = await fetch('http://localhost:5000/ativos');
                const ativos = await response.json();

                tabela.innerHTML = '';

                if (ativos.length === 0) {
                    tabela.innerHTML = '<tr><td colspan="2">Nenhum ativo encontrado.</td></tr>';
                } else {
                    ativos.forEach(ativo => {
                        const linha = document.createElement('tr');
                        linha.innerHTML = `
                            <td>${ativo.id_Ativo}</td>
                            <td>${ativo.Nome_Ativo}</td>
                        `;
                        linha.style.cursor = 'pointer';
                        linha.addEventListener('click', () => {
                            document.getElementById('id_Ativo').value = `${ativo.id_Ativo} - ${ativo.Nome_Ativo}`; // Preenche com ID e Nome
                            const modal = bootstrap.Modal.getInstance(document.getElementById('modalAtivos'));
                            if (modal) modal.hide();
                        });
                        tabela.appendChild(linha);
                    });
                }
            } catch (error) {
                console.error('Erro ao carregar ativos:', error);
                tabela.innerHTML = '<tr><td colspan="2">Erro ao carregar ativos.</td></tr>';
            }
        });
    }

    // --- ENVIO DO FORMULÁRIO ---
    document.getElementById('formulario').addEventListener('submit', async function (event) {
        event.preventDefault();

        const enviarButton = document.getElementById('Enviar');
        const loadingSpinner = document.getElementById('loadingSpinner');

        // --- INÍCIO DA LÓGICA DE LOADING ---
        enviarButton.disabled = true;
        loadingSpinner.classList.remove('d-none');
        enviarButton.textContent = 'Enviando...'; // Muda o texto do botão

        // Coleta de valores
        const titulo = document.getElementById('titulo').value;
        const solicitante = document.getElementById("solicitante").value;
        const prioridade = document.getElementById('prioridade').value;
        const status = document.getElementById('status').value;
        const problema = document.getElementById('problema').value;
        const id_ativo_raw = document.getElementById('id_Ativo').value;
        const id_ativo = id_ativo_raw ? id_ativo_raw.split(' - ')[0] : null;

        // Validação de campos vazios
        if (!titulo || !solicitante || !prioridade || !status || !problema || !id_ativo) {
            exibirMensagem('Todos os campos são obrigatórios.', 'aviso');
            // Reverte o estado de loading se a validação falhar
            enviarButton.disabled = false;
            loadingSpinner.classList.add('d-none');
            enviarButton.textContent = 'Enviar';
            return;
        }

        const dados = {
            table: "solicitacoes",
            database: "sgmi",
            data: {
                Titulo: titulo,
                solicitante: parseInt(solicitante),
                Prioridade: prioridade,
                Status: status,
                Problema: problema,
                id_Ativo: parseInt(id_ativo)
            }
        };

        try {
            const response = await fetch('http://localhost:5000/criar_solicitacao', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dados)
            });

            const responseData = await response.json();

            if (!response.ok) {
                if (responseData && responseData.mensagem && Array.isArray(responseData.mensagem)) {
                    // Junta a lista de erros com quebra de linha
                    const mensagemFormatada = responseData.mensagem.join('\n');
                    throw new Error(mensagemFormatada);
                }
                throw new Error(responseData.message || 'Formato de erro inesperado.');
            }

            if (responseData.inserted_id || responseData.success) {
                exibirMensagem('Solicitação enviada com sucesso!', 'sucesso');
                this.reset(); // 'this' aqui se refere ao formulário
                // Reaplica os valores do usuário que foram limpos pelo reset.
                document.getElementById("solicitante").value = localStorage.getItem("ID");
                document.getElementById("solicitanteNome").value = localStorage.getItem("Nome");
            } else {
                throw new Error(responseData.message || 'Ocorreu um erro ao processar a solicitação.');
            }

        } catch (error) {
            exibirMensagem('Erro:\n' + error.message, 'erro');
            console.error("Erro fatal na requisição:", error);
        } finally {
            // --- FIM DA LÓGICA DE LOADING ---
            // Sempre será executado, dando certo ou errado
            enviarButton.disabled = false;
            loadingSpinner.classList.add('d-none');
            enviarButton.textContent = 'Enviar';
        }
    });
});