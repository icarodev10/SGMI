// Função para remover aspas no início e fim da string
function removerAspas(valor) {
    return valor ? valor.replace(/^"(.*)"$/, '$1') : '';
}

document.addEventListener("DOMContentLoaded", function () {
    const idUsuario = localStorage.getItem("ID"); // pega o ID armazenado no localStorage
    if (!idUsuario) {
        console.error("ID do usuário não encontrado no localStorage.");
        return;
    }

    // Requisição para o endpoint
    fetch(`http://localhost:5000/usuario/${idUsuario}`)
        .then(response => {
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return response.json();
        })
        .then(usuario => {
            console.log("Dados recebidos do backend:", usuario);

            if (usuario.error) {
                console.error(usuario.error);
                return;
            }

            // Atualizar campos
            document.getElementById("nome").textContent = usuario.Nome || '';
            document.getElementById("cargo").textContent = usuario.Cargo || '';
            document.getElementById("id_cadastro").value = usuario.id_Cadastro || '';
            document.getElementById("login").value = usuario.Login || '';
            document.getElementById("senha").value = "********";
            document.getElementById("email").value = usuario.Email || '';
            document.getElementById("cpf").value = usuario.CPF || '';
            document.getElementById("cep").value = usuario.CEP || '';
            document.getElementById("complemento").value = usuario.Complemento || '';
            document.getElementById("telefone").value = usuario.Telefone || '';
            document.getElementById("sexo").value = usuario.Sexo || '';
            document.getElementById("cargo").value = usuario.Cargo || '';


            if (usuario.Data_Nascimento) {
                const dataFormatada = new Date(usuario.Data_Nascimento).toISOString().split("T")[0];
                document.getElementById("data_nascimento").value = dataFormatada;
            }

            // Atualizar imagem
            const imgElement = document.getElementById("profile-pic");
            if (usuario.Foto_Usuario_Base64) {
                imgElement.src = `data:image/png;base64,${usuario.Foto_Usuario_Base64}`;
            } else {
                imgElement.src = "../View/img/perfil.jpg";
            }
        })
        .catch(err => console.error("[ERROR] Falha ao carregar dados do usuário:", err));
});
