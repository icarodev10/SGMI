document.addEventListener("DOMContentLoaded", () => {
    const idFuncionario = localStorage.getItem("ID");
    const ordensContainer = document.getElementById("ordensContainer");

    if (!idFuncionario) {
        console.warn("ID do usuário não encontrado no localStorage.");
        ordensContainer.innerHTML = `<p class="alert alert-warning">Nenhum usuário logado. Por favor, faça o login para ver suas ordens.</p>`;
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

            ordensContainer.innerHTML = '';

            if (ordensFiltradas.length === 0) {
                ordensContainer.innerHTML = `<p class="alert alert-info">Nenhuma ordem de serviço pendente encontrada.</p>`;
                return;
            }

            ordensFiltradas.forEach(ordem => {
                const dataAbertura = new Date(ordem.Data_Abertura).toLocaleDateString('pt-BR');

                // Cria uma tabela para cada ordem com as cores personalizadas
                const tabelaHTML = `
                    <div class="card mb-4 shadow-sm">
                        <div class="card-header text-white" style="background-color: #2C3E50;">
                            <h5 class="mb-0">Ordem ${ordem.id_Ordem} - ${ordem.Descricao_Problema}</h5>
                        </div>
                        <div class="card-body">
                            <table class="table table-sm table-bordered mb-0">
                                <thead class="text-white" style="background-color: #2C3E50;">
                                    <tr>
                                        <th>ID do Ativo</th>
                                        <th>Descrição do Problema</th>
                                        <th>Status</th>
                                        <th>Prioridade</th>
                                        <th>ID da Solicitação</th>
                                        <th>Data de Abertura</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td>${ordem.id_Ativo}</td>
                                        <td>${ordem.Descricao_Problema}</td>
                                        <td>${ordem.Status}</td>
                                        <td>${ordem.Prioridade}</td>
                                        <td>${ordem.id_Solicitacao}</td>
                                        <td>${dataAbertura}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                `;

                ordensContainer.innerHTML += tabelaHTML;
            });
        } catch (err) {
            console.error("Erro ao buscar ordens:", err);
            ordensContainer.innerHTML = `<p class="alert alert-danger">Erro ao carregar as ordens de serviço. Tente novamente mais tarde.</p>`;
        }
    };

    buscarOrdens();
});