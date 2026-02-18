// =========================================================================
//  Cadastro de Usuário
// =========================================================================

document.addEventListener('DOMContentLoaded', function () {
    // Executa todo o código após o carregamento completo do DOM

    // --- FUNÇÃO AUXILIAR PARA EXIBIR MENSAGENS ---
    function exibirMensagem(texto, tipo = 'danger') {
        // Mostra uma mensagem no div #mensagem com estilo Bootstrap
        const mensagemDiv = document.getElementById('mensagem');
        if (mensagemDiv) {
            mensagemDiv.textContent = texto; // Texto da mensagem
            mensagemDiv.className = `alert alert-${tipo} mx-3`; // Classes do Bootstrap para cor e margens
            mensagemDiv.classList.remove('d-none'); // Exibe o alert

            // Esconde a mensagem automaticamente após 5 segundos
            setTimeout(() => {
                mensagemDiv.classList.add('d-none');
            }, 5000);
        }
    }

    // --- LÓGICA DE BUSCA DE CEP ---
    // Ao sair do campo CEP (evento blur) faz a busca do endereço pela API BrasilAPI
    document.getElementById('inputCEP').addEventListener('blur', async function () {
        const cep = this.value.replace(/\D/g, ''); // Remove caracteres não numéricos

        if (cep.length === 8) { // CEP válido
            try {
                const response = await fetch(`https://brasilapi.com.br/api/cep/v1/${cep}`);
                if (!response.ok) {
                    throw new Error('CEP não encontrado ou inválido.');
                }
                const data = await response.json();

                // Preenche automaticamente os campos Rua, Bairro e Cidade
                document.getElementById('inputRua').value = data.street || '';
                document.getElementById('inputBairro').value = data.neighborhood || '';
                document.getElementById('inputCidade').value = data.city || '';

            } catch (error) {
                // Mostra mensagem de erro e limpa os campos caso a API falhe
                exibirMensagem('Erro ao buscar o CEP: ' + error.message, 'danger');
                document.getElementById('inputRua').value = '';
                document.getElementById('inputBairro').value = '';
                document.getElementById('inputCidade').value = '';
            }
        } else if (this.value.length > 0) {
            // CEP digitado, mas com formato inválido
            exibirMensagem('CEP inválido. Deve conter 8 números.', 'warning');
        }
    });

    // --- LÓGICA DO FORMULÁRIO DE CADASTRO ---
    // Ao enviar o formulário (submit) envia os dados para o backend
    document.getElementById('userForm').addEventListener('submit', async function (event) {
        event.preventDefault(); // Impede o envio padrão do formulário (recarregar página)

        const saveButton = document.getElementById('save_cadastro'); // Botão salvar
        const loadingSpinner = document.getElementById('loadingSpinner'); // Spinner de loading

        // --- INÍCIO DA LÓGICA DE LOADING ---
        saveButton.disabled = true; // Desabilita o botão para evitar múltiplos cliques
        loadingSpinner.classList.remove('d-none'); // Mostra o spinner
        saveButton.innerHTML = 'Salvando...'; // Muda o texto do botão (opcional)

        // Cria um objeto FormData com todos os dados do formulário
        const formData = new FormData(this);

        // Verifica se há campos obrigatórios vazios (exceto Complemento e Foto_Usuario)
        let campoFaltando = false;
        for (const [key, value] of formData.entries()) {
            if (key !== 'Complemento' && key !== 'Foto_Usuario' && !value) {
                campoFaltando = true;
                break;
            }
        }

        if (campoFaltando) {
            exibirMensagem('Por favor, preencha todos os campos obrigatórios.', 'warning');
            // Reativa o botão e esconde o spinner em caso de erro de validação
            saveButton.disabled = false;
            loadingSpinner.classList.add('d-none');
            saveButton.innerHTML = 'Salvar';
            return; // Interrompe o envio
        }

        // Adiciona dados extras necessários para o backend
        formData.append("table", "cadastro_funcionario");
        formData.append("database", "sgmi");

        // Se não houver arquivo de foto selecionado, remove do FormData
        if (formData.get('Foto_Usuario') && formData.get('Foto_Usuario').size === 0) {
            formData.delete('Foto_Usuario');
        }

        try {
            // Faz a requisição POST para o backend Flask
            const response = await fetch('http://localhost:5000/insert', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (!response.ok) {
                // Caso o backend retorne erro
                const erroMsg = Array.isArray(data.mensagem) ? data.mensagem.join('<br>') : (data.mensagem || 'Erro desconhecido.');
                throw new Error(erroMsg);
            }

            // Se deu certo, mostra mensagem de sucesso e reseta o formulário
            exibirMensagem('Funcionário cadastrado com sucesso!', 'success');
            this.reset();

            // Esconde a prévia da imagem depois do reset
            const preview = document.getElementById('foto_preview');
            if (preview) preview.style.display = 'none';

        } catch (error) {
            // Mostra mensagem de erro (usa innerHTML no exibirMensagem para suportar <br>)
            exibirMensagem('Erro:' + error.message, 'danger');
        } finally {
            // --- FIM DA LÓGICA DE LOADING ---
            // Executa SEMPRE, seja sucesso ou erro
            saveButton.disabled = false; // Reabilita o botão
            loadingSpinner.classList.add('d-none'); // Esconde o spinner
            saveButton.innerHTML = 'Salvar'; // Restaura o texto original do botão
        }
    });

    // --- LÓGICA DO PREVIEW DA IMAGEM ---
    const fotoInput = document.getElementById('foto_usuario'); // Input de upload
    const fotoPreview = document.getElementById('foto_preview'); // Imagem de preview

    if (fotoInput && fotoPreview) {
        fotoInput.addEventListener('change', function () {
            const file = this.files[0]; // Pega o primeiro arquivo selecionado
            if (file) {
                const reader = new FileReader();
                reader.onload = function (e) {
                    // Define a imagem carregada no preview e exibe
                    fotoPreview.src = e.target.result;
                    fotoPreview.style.display = 'block';
                }
                reader.readAsDataURL(file); // Lê o arquivo como URL base64
            }
        });
    }
});

// --- LÓGICA DE MOSTRAR SENHA ---
// Função global para alternar o tipo do input senha e o ícone de olho
function mostrarSenha() {
    const inputPass = document.getElementById('inputSenha');
    const btnShowPass = document.getElementById('btn-senha');

    if (inputPass.type === 'password') {
        // Se está oculto, mostra a senha
        inputPass.setAttribute('type', 'text');
        btnShowPass.classList.replace('fa-eye', 'fa-eye-slash'); // Troca ícone para olho cortado
    } else {
        // Se está visível, oculta a senha
        inputPass.setAttribute('type', 'password');
        btnShowPass.classList.replace('fa-eye-slash', 'fa-eye'); // Troca ícone para olho normal
    }
}
