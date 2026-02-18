import mysql.connector
from faker import Faker
import random
from datetime import datetime, timedelta

# --- CONFIGURAÇÕES ---
import os
from dotenv import load_dotenv
load_dotenv() # Isso lê o arquivo .env 

DB_CONFIG = {
    'host': os.getenv('MYSQL_HOST'),
    'user': os.getenv('MYSQL_USER'),
    'password': os.getenv('MYSQL_PASSWORD'),
    'database': os.getenv('MYSQL_DB')
}

fake = Faker('pt_BR')
SENHA_PADRAO_HASH = "scrypt:32768:8:1$tU5HPx46aNRavn0c$50bb9bbb4f02474c71a560cc440534ae83b1794099383cede8aaee92c8910e44a8262fbaa8494fe57b1fac1106fd4a2c233ef9f7ddf42ea66e4d1edfa9f7b667"

# --- BANCO DE DADOS TÉCNICO ---
EQUIPAMENTOS = [
    ('Prensa Hidráulica 500T', 'Prensa de alta capacidade para moldagem de chapas.'),
    ('Torno CNC Romi', 'Torno de precisão para usinagem de eixos e flanges.'),
    ('Compressor de Ar Parafuso', 'Fornecimento de ar comprimido para a linha pneumática.'),
    ('Robô de Solda Fanuc', 'Célula automatizada para soldagem por arco.'),
    ('Caldeira Industrial', 'Geração de vapor para processos de aquecimento.'),
    ('Esteira Transportadora T-08', 'Sistema de transporte de materiais pesados.'),
    ('Bomba de Recalque KSB', 'Bomba centrífuga para sistema de arrefecimento.'),
    ('Painel Elétrico Central', 'Distribuição de energia e proteção de motores.'),
    ('Ponte Rolante 10T', 'Equipamento de movimentação de carga no galpão.'),
    ('Injetora de Plástico', 'Máquina para produção de componentes termoplásticos.')
]

PECAS_NOMES = [
    'Rolamento SKF 6205', 'Correia em V A-32', 'Válvula Solenoide 24V', 
    'Contator Weg 32A', 'Filtro de Ar de Sucção', 'Sensor de Proximidade M18', 
    'Retentor de Óleo 45mm', 'Fusível NH 100A', 'Graxa de Lítio (Balde 18kg)', 'Cabo de Aço 3/8'
]

TITULOS_PROBLEMAS = [
    'Vazamento de óleo', 'Ruído excessivo no motor', 'Erro de comunicação CLP', 
    'Superaquecimento', 'Falta de pressão pneumática', 'Vibração anormal', 
    'Travamento mecânico', 'Falha na partida', 'Componente quebrado', 'Curto-circuito'
]

DESC_PROBLEMAS = [
    'O operador relatou que o equipamento está expelindo fluido pela vedação principal.',
    'Identificado barulho metálico durante a rotação máxima do eixo.',
    'O painel apresenta erro de rede e não inicia o ciclo automático.',
    'A temperatura de operação atingiu 95°C, acima do limite de segurança.',
    'Identificada queda súbita na pressão de saída durante o regime de carga.',
    'Vibração detectada no mancal B, possivelmente folga excessiva.'
]

def get_connection():
    return mysql.connector.connect(**DB_CONFIG)

