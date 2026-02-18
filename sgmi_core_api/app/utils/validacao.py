# validacao.py
"""
Módulo agregador de validações.

Este arquivo centraliza as chamadas para as funções de validação de dados
antes de qualquer operação de escrita na base de dados.

Cada função `dados_valida_*` aqui presente atua como um ponto de entrada
para a validação de uma tabela específica. Ela orquestra a chamada de
funções mais especializadas (importadas de outros arquivos `validar_*`)
e compila uma lista de todos os erros encontrados.
"""

# --- Importação dos Módulos de Validação Especializados ---
# OBS: Todos estes arquivos (validar_cadastro.py, validar_ativo.py, etc.)
# DEVEM estar dentro da pasta app/utils/

from app.utils.validar_cadastro import validar_cpf, validar_email, validar_senha, validar_cadastro_geral, validar_cep
from app.utils.validar_ativo import validar_ativo
from app.utils.validar_func_ordens import validar__func_ordens
from app.utils.validar_historico import validar_historico
from app.utils.validar_pecas_ordens import validar_pecas_ordens
from app.utils.validar_ordem_servico import validar_ordem_servico
from app.utils.validar_peca import validar_peca
from app.utils.validar_sensor import validar_sensor
from app.utils.validar_solicitacao import validar_solicitacao
from app.utils.validar_empresa import validar_empresa
from app.utils.validar_solicitar_peca import validar_solicitar_peca

# Conexão com o banco (esse já estava certo, mas mantive pra garantir)
from app.database.conectar import connect_db

def dados_valida_cadastro(dados, acao):
    """
    Orquestra a validação completa para o cadastro ou atualização de um funcionário.
    Recebe a 'acao' ('POST' ou 'PUT') para diferenciar as lógicas necessárias.
    """
    print(f"[Checkpoint] Iniciando validação de cadastro para a ação: {acao}")
    erros = []
    
    # NOTA: O ideal é carregar este token de um arquivo de configuração ou variável de ambiente.
    token = "18020|7WIXRgVBypbFckRMRCBXPKW5gNavFeI4"
    
    conexao = None
    cursor = None
    
    # O bloco try...finally garante que a conexão com o banco seja sempre fechada,
    # mesmo que ocorra um erro durante a validação.
    try:
        conexao = connect_db()
        if conexao is None:
            # Retorna um erro genérico se não for possível conectar ao banco.
            return ["Erro crítico: Não foi possível conectar ao banco de dados para validação."]

        # O cursor é passado para as funções que precisam fazer consultas.
        cursor = conexao.cursor(buffered=True, dictionary=True)

        # --- Validação 1: CPF (Formato via API e Unicidade no DB) ---
        resultado_cpf = validar_cpf(dados, token, cursor)
        if not resultado_cpf or not resultado_cpf.get("valid"):
            erros.append(resultado_cpf.get("message", "Erro na validação do CPF."))

        # --- Validação 2: Email (Formato via API e Unicidade no DB) ---
        resultado_email = validar_email(dados, token, cursor)
        if not resultado_email or not resultado_email.get("valid"):
            erros.append(resultado_email.get("message", "Erro na validação do E-mail."))

        # --- Validação 3: Senha (Obrigatória apenas no cadastro 'POST') ---
        # Usamos a 'acao' para essa lógica. Em 'PUT' (atualização), a senha não é obrigatória.
        if acao == 'POST' and not dados.get("data", {}).get("Senha"):
            erros.append('Senha é obrigatória para novos cadastros.')

        # --- Validação 4: CEP (Formato via API) ---
        resultado_cep = validar_cep(dados)
        # A função validar_cep retorna um dicionário vazio em caso de erro.
        if not resultado_cep:
            erros.append('CEP inválido ou não encontrado.')
            
        # --- Validação 5: Campos Gerais (Formato e Unicidade do Login) ---
        # Esta função retorna uma lista de erros, então usamos 'extend'.
        resultado_geral = validar_cadastro_geral(dados, cursor)
        if resultado_geral:
            erros.extend(resultado_geral)

    except Exception as e:
        # Captura qualquer erro inesperado durante o processo.
        print(f"ERRO INESPERADO EM dados_valida_cadastro: {e}")
        erros.append("Ocorreu um erro interno no servidor durante a validação.")

    finally:
        # Este bloco é executado sempre, garantindo o fechamento dos recursos.
        if cursor: 
            cursor.close()
        if conexao and conexao.is_connected(): 
            conexao.close()

    return erros

