# validar_ordem_servico.py
"""
Módulo especialista para validar os dados da tabela 'ordens_servico'.

Este arquivo é crucial pois, além de validar os formatos dos dados,
implementa uma regra de negócio fundamental: verifica o estado da
solicitação original antes de permitir a criação de uma ordem de serviço.
"""

import re
import mysql.connector
from app.database.conectar import connect_db # Importa a função centralizada de ligação à BD.
from datetime import datetime

def validar_ordem_servico(dados):
    """
    Valida os dados para a criação de uma nova Ordem de Serviço.
    """
    erros = []

    print("Checkpoint 1: Dados recebidos:", dados)

    # --- Extração e Conversão de Tipos ---
    try:
        id_ativo_ordem = int(dados["data"]["id_Ativo"])
        desc_problema = dados["data"]["Descricao_Problema"].strip()
        data_abertura = dados["data"]["Data_Abertura"].strip()
        status_ordem = dados["data"]["Status"].strip()
        prioridade_ordem = dados["data"]["Prioridade"].strip()
        id_solicitacao = int(dados["data"]["id_Solicitacao"])
        print("Checkpoint 2: Extração de dados concluída.")
    except (KeyError, ValueError) as e:
        print("Erro ao extrair ou converter os dados:", e)
        erros.append(f"Erro na estrutura ou tipo dos dados: {e}")
        return erros

    # --- Validação da Regra de Negócio: Verificar o Estado da Solicitação ---
    # Uma Ordem de Serviço só pode ser criada a partir de uma solicitação que foi 'Aceita'.
    try:
        conn = connect_db()
        # O cursor sem 'dictionary=True' retorna os resultados como tuplos.
        cursor = conn.cursor()
        cursor.execute("SELECT Status FROM solicitacoes WHERE id_Solicitacao = %s", (id_solicitacao,))
        resultado = cursor.fetchone() # Pega na primeira linha do resultado.
        cursor.close()
        conn.close()

        if resultado:
            status_solicitacao = resultado[0] # Pega no primeiro item do tuplo (a coluna Status).
            # Verifica se o estado da solicitação impede a criação da ordem.
            if status_solicitacao.lower() in ["recusada", "em analise"]:
                erros.append("Não é possível abrir uma ordem para uma solicitação que foi recusada ou ainda está em análise.")
                print("Checkpoint 2.1: Solicitação recusada ou em análise detetada.")
        else:
            erros.append("A solicitação de origem não foi encontrada na base de dados.")
            print("Checkpoint 2.2: Solicitação não encontrada.")
    except mysql.connector.Error as e:
        print("Erro ao consultar o estado da solicitação:", e)
        erros.append("Erro ao validar o estado da solicitação.")

    # --- Validação dos Campos Individuais ---
    if not id_ativo_ordem:
        erros.append("ID do ativo na ordem é obrigatório")
    elif not isinstance(id_ativo_ordem, int):
        erros.append("ID do ativo na ordem precisa de ser um número inteiro")
    print("Checkpoint 3: Validação do ID do ativo concluída.")

    if not desc_problema:
        erros.append("Descrição do problema é obrigatória.")
    elif len(desc_problema) > 200: # Aumentado para 200 para corresponder à BD
        erros.append("Descrição do problema não pode ter mais que 200 caracteres")
    print("Checkpoint 4: Validação da descrição do problema concluída.")

    # --- Bloco de Validação da Data CORRIGIDO ---
    if data_abertura:
        try:
            # A função datetime.fromisoformat() é feita exatamente para ler o formato
            # que o seu front-end envia (ex: "2025-10-01T17:40:00.000Z").
            # Apenas removemos o "Z" para máxima compatibilidade.
            if data_abertura.endswith('Z'):
                data_abertura = data_abertura[:-1] + '+00:00'

            datetime.fromisoformat(data_abertura)
            # Se a linha acima não der erro, a data é válida e não fazemos nada.
            # O valor original será passado para o banco, que agora aceita DATETIME.

        except ValueError:
            erros.append(f"Data de abertura em formato inválido. Valor recebido: {data_abertura}")

    print("Checkpoint 5: Validação da data de abertura concluída.")

    status_permitidos = ["Aberta", "Em Andamento", "Concluida"]
    if not status_ordem:
        erros.append("Estado da Ordem é obrigatório")
    elif status_ordem not in status_permitidos:
        erros.append(f"Estado inválido. Valores permitidos: {', '.join(status_permitidos)}")
    print("Checkpoint 6: Validação do estado da ordem concluída.")

    prioridades_permitidas = ["Alta", "Media", "Baixa"]
    if not prioridade_ordem:
        erros.append("Prioridade da Ordem é obrigatória")
    elif prioridade_ordem not in prioridades_permitidas:
        erros.append(f"Prioridade inválida. Valores permitidos: {', '.join(prioridades_permitidas)}")
    print("Checkpoint 7: Validação da prioridade concluída.")

    if not id_solicitacao:
        erros.append("ID da Solicitação de origem é obrigatório")
    elif not isinstance(id_solicitacao, int):
        erros.append("ID da Solicitação precisa de ser um número inteiro")
    print("Checkpoint 8: Validação da solicitação concluída.")

    print("Checkpoint 9: Validação finalizada. Erros encontrados:", erros)
    return erros
