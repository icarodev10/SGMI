"""
Módulo central para o processamento da lógica de negócio.
Atua como um "dispatcher" ou "roteador".
"""

# --- Importações dos Módulos de Lógica de Negócio ---

# 1. Módulos de VALIDAÇÃO
from app.utils.validacao import (
    dados_valida_cadastro, dados_valida_ativo, dados_valida_func_ordem,
    dados_valida_historico, dados_valida_ordem_servico, dados_valida_peca,
    dados_valida_pecas_ordens, dados_valida_sensor, dados_valida_solicitacao, dados_valida_empresa
)

# 2. Módulos de PREPARAÇÃO
from app.services.preparacao_gravacao import (
    preparar_dados_para_gravacao_funcionario, preparar_dados_para_gravacao_ativo,
    preparar_dados_para_gravacao_historico, preparar_dados_para_gravacao_ordens_pecas,
    preparar_dados_para_gravacao_ordens_servico, preparar_dados_para_gravacao_pecas,
    preparar_dados_para_gravacao_cadastro, preparar_dados_para_gravacao_sensores,
    preparar_dados_para_gravacao_solicitacoes, preparar_dados_para_gravacao_historico_ativos, 
    preparar_dados_para_gravacao_historico_sensores, preparar_dados_para_gravacao_empresa,
    preparar_dados_para_gravacao_solicitar_pecas
)

from werkzeug.security import generate_password_hash 

# 3. Módulos de EXECUÇÃO
from app.database.inserir import generic_insert
from app.database.atualizar import generic_update
from app.database.deletar import generic_delete

# 4. Módulos UTILITÁRIOS
from app.services.email_utils import enviar_email_boas_vindas
from app.database.conectar import connect_db
from datetime import datetime
from decimal import Decimal