def dados_valida_ativo(dados):
    """Agrega as validações para a tabela 'ativos'."""
    print("[Checkpoint] Iniciando validação de ativo")
    erros = []
    resultado_geral = validar_ativo(dados)
    if resultado_geral:
        erros.extend(resultado_geral)
    return erros

def dados_valida_empresa(dados):
    """Agrega as validações para a tabela 'empresa'."""
    print("[Checkpoint] Iniciando validação da empresa")
    erros = []
    resultado_geral = validar_empresa(dados)
    print(resultado_geral, "Teste")
    if resultado_geral:
        erros.extend(resultado_geral)
    return erros

def dados_valida_func_ordem(dados):
    """Agrega as validações para a tabela 'funcionarios_ordens'."""
    print("[Checkpoint] Iniciando validação de funcionário na ordem")
    erros = []
    resultado_geral = validar__func_ordens(dados)
    if resultado_geral:
        erros.extend(resultado_geral)
    return erros


def dados_valida_historico(dados):
    """Agrega as validações para a tabela 'historico'."""
    print("[Checkpoint] Iniciando validação de histórico")
    erros = []
    resultado_geral = validar_historico(dados)
    if resultado_geral:
        erros.extend(resultado_geral)
    return erros


def dados_valida_ordem_servico(dados):
    """Agrega as validações para a tabela 'ordens_servico'."""
    print("[Checkpoint] Iniciando validação de ordem de serviço")
    erros = []
    resultado_geral = validar_ordem_servico(dados)
    if resultado_geral:
        erros.extend(resultado_geral)
    return erros


def dados_valida_peca(dados):
    """Agrega as validações para a tabela 'pecas'."""
    print("[Checkpoint] Iniciando validação de peça")
    erros = []
    resultado_geral = validar_peca(dados)
    if resultado_geral:
        erros.extend(resultado_geral)
    return erros


def dados_valida_pecas_ordens(dados):
    """
    Agrega as validações para a tabela 'ordens_pecas'.
    Esta validação precisa de acesso à base de dados para verificar o estoque.
    """
    print("[Checkpoint] Iniciando validação de peças na ordem")
    erros = []
    
    conexao = connect_db()
    if conexao is None:
        return ["Erro ao conectar ao banco de dados."]
    
    cursor = conexao.cursor(dictionary=True)
    
    try:
        resultado_geral = validar_pecas_ordens(dados, cursor)
        if resultado_geral:
            erros.extend(resultado_geral)
    finally:
        if cursor: cursor.close()
        if conexao and conexao.is_connected(): conexao.close()

    return erros


def dados_valida_sensor(dados):
    """Agrega as validações para a tabela 'sensores'."""
    print("[Checkpoint] Iniciando validação de sensor")
    erros = []
    resultado_geral = validar_sensor(dados)
    if resultado_geral:
        erros.extend(resultado_geral)
    return erros


def dados_valida_solicitacao(dados):
    """Agrega as validações para a tabela 'solicitacoes'."""
    print("[Checkpoint] Iniciando validação de solicitação")
    erros = []
    resultado_geral = validar_solicitacao(dados)
    if resultado_geral:
        erros.extend(resultado_geral)
    return erros

def dados_valida_solicitar_peca(dados):
    """Agrega as validações para a tabela 'solicitacoes pecas'."""
    print("[Checkpoint] Iniciando validação de solicitação")
    erros = []
    resultado_geral = validar_solicitar_peca(dados)
    if resultado_geral:
        erros.extend(resultado_geral)
    return erros