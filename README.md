# 🏭 SGMI - Sistema de Gerenciamento de Manutenção Industrial

> Um sistema completo e modular para digitalização, controle e automação do fluxo de manutenção de maquinários industriais. Desenvolvido como projeto de conclusão para o SENAI e refatorado para uma arquitetura modular escalável.

<img width="1895" height="846" alt="image" src="https://github.com/user-attachments/assets/ef2d1ad8-1a49-4698-86bf-8fb5eb5a02b0" />


## 🚀 Sobre o Projeto
O SGMI foi projetado para resolver o caos da manutenção industrial, conectando o chão de fábrica à gestão. O sistema engloba desde o cadastro de maquinário até o controle rigoroso de estoque de peças e ordens de serviço. 

Após a entrega inicial, o backend do projeto passou por uma **refatoração completa, migrando de um modelo monolítico para uma arquitetura modularizada**, garantindo maior escalabilidade e facilidade de manutenção no código.

<img width="444" height="184" alt="image" src="https://github.com/user-attachments/assets/12f6f6b9-9595-4801-962a-20cfe19a19c9" />


## 🌟 Principais Funcionalidades
* 🤖 **AURA (Super Filtro):** Não é apenas um chatbot, mas um filtro avançado para analisar dados complexos do sistema.

<img width="1919" height="862" alt="image" src="https://github.com/user-attachments/assets/b8c58eaa-5de1-448d-828d-225926163019" />



* 🔎 **Assitente IA:** Integrado com API Gemini, faz consultas nos últimos problemas do maquinário e devolve as possíveis causas e soluções.

  
  
* 🧊 **Visualização 3D:** Modelos 3D interativos vinculados diretamente aos ativos, facilitando a identificação de componentes pela equipe de manutenção.

<img width="1919" height="864" alt="image" src="https://github.com/user-attachments/assets/f1050bb7-a351-4262-a07d-a038a7330a04" />


  
  
* 📜 **Auditoria e Histórico:** Rastreabilidade total. O sistema mantém um histórico completo de alterações em Ordens de Serviço, dados de Sensores e status das Máquinas.


  
* 📧 **Notificações Automatizadas:** Envio de e-mails dinâmicos para alertar usuários sobre novas ordens de serviço, status de solicitações e envio de credenciais.



## 🎥 Demo



https://github.com/user-attachments/assets/9b0b292f-fb39-442f-826c-7b6859572cbb





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

## Repositório:

1. Execute o comando:
```bash
git clone https://github.com/icarodev10/SGMI.git
```
2. Execute o comando:
```bash
cd SGMI
```

### 1. Banco de Dados
1. Crie um banco de dados MySQL local chamado `sgmi` com o arquivo SQL disponível
em SGMI/sgmi_core_api/data/codigo_cypher_banco.sql.
2. Execute o arquivo popular_banco.sql (disponível na mesma pasta) para criar os dados iniciais.

### 2. Backend (API Modular)
1. Abra o terminal e navegue até a pasta da API: 

   cd sgmi_core_api

Crie e ative um ambiente virtual:

Windows: python -m venv venv e depois venv\Scripts\activate

Linux/Mac: python3 -m venv venv e depois source venv/bin/activate

Instale as dependências:


pip install -r requirements.txt


⚠️ Configuração de Ambiente: Renomeie o arquivo .env.example para .env e preencha suas chaves.

Aviso: Os recursos de envio de E-mail e a IA  só funcionarão se as credenciais correspondentes estiverem configuradas corretamente no .env.

Inicie o servidor Flask:

python run.py

### 3. Frontend

Abra um novo terminal e navegue até a pasta do Frontend:

cd FrontEnd
Instale as dependências do Node:

npm install

Inicie a aplicação:

node server.js

O sistema estará disponível no seu navegador em http://localhost:3000 (ou na porta configurada).

login admin padrao:
email: admin@sgmi.com
senha: 1234

---

## 👥 Equipe de Desenvolvimento

Desenvolvido no SENAI por:

* **Icaro de Souza de Lima** - [GitHub](https://github.com/icarodev10)
* **Luís Miguel da Costa** - [GitHub](https://github.com/LuisCosta321)
* **Marcos Vinícius Cavalaro** - [GitHub](https://github.com/MarcosCavalaro)
* **Kaique Borlenghi da Silva** - [GitHub](https://github.com/KaiqueBorlenghi)
* **Nicolas Eduardo de Godoy** - [GitHub](https://github.com/NicolasEGodoy)

---
