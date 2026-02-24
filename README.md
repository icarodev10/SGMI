# 🏭 SGMI - Sistema de Gerenciamento de Manutenção Industrial

> Um sistema completo e modular para digitalização, controle e automação do fluxo de manutenção de maquinários industriais. Desenvolvido como projeto de conclusão para o SENAI e refatorado para uma arquitetura modular escalável.

![Screenshot do Dashboard do SGMI](link-para-sua-imagem-aqui.png)

## 🚀 Sobre o Projeto
O SGMI foi projetado para resolver o caos da manutenção industrial, conectando o chão de fábrica à gestão. O sistema engloba desde a leitura de sensores em tempo real até o controle rigoroso de estoque de peças e ordens de serviço. 

Após a entrega inicial, o backend do projeto passou por uma **refatoração completa, migrando de um modelo monolítico para uma arquitetura modularizada**, garantindo maior escalabilidade e facilidade de manutenção no código.

## 🌟 Principais Funcionalidades
* 🤖 **AURA (Super Filtro com IA):** Integração com a API do Google Gemini. Não é apenas um chatbot, mas um assistente avançado para filtrar e analisar dados complexos do sistema.
* 🧊 **Visualização 3D:** Modelos 3D interativos vinculados diretamente aos ativos, facilitando a identificação de componentes pela equipe de manutenção.
* 📜 **Auditoria e Histórico:** Rastreabilidade total. O sistema mantém um histórico completo de alterações em Ordens de Serviço, dados de Sensores e status das Máquinas.
* 📧 **Notificações Automatizadas:** Envio de e-mails dinâmicos para alertar usuários sobre novas ordens de serviço, status de solicitações e envio de credenciais.

## 💼 Regras de Negócio e Permissões
O sistema foi construído seguindo lógicas reais da indústria:
* **Controle de Acesso (RBAC):** Existem 3 níveis de hierarquia: `Administrador`, `Gestor` e `Usuário` (Técnicos/Operadores), cada um com permissões e visões restritas no sistema.
* **Fluxo de Solicitação:** Uma Ordem de Serviço (OS) **não** pode ser criada do zero sem aprovação. Ela só nasce a partir de uma *Solicitação* que foi previamente **Aceita** por um gestor.
* **Ciclo de Vida do Ativo:** Totalmente automatizado. Se uma máquina quebra e uma OS entra "Em Andamento", o status do ativo muda no sistema. Quando a OS é "Concluída", o ativo retorna automaticamente para o status "Ativo".

---

## 🛠️ Tecnologias Utilizadas
* **Backend:** Python (Flask modularizado)
* **Frontend:** HTML, CSS, JavaScript (Node.js)
* **Banco de Dados:** MySQL
* **IA:** Google Gemini API 

---

## ⚙️ Como executar o projeto localmente (How to Run)

### 1. Banco de Dados
1. Crie um banco de dados MySQL local chamado `sgmi`.
2. Execute o arquivo de dump SQL (disponível na pasta do banco) para criar as tabelas e rodar o *seeder* com os dados iniciais.

### 2. Backend (API Modular)
1. Abra o terminal e navegue até a pasta da API: 

   cd sgmicoreapi

Crie e ative um ambiente virtual:

Windows: python -m venv venv e depois venv\Scripts\activate

Linux/Mac: python3 -m venv venv e depois source venv/bin/activate

Instale as dependências:


pip install -r requirements.txt
⚠️ Configuração de Ambiente: Renomeie o arquivo .env.example para .env e preencha suas chaves.

Aviso: Os recursos de envio de E-mail e a IA (AURA) só funcionarão se as credenciais correspondentes estiverem configuradas corretamente no .env.

Inicie o servidor Flask:


python run.py
3. Frontend
Abra um novo terminal e navegue até a pasta do Frontend:

cd FrontEnd
Instale as dependências do Node:


npm install
Inicie a aplicação:

node server.js
O sistema estará disponível no seu navegador em http://localhost:3000 (ou na porta configurada).