def popular():
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    
    print("🧹 Limpando dados...")
    cursor.execute("SET FOREIGN_KEY_CHECKS = 0;")
    tabelas = [
        'historico_sensores', 'historico_ativos', 'historico', 'dados_sensores',
        'funcionarios_ordens', 'ordens_pecas', 'ordens_servico', 'solicitacoes', 
        'sensores', 'modelos_3d', 'pecas', 'ativos', 'cadastro_funcionario'
    ]
    for t in tabelas: cursor.execute(f"TRUNCATE TABLE {t}")
    cursor.execute("SET FOREIGN_KEY_CHECKS = 1;")

    # 1. FUNCIONÁRIOS
    print("👤 Povoando Funcionários...")
    ids_funcionarios = []
    for _ in range(20):
        nome = fake.name()
        sql = """INSERT INTO cadastro_funcionario (Nome, Email, Senha, Login, Telefone, CEP, Cidade, Bairro, Rua, Numero, Sexo, CPF, Data_Nascimento, Tipo_Usuario, Cargo, Departamento, Data_Admissao, Valor_Hora) 
                 VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)"""
        val = (nome, fake.email(), SENHA_PADRAO_HASH, nome.split()[0].lower() + str(random.randint(10,99)),
               fake.cellphone_number(), fake.postcode(), fake.city(), fake.bairro(), fake.street_name(), fake.building_number(),
               random.choice(['M', 'F']), fake.cpf(), fake.date_of_birth(minimum_age=20, maximum_age=60),
               random.choice(['Administrador', 'Usuario', 'Gestor']), 
               random.choice(['Técnico Mecânico', 'Eletricista', 'Engenheiro', 'Mecânico de Manutenção']),
               random.choice(['Manutenção', 'Utilidades', 'Produção']), fake.date_between(start_date='-5y'), random.randint(30, 150))
        cursor.execute(sql, val)
        ids_funcionarios.append(cursor.lastrowid)

    # 2. ATIVOS
    print("🏭 Povoando Ativos...")
    ids_ativos = []
    for nome, desc in EQUIPAMENTOS:
        sql = """INSERT INTO ativos (Nome_Ativo, Descricao, Fabricante, Modelo, Numero_Serie, Data_Aquisicao, Localizacao, Status, Imagem) 
                 VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)"""
        val = (nome, desc, random.choice(['Weg', 'Siemens', 'Schneider', 'Romi', 'Fanuc']), 
               f"X-{random.randint(100, 999)}", fake.ean8(), fake.date_between(start_date='-10y', end_date='-1y'),
               f"Galpão {random.randint(1,5)} - Ala {random.choice(['A','B','C'])}", 
               random.choice(['ativo', 'inativo', 'em manutenção']), b'placeholder')
        cursor.execute(sql, val)
        ids_ativos.append(cursor.lastrowid)

    # 3. PEÇAS
    print("⚙️ Povoando Peças...")
    ids_pecas = []
    for nome_p in PECAS_NOMES:
        sql = """INSERT INTO pecas (Nome_Peca, Descricao, Fabricante, Fornecedor, Estoque, Valor_Unitario, Numero_Serie) 
                 VALUES (%s, %s, %s, %s, %s, %s, %s)"""
        val = (nome_p, f"Peça de reposição industrial de alta durabilidade.", random.choice(['SKF', 'Weg', 'Siemens']),
               fake.company(), random.randint(10, 100), round(random.uniform(50, 1500), 2), fake.ean8())
        cursor.execute(sql, val)
        ids_pecas.append(cursor.lastrowid)

    # 4. SENSORES
    print("📡 Povoando Sensores...")
    for id_a in ids_ativos:
        tipo = random.choice(['Temperatura', 'Vibração', 'Pressão'])
        unid = {'Temperatura': '°C', 'Vibração': 'mm/s²', 'Pressão': 'Bar'}[tipo]
        sql = "INSERT INTO sensores (Nome_Sensor, Tipo, Unidade_Medida, Status, Modelo, Numero_Serie, id_Ativo) VALUES (%s, %s, %s, %s, %s, %s, %s)"
        val = (f"Sensor {tipo} {random.randint(1,100)}", tipo, unid, 'Ativo', 'TX-Smart', fake.ean8(), id_a)
        cursor.execute(sql, val)

    # 5. SOLICITAÇÕES
    print("📋 Povoando Solicitações...")
    ids_solicitacoes = []
    for _ in range(25):
        sql = "INSERT INTO solicitacoes (Titulo, Solicitante, Problema, Prioridade, Status, id_Ativo) VALUES (%s, %s, %s, %s, %s, %s)"
        val = (random.choice(TITULOS_PROBLEMAS), random.choice(ids_funcionarios), random.choice(DESC_PROBLEMAS),
               random.choice(['Alta', 'Media', 'Baixa']), random.choice(['Em Analise', 'Aceita', 'Recusada']), random.choice(ids_ativos))
        cursor.execute(sql, val)
        ids_solicitacoes.append(cursor.lastrowid)

    # 6. ORDENS DE SERVIÇO
    print("🛠️ Povoando Ordens de Serviço...")
    ids_ordens = []
    for id_s in ids_solicitacoes:
        cursor.execute("SELECT id_Ativo FROM solicitacoes WHERE id_Solicitacao = %s", (id_s,))
        solic = cursor.fetchone()
        
        sql = """INSERT INTO ordens_servico (id_Ativo, Descricao_Problema, Status, Prioridade, id_Solicitacao, Custo, Duracao, Tipo_Manutencao) 
                 VALUES (%s, %s, %s, %s, %s, %s, %s, %s)"""
        val = (solic['id_Ativo'], random.choice(DESC_PROBLEMAS), random.choice(['Aberta', 'Em Andamento', 'Concluida']),
               random.choice(['Alta', 'Media', 'Baixa']), id_s, round(random.uniform(200, 5000), 2), 
               round(random.uniform(1, 24), 2), random.choice(['Preditiva', 'Corretiva', 'Preventiva']))
        cursor.execute(sql, val)
        ids_ordens.append(cursor.lastrowid)

    # 7. VÍNCULOS (Peças e Funcionários nas Ordens)
    print("🔗 Vinculando recursos às ordens...")
    for id_o in ids_ordens:
        # Vincula 1 a 2 funcionários por ordem
        for _ in range(random.randint(1, 2)):
            cursor.execute("INSERT INTO funcionarios_ordens (Cadastro_Funcionario_id_Cadastro, Ordens_Servico_id_Ordem) VALUES (%s, %s)", 
                           (random.choice(ids_funcionarios), id_o))
        # Vincula 1 a 3 peças por ordem
        for _ in range(random.randint(1, 3)):
            cursor.execute("INSERT INTO ordens_pecas (Quantidade, id_Ordem, id_Peca) VALUES (%s, %s, %s)", 
                           (random.randint(1, 5), id_o, random.choice(ids_pecas)))

    # 8. DADOS DE SENSORES (Time Series simulado)
    print("📈 Povoando Dados de Sensores (MQTT)...")
    for _ in range(50):
        sql = "INSERT INTO dados_sensores (Topico, Valor, Data_Hora) VALUES (%s, %s, %s)"
        val = (random.choice(['Cypher/Temperatura', 'Cypher/Umidade', 'Cypher/Vibracao']), 
               str(round(random.uniform(20.0, 80.0), 2)), datetime.now() - timedelta(minutes=random.randint(1, 1000)))
        cursor.execute(sql, val)

    conn.commit()
    print("\n✅ BANCO SGMI POPULADO COM SUCESSO! Senha padrão: 1234")
    cursor.close()
    conn.close()

if __name__ == "__main__":
    popular()