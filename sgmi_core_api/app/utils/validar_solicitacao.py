# validar_solicitacao.py
"""
Módulo especialista para validar os campos da tabela 'solicitacoes'.

Este arquivo contém a lógica para validar os dados de uma nova
solicitação de manutenção, que é o ponto de partida para todo o
fluxo de trabalho de manutenção.
"""

import re

def validar_solicitacao(dados):
    """
    Valida os campos obrigatórios e os formatos dos dados para uma nova solicitação.
    """
    erros = []  # Lista local para armazenar as mensagens de erro.
    
    # --- Passo 1: Extração e Validação de Tipos ---
    try:
        # Tenta converter o ID do solicitante para inteiro.
        solicitante = int(dados["data"]["solicitante"])
        print("[Checkpoint 1] Solicitante convertido para inteiro:", solicitante)
    except (ValueError, TypeError, KeyError):
        erros.append("ID do Solicitante é inválido ou não foi fornecido.")
        solicitante = None # Marca como inválido para as validações seguintes.
        print("[Checkpoint 1] Erro: Solicitante inválido ou ausente")

    # Extrai e limpa os restantes dados.
    titulo = dados["data"].get("Titulo", "").strip()
    problema = dados["data"].get("Problema", "").strip() # Adicionado .strip() para consistência
    prioridade = dados["data"].get("Prioridade", "").strip()
    status = dados["data"].get("Status", "").strip()

    # --- Passo 2: Validação dos Campos Individuais ---

    # Validação do Título
    if not titulo:
        erros.append("Título é obrigatório.")
    elif not re.match(r'^[A-Za-zÀ-ÖØ-öø-ÿ0-9\s-]{2,100}$', titulo):
        erros.append("Título com padrão inválido.")

    # Validação da Descrição do Problema
    if not problema:
        erros.append("A descrição do problema é obrigatória.")
    elif len(problema) > 200:
        erros.append("A descrição do problema não pode ter mais que 200 caracteres.")

    # Validação do Solicitante (ID do funcionário)
    if solicitante is None:
        # O erro já foi adicionado no bloco try-except, esta verificação é uma segurança extra.
        if "ID do Solicitante é inválido ou não foi fornecido." not in erros:
            erros.append("ID do Solicitante é obrigatório.")
    elif not isinstance(solicitante, int):
        erros.append("ID do Solicitante precisa de ser um número inteiro.")

    # Validação da Prioridade
    prioridades_permitidas = ["Alta", "Media", "Baixa"]
    if not prioridade:
        erros.append("Prioridade é obrigatória.")
    # Garante que o valor seja um dos três tipos permitidos.
    elif prioridade not in prioridades_permitidas:
        erros.append(f"Prioridade inválida. Valores permitidos: {', '.join(prioridades_permitidas)}.")

    # Validação do Status
    status_permitidos = ["Em Analise", "Aceita", "Recusada"]
    if not status:
        erros.append("Status é obrigatório.")
    elif status not in status_permitidos:
        erros.append(f"Status inválido. Valores permitidos: {', '.join(status_permitidos)}.")

    print("[Checkpoint Final] Validação concluída com", len(erros), "erro(s)")
    return erros
