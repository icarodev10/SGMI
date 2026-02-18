// routes.js

/**
 * Mapa de rotas do front-end.
 *
 * Este objeto mapeia as URLs da aplicação para os arquivos HTML correspondentes
 * na pasta /View. O server.js usa este mapa para servir a página correta
 * para cada rota.
 *
 * Chave: A URL que o usuário acessa no navegador (ex: /home).
 * Valor: O nome do arquivo HTML a ser enviado.
 */
const routes = {
  // --- Rotas Existentes ---
  "/": "index.html", // Página de login
  "/Gerenciamento_maquinas": "Gerenciamento_maquinas.html",
  "/Gerenciamento_pecas": "Gerenciamento_pecas.html",
  "/Cadastro_usuario": "Cadastro_usuario.html",
  "/Gerenciamento_Sensores": "Gerenciamento_Sensores.html",
  "/Gerenciamento_ordens_manutencao": "Gerenciamento_ordens_manutencao.html",
  "/Historico_Ordens": "Historico.html",
  "/Historico_Ativos": "HistoricoAtivo.html",
  "/Historico_Sensores": "HistoricoSensor.html",
  "/Perfil": "Perfil.html",
  "/Dashboards": "Dashboards.html",
  "/Solicitacao_de_manutencao": "Solicitacao_de_manutencao.html",
  "/home": "home.html",
  "/Gerenciamento_Solicitacao": "Gerenciamento_Solicitacao.html",
  "/Notificacao": "Notificacao.html",
  "/Usuario": "Usuario.html",
};

// Exporta o objeto para que possa ser importado pelo server.js.
export default routes;
