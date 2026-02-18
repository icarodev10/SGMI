"""
Módulo responsável por preparar e transformar os dados antes de serem
gravados na base de dados.
"""

from werkzeug.security import generate_password_hash
try:
    from app.utils.validar_cadastro import validar_cep
except ImportError:
    def validar_cep(dados): return {} 

# --- Funções de Preparação (Placeholders) ---

def preparar_dados_para_gravacao_funcionario(acao, dados):
    """Prepara dados para a tabela 'funcionarios_ordens'."""
    return dados # Retorna o dict inteiro (com 'data') para manter padrão

def preparar_dados_para_gravacao_historico_ativos(acao, dados):
    return dados

def preparar_dados_para_gravacao_historico_sensores(acao, dados):
    return dados

def preparar_dados_para_gravacao_ativo(acao, dados):
    return dados

def preparar_dados_para_gravacao_historico(acao, dados):
    return dados

def preparar_dados_para_gravacao_ordens_pecas(acao, dados):
    return dados

def preparar_dados_para_gravacao_ordens_servico(acao, dados):
    return dados

def preparar_dados_para_gravacao_pecas(acao, dados):
    return dados

def preparar_dados_para_gravacao_sensores(acao, dados):
    return dados

def preparar_dados_para_gravacao_solicitacoes(acao, dados):
    return dados

def preparar_dados_para_gravacao_empresa(acao, dados):
    return dados

def preparar_dados_para_gravacao_solicitar_pecas(acao, dados):
    return dados

# --- Função de Preparação Principal (Cadastro Funcionário) ---

def preparar_dados_para_gravacao_cadastro(acao, dados):
    """
    Prepara os dados de um novo funcionário:
    1. Criptografa a senha.
    2. Busca e preenche endereço pelo CEP.
    """
    print(f"[Prep] preparar_dados_para_gravacao_cadastro - Ação: {acao}")
    
    senha = dados.get("data", {}).get("Senha")

    # 1. Criptografia de Senha
    if senha and not senha.startswith('scrypt:'):
        print("[Prep] Criptografando nova senha...")
        dados["data"]["Senha"] = generate_password_hash(senha.strip())
    elif not senha and acao == 'POST':
        # Se for POST (novo) e não tiver senha, é erro. No PUT (edição) pode vir sem senha.
        print("[Erro] Senha obrigatória para novo cadastro.")
        # O ideal seria retornar erro, mas aqui vamos deixar passar e o banco reclama se for NOT NULL
    
    # 2. Busca de CEP
    # Tenta validar e buscar CEP se a função existir
    try:
        dados_cep = validar_cep(dados)
        if dados_cep:
            print(f"[Prep] CEP encontrado: {dados_cep.get('city')}")
            dados["data"].update({
                'Cidade': dados_cep.get('city', ''),
                'Bairro': dados_cep.get('neighborhood', ''),
                'Rua': dados_cep.get('street', '')
            })
    except Exception as e:
        print(f"[Aviso] Erro ao buscar CEP (API externa?): {e}")

    return dados