def processar_dados(acao, dados=None):
    """
    Função principal que processa operações de escrita (POST, PUT) para diferentes tabelas.
    """
    print("CHECKPOINT: Início do processamento")
    print(f"CHECKPOINT: Ação: {acao} | Tabela: {dados.get('table')}")

    resposta = {}
    tabela = dados.get("table")

    if not tabela:
        return {'status': 'erro', 'mensagem': 'Tabela não informada'}

    # ==============================================================================
    # BLOCO: CADASTRO DE FUNCIONÁRIO
    # ==============================================================================
    if tabela == "cadastro_funcionario":
        print("CHECKPOINT: Processando tabela 'cadastro_funcionario'")
        
        # Tratamento de senha no UPDATE
        if acao == 'PUT':
            dados_para_atualizar = dados["data"]
            senha_recebida = dados_para_atualizar.get("Senha")
            
            if senha_recebida:
                # Se não for hash, criptografa
                if not senha_recebida.startswith('scrypt:'):
                    print("CHECKPOINT: Nova senha texto puro. Criptografando...")
                    dados_para_atualizar['Senha'] = generate_password_hash(senha_recebida)
                else:
                    print("CHECKPOINT: Senha já é hash. Mantendo.")
            else:
                # Remove campo senha vazio para não apagar a atual
                dados_para_atualizar.pop('Senha', None)
            
            dados['data'] = dados_para_atualizar

        # Validação
        erros = dados_valida_cadastro(dados, acao)
        if erros: return {'status': 'erro', 'mensagem': erros}

        senha_original = dados["data"]["Senha"] # Salva senha original pra mandar por e-mail

        # Preparação
        dados_preparados = preparar_dados_para_gravacao_cadastro(acao, dados)

        # Execução
        if acao == 'POST':
            resposta = generic_insert(tabela, dados_preparados["data"], dados.get("database", "sgmi"))
            
            # E-mail de Boas Vindas
            if resposta.get("inserted_id"):
                try:
                    enviar_email_boas_vindas(
                        dados["data"].get("Email"), 
                        dados["data"].get("Nome"), 
                        dados, 
                        senha_original
                    )
                except Exception as e:
                    print(f"Erro email boas vindas: {e}")

        elif acao == 'PUT':
            resposta = generic_update(tabela, dados["data"], dados.get("where"), dados.get("database", "base"))

    # ==============================================================================
    # BLOCO: EMPRESAS
    # ==============================================================================
    elif tabela == "empresas":
        print("CHECKPOINT: Processando tabela 'empresas'")
        
        # Tratamento de senha
        dados_alvo = dados.get("data", {})
        senha_recebida = dados_alvo.get("Senha")
        if senha_recebida and not senha_recebida.startswith('scrypt:'):
            dados_alvo['Senha'] = generate_password_hash(senha_recebida)
        dados['data'] = dados_alvo

        erros = dados_valida_empresa(dados)
        if erros: return {'status': 'erro', 'mensagem': erros}
        
        dados_preparados = preparar_dados_para_gravacao_empresa(acao, dados)
        
        if acao == 'POST':
            resposta = generic_insert(tabela, dados_preparados["data"], dados.get("database", "sgmi"))
        elif acao == 'PUT':
            resposta = generic_update(tabela, dados_preparados["data"], dados.get("where"), dados.get("database", "base"))

    # ==============================================================================
    # BLOCO: SENSORES
    # ==============================================================================
    elif tabela == "sensores":
        erros = dados_valida_sensor(dados)
        if erros: return {'status': 'erro', 'mensagem': erros}
        
        dados_preparados = preparar_dados_para_gravacao_sensores(acao, dados)
        
        if acao == 'POST':
            resposta = generic_insert(tabela, dados["data"], dados.get("database", "sgmi"))
        elif acao == 'PUT':
            resposta = generic_update(tabela, dados["data"], dados.get("where"), dados.get("database", "base"))

    # ==============================================================================
    # BLOCO: HISTÓRICOS (ATIVOS E SENSORES)
    # ==============================================================================
    elif tabela == "historico_ativos":
        dados_preparados = preparar_dados_para_gravacao_historico_ativos(acao, dados)
        if acao == 'POST':
            resposta = generic_insert(tabela, dados["data"], dados.get("database", "sgmi"))
        elif acao == 'PUT':
            resposta = generic_update(tabela, dados["data"], dados.get("where"), dados.get("database", "base"))

    elif tabela == "historico_sensores":
        dados_preparados = preparar_dados_para_gravacao_historico_sensores(acao, dados)
        if acao == 'POST':
            resposta = generic_insert(tabela, dados["data"], dados.get("database", "sgmi"))
        elif acao == 'PUT':
            resposta = generic_update(tabela, dados["data"], dados.get("where"), dados.get("database", "base"))

    # ==============================================================================
    # BLOCO: ATIVOS
    # ==============================================================================
    elif tabela == "ativos":
        erros = dados_valida_ativo(dados)
        if erros: return {'status': 'erro', 'mensagem': erros}
        
        dados_preparados = preparar_dados_para_gravacao_ativo(acao, dados)
        
        if acao == 'POST':
            resposta = generic_insert(tabela, dados["data"], dados.get("database", "sgmi"))
        elif acao == 'PUT':
            resposta = generic_update(tabela, dados["data"], dados.get("where"), dados.get("database", "base"))

    # ==============================================================================
    # BLOCO: HISTORICO GERAL
    # ==============================================================================
    elif tabela == "historico":
        erros = dados_valida_historico(dados)
        if erros: return {'status': 'erro', 'mensagem': erros}
        
        dados_preparados = preparar_dados_para_gravacao_historico(acao, dados)
        
        if acao == 'POST':
            resposta = generic_insert(tabela, dados["data"], dados.get("database", "sgmi"))
        elif acao == 'PUT':
            resposta = generic_update(tabela, dados["data"], dados.get("where"), dados.get("database", "base"))

    # ==============================================================================
    # BLOCO: PEÇAS E ORDENS DE PEÇAS
    # ==============================================================================
    elif tabela == "pecas":
        erros = dados_valida_peca(dados)
        if erros: return {'status': 'erro', 'mensagem': erros}
        
        dados_preparados = preparar_dados_para_gravacao_pecas(acao, dados)
        
        if acao == 'POST':
            resposta = generic_insert(tabela, dados["data"], dados.get("database", "sgmi"))
        elif acao == 'PUT':
            resposta = generic_update(tabela, dados["data"], dados.get("where"), dados.get("database", "base"))

    elif tabela == "ordens_pecas":
        erros = dados_valida_pecas_ordens(dados)
        if erros: return {'status': 'erro', 'mensagem': erros}
        
        dados_preparados = preparar_dados_para_gravacao_ordens_pecas(acao, dados)
        
        if acao == 'POST':
            resposta = generic_insert(tabela, dados["data"], dados.get("database", "sgmi"))
        elif acao == 'PUT':
            resposta = generic_update(tabela, dados["data"], dados.get("where"), dados.get("database", "base"))

    # ==============================================================================
    # BLOCO: ORDENS DE SERVIÇO (Lógica manual de status ativo)
    # ==============================================================================
    elif tabela == "ordens_servico":
        erros = dados_valida_ordem_servico(dados)
        if erros: return {'status': 'erro', 'mensagem': erros}

        if acao == 'POST':
            record = {k.strip(): v for k, v in dados["data"].items()}
            record["Data_Abertura"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            resposta = generic_insert(tabela, record, dados.get("database", "sgmi"))

            # Atualiza status do ativo baseado na prioridade
            prioridade = record.get("Prioridade")
            id_ativo = record.get("id_Ativo")
            status_ativo = 'inativo' if prioridade == 'Alta' else 'em manutenção' if prioridade == 'Media' else 'ativo'
            
            # Executa update manual no ativo
            conn = connect_db()
            cur = conn.cursor()
            cur.execute("UPDATE ativos SET Status = %s WHERE id_Ativo = %s", (status_ativo, id_ativo))
            conn.commit()
            cur.close()
            conn.close()

        elif acao == 'PUT':
            # Remove data abertura pra não sobreescrever
            record = {k.strip(): v for k, v in dados["data"].items() if k != "Data_Abertura"}
            resposta = generic_update(tabela, record, dados.get("where"), dados.get("database", "sgmi"))

    # ==============================================================================
    # BLOCO: FUNCIONÁRIOS ORDENS E SOLICITAÇÕES
    # ==============================================================================
    elif tabela == "funcionarios_ordens":
        erros = dados_valida_func_ordem(dados)
        if erros: return {'status': 'erro', 'mensagem': erros}
        dados_preparados = preparar_dados_para_gravacao_funcionario(acao, dados)
        if acao == 'POST':
            resposta = generic_insert(tabela, dados["data"], dados.get("database", "sgmi"))
        elif acao == 'PUT':
            resposta = generic_update(tabela, dados["data"], dados.get("where"), dados.get("database", "base"))

    elif tabela == "solicitar_peca":
        dados_preparados = preparar_dados_para_gravacao_solicitar_pecas(acao, dados)
        if acao == 'POST':
            resposta = generic_insert(tabela, dados["data"], dados.get("database", "sgmi"))
        elif acao == 'PUT':
            resposta = generic_update(tabela, dados["data"], dados.get("where"), dados.get("database", "base"))

    elif tabela == "solicitacoes":
        erros = dados_valida_solicitacao(dados)
        if erros: return {'status': 'erro', 'mensagem': erros}
        dados_preparados = preparar_dados_para_gravacao_solicitacoes(acao, dados)
        if acao == 'POST':
            resposta = generic_insert(tabela, dados["data"], dados.get("database", "sgmi"))
        elif acao == 'PUT':
            resposta = generic_update(tabela, dados["data"], dados.get("where"), dados.get("database", "base"))

    # ==============================================================================
    # BLOCO: DELETE GENÉRICO (Se não caiu em nenhum if específico)
    # ==============================================================================
    if acao == 'DELETE':
        resposta = generic_delete(tabela, dados.get("where"), dados.get("database", "sgmi"))

    print("CHECKPOINT: Processamento finalizado")
    return resposta