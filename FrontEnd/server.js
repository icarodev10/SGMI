// server.js

// --- Importações ---
// Importa o framework Express para criar o servidor.
import express from "express";
// Importa o módulo 'path' do Node.js para lidar com caminhos de arquivos de forma segura.
import path from "path";
// Ferramentas necessárias para obter o caminho do diretório em projetos com "type": "module".
import { fileURLToPath } from "url";
// Importa o "mapa" de rotas do arquivo routes.js.
import routes from "./routes.js";

// --- Configuração de Caminhos ---
// Em projetos com "type": "module", __dirname não existe por padrão.
// Estas duas linhas recriam essa variável essencial.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Inicialização do Servidor ---
const app = express();
const PORT = 3000; // Define a porta em que o servidor do front-end irá rodar.

// Define a pasta raiz de onde os arquivos estáticos (CSS, JS, imagens) serão servidos.
const staticRoot = __dirname;
// Define a pasta onde os arquivos HTML (as "Views") estão localizados.
const viewRoot = path.join(__dirname, "View");

// --- Middlewares e Rotas ---

// 1. Servidor de Arquivos Estáticos
// Esta linha diz ao Express: "Sirva todos os arquivos da pasta 'staticRoot' diretamente".
// É por isso que os seus CSS e JS carregam corretamente.
app.use(express.static(staticRoot));

// 2. Roteamento Dinâmico
// Este loop lê o objeto 'routes' importado de routes.js e cria uma rota GET para cada entrada.
// Ex: Se routes.js tiver {'/home': 'home.html'}, ele cria a rota app.get('/home', ...).
console.log("--- Registrando rotas dinâmicas ---");
for (const [route, file] of Object.entries(routes)) {
  console.log(`Registrando rota: GET ${route} -> ${file}`);
  app.get(route, (req, res) => {
    // Quando a rota é acessada, envia o arquivo HTML correspondente da pasta 'View'.
    res.sendFile(path.join(viewRoot, file));
  });
}
console.log("------------------------------------");

// 3. Rota de Fallback (Pega-Tudo)
// Esta rota é acionada se nenhuma das rotas acima corresponder ao pedido.
// É útil para lidar com erros 404 de forma amigável.
app.use((req, res) => {
  console.warn(`[Fallback] Rota não encontrada: ${req.url}. Redirecionando para a página inicial.`);
  //  Redireciona para index.html, que é o ponto de entrada da sua aplicação.
  res.sendFile(path.join(viewRoot, 'index.html'));
});

// --- Inicialização ---
app.listen(PORT, () =>
  console.log(`🚀 Servidor do front-end rodando em http://localhost:${PORT}`)
);

