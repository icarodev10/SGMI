-- ==========================================
-- SCRIPT DE POVOAMENTO - SGMI
-- ==========================================
-- Insere dados iniciais consistentes para demonstração do sistema.
-- Senha padrão para todos os usuários: 1234
-- (Hash: scrypt:32768:8:1$tU5HPx...)

USE `sgmi`;

-- 1. FUNCIONÁRIOS (Criando diferentes perfis)
INSERT INTO `cadastro_funcionario` (`Nome`, `Email`, `Senha`, `Login`, `Telefone`, `CEP`, `Cidade`, `Bairro`, `Rua`, `Numero`, `Sexo`, `CPF`, `Data_Nascimento`, `Tipo_Usuario`, `Cargo`, `Departamento`, `Data_Admissao`, `Valor_Hora`) VALUES
('Carlos Administrador', 'admin@sgmi.com', 'scrypt:32768:8:1$tU5HPx46aNRavn0c$50bb9bbb4f02474c71a560cc440534ae83b1794099383cede8aaee92c8910e44a8262fbaa8494fe57b1fac1106fd4a2c233ef9f7ddf42ea66e4d1edfa9f7b667', 'admin1', '19999999999', '13970000', 'Itapira', 'Centro', 'Rua A', '100', 'M', '11111111111', '1985-05-20', 'Administrador', 'Gerente de Manutenção', 'Gestão', '2020-01-15', 150.00),
('Ana Técnica', 'ana@sgmi.com', 'scrypt:32768:8:1$tU5HPx46aNRavn0c$50bb9bbb4f02474c71a560cc440534ae83b1794099383cede8aaee92c8910e44a8262fbaa8494fe57b1fac1106fd4a2c233ef9f7ddf42ea66e4d1edfa9f7b667', 'ana_tec', '19988888888', '13970000', 'Itapira', 'Prados', 'Rua B', '200', 'F', '22222222222', '1992-08-10', 'Gestor', 'Técnica Mecânica', 'Manutenção', '2022-03-01', 80.00),
('Roberto Operador', 'roberto@sgmi.com', 'scrypt:32768:8:1$tU5HPx46aNRavn0c$50bb9bbb4f02474c71a560cc440534ae83b1794099383cede8aaee92c8910e44a8262fbaa8494fe57b1fac1106fd4a2c233ef9f7ddf42ea66e4d1edfa9f7b667', 'beto_op', '19977777777', '13970000', 'Itapira', 'Penha', 'Rua C', '300', 'M', '33333333333', '1995-12-05', 'Usuario', 'Operador de Máquina', 'Produção', '2023-06-15', 45.00);

-- 2. ATIVOS (Um ativo bom e um quebrado para o Dashboard)
INSERT INTO `ativos` (`Nome_Ativo`, `Descricao`, `Fabricante`, `Modelo`, `Numero_Serie`, `Data_Aquisicao`, `Localizacao`, `Status`, `Imagem`) VALUES
('Prensa Hidráulica 500T', 'Prensa principal da linha de montagem A.', 'Weg', 'PH-500', 'SN-987654', '2019-10-12', 'Galpão 1', 'ativo', NULL),
('Torno CNC Romi', 'Torno de precisão para usinagem de eixos.', 'Romi', 'T-CNC-2000', 'SN-123456', '2021-02-28', 'Galpão 2', 'em manutenção', NULL);

-- 3. PEÇAS 
INSERT INTO `pecas` (`Nome_Peca`, `Descricao`, `Fabricante`, `Fornecedor`, `Estoque`, `Valor_Unitario`, `Numero_Serie`) VALUES
('Rolamento SKF 6205', 'Rolamento de alta rotação.', 'SKF', 'Rolamentos Itapira', 50, 120.50, 'SKF-6205-A'),
('Válvula Solenoide 24V', 'Válvula pneumática direcional.', 'Festo', 'Pneumática BR', 2, 350.00, 'FES-24V-X');

-- 4. SOLICITAÇÕES (Mostrando a lógica certa)
INSERT INTO `solicitacoes` (`Titulo`, `Solicitante`, `Problema`, `Prioridade`, `Status`, `id_Ativo`) VALUES
('Barulho estranho no Torno', 3, 'Operador relatou ruído metálico ao aumentar a rotação.', 'Alta', 'Aceita', 2), -- Solicitante 3 (Roberto), Ativo 2 (Torno)
('Troca de óleo preventiva', 1, 'Agendar troca de óleo da prensa para o próximo mês.', 'Baixa', 'Em Analise', 1), -- Solicitante 1 (Carlos), Ativo 1 (Prensa)
('Pintura descascando', 3, 'A pintura da porta lateral está caindo.', 'Baixa', 'Recusada', 2); -- Solicitante 3 (Roberto), Ativo 2 (Torno) - Essa NÃO vai virar ordem!

-- 5. ORDENS DE SERVIÇO (Apenas para solicitações aceitas)
INSERT INTO `ordens_servico` (`id_Ativo`, `Descricao_Problema`, `Data_Abertura`, `Status`, `Prioridade`, `id_Solicitacao`, `Tipo_Manutencao`) VALUES
(2, 'Substituição de rolamento e análise de vibração no eixo principal.', NOW(), 'Em Andamento', 'Alta', 1, 'Corretiva'); -- Ativo 2, Solicitação 1

-- 6. VÍNCULOS (Quem está trabalhando na ordem e peças usadas)
-- Ana (id 2) está trabalhando na Ordem 1
INSERT INTO `funcionarios_ordens` (`Cadastro_Funcionario_id_Cadastro`, `Ordens_Servico_id_Ordem`) VALUES (2, 1);
-- 2 Rolamentos (id 1) foram separados para a Ordem 1
INSERT INTO `ordens_pecas` (`Quantidade`, `id_Ordem`, `id_Peca`) VALUES (2, 1, 1);

-- 7. SENSORES E DADOS 
INSERT INTO `sensores` (`Nome_Sensor`, `Tipo`, `Unidade_Medida`, `Status`, `Modelo`, `Numero_Serie`, `id_Ativo`) VALUES
('Sensor de Temperatura Prensa', 'Temperatura', '°C', 'Ativo', 'TMP-100', 'TMP-001', 1);

INSERT INTO `dados_sensores` (`Topico`, `Valor`, `Data_Hora`) VALUES
('Cypher/Temperatura', '65.5', DATE_SUB(NOW(), INTERVAL 30 MINUTE)),
('Cypher/Temperatura', '68.2', DATE_SUB(NOW(), INTERVAL 15 MINUTE)),
('Cypher/Temperatura', '72.0', NOW());