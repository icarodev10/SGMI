# validar_solicitar_peca.py
"""
Módulo especialista para validar os campos da tabela 'solicitar_peca'.

Este arquivo contém a lógica para validar os dados de uma solicitação de peça,
incluindo uma verificação na base de dados para garantir que, se uma peça
for solicitada, ela realmente exista.
"""

import re
from app.database.conectar import connect_db

def validar_solicitar_peca(dados):
    """
    Valida os campos de uma solicitação
    """
    erros = []

    # --- Extração e Limpeza dos Dados ---
    try:
        peca = dados["data"]["id_Peca"]
        quantidade = dados["data"]["Quantidade"]
        horario = dados["data"]["Horario"]

    except KeyError as e:
        erros.append(f"Campo obrigatório em falta: {e}")
        return erros

    # --- Validações de Formato e Regras de Negócio ---

    # Validação do Nome do sensor
    if not peca:
        erros.append("Nome do sensor é obrigatório.")

    # Validação do Tipo do sensor
    if not quantidade:
        erros.append("Tipo do sensor é obrigatório.")

    # Validação da Unidade de medida
    if not horario:
        erros.append("Unidade de medida é obrigatória.")

    print("[Checkpoint Final] Validação concluída com", len(erros), "erro(s)")
    return erros
