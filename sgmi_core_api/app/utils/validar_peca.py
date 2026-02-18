# validar_peca.py
"""
Módulo especialista para validar os campos da tabela 'pecas'.

Este arquivo contém a lógica para garantir que os dados de uma nova peça
(nome, descrição, estoque, valor, etc.) cumprem todas as regras de negócio,
incluindo a verificação de tipos de dados numéricos e formatos de texto.
"""

import re

def validar_peca(dados):
    """
    Valida os campos obrigatórios e os formatos dos dados para uma nova peça.
    """
    erros = []  # Lista local para armazenar as mensagens de erro.

    # --- Passo 1: Validação e Conversão de Tipos Numéricos ---
    # É crucial garantir que os campos numéricos são válidos antes de prosseguir.

    # Tenta converter o 'Estoque' para um número inteiro.
    try:
        estoque_peca = int(dados["data"]["Estoque"])
        print("[Checkpoint 1] Estoque convertido:", estoque_peca)
    except (ValueError, TypeError):
        # Se a conversão falhar (ex: o valor é "abc" ou está em falta), adiciona um erro.
        erros.append("O valor do estoque de peças precisa de ser um número inteiro.")
        estoque_peca = None # Define como None para as validações seguintes saberem que falhou.
        print("[Checkpoint 1] Erro: Estoque inválido")

    # Tenta converter o 'Valor_Unitario' para um número de ponto flutuante (float).
    try:
        # Substitui vírgula por ponto para garantir a conversão correta.
        valor_str = str(dados["data"]["Valor_Unitario"]).replace(',', '.')
        valor_peca = float(valor_str)
        print("[Checkpoint 2] Valor unitário convertido:", valor_peca)
    except (ValueError, TypeError):
        erros.append("O valor unitário da peça tem um formato inválido.")
        valor_peca = None
        print("[Checkpoint 2] Erro: Valor unitário inválido")

    # --- Passo 2: Extração e Limpeza de Dados de Texto ---
    nome_peca = dados["data"].get("Nome_Peca", "").strip()
    desc_peca = dados["data"].get("Descricao", "").strip()
    fab_peca = dados["data"].get("Fabricante", "").strip()
    fornecedor_peca = dados["data"].get("Fornecedor", "").strip()
    # O número de série foi removido da tabela 'pecas', mas a validação pode ser mantida
    # caso ele exista em outro contexto ou seja adicionado no futuro.
    # num_ser_peca = dados["data"].get("Numero_Serie", "").strip() 
    print(f"[Checkpoint 3] Dados extraídos: Nome='{nome_peca}', Descrição='{desc_peca}', etc.")

    # --- Passo 3: Validação dos Campos de Texto ---

    # Validação do nome da peça
    if not nome_peca:
        erros.append("Nome da peça é obrigatório.")
    elif not re.match(r'^[A-Za-zÀ-ÖØ-öø-ÿ0-9\s/,.]{2,45}$', nome_peca):
        erros.append("Nome da peça contém caracteres inválidos ou comprimento incorreto.")

    # Validação da descrição
    if not desc_peca:
        erros.append("Descrição é obrigatória.")
    elif len(desc_peca) > 100:
        erros.append("Descrição não pode ter mais que 100 caracteres.")

    # Validação do fabricante
    if not fab_peca:
        erros.append("Fabricante é obrigatório.")
    elif not re.match(r'^[A-Za-zÀ-ÖØ-öø-ÿ0-9\s.\-]{2,45}$', fab_peca):
        erros.append("Fabricante contém caracteres inválidos ou comprimento incorreto.")

    # Validação do fornecedor
    if not fornecedor_peca:
        erros.append("Fornecedor da peça é obrigatório.")
    elif not re.match(r'^[A-Za-zÀ-ÖØ-öø-ÿ0-9\s.]{2,45}$', fornecedor_peca):
        erros.append("Fornecedor contém caracteres inválidos ou comprimento incorreto.")

    # --- Passo 4: Validação Final dos Campos Numéricos ---
    # Se 'estoque_peca' for None, significa que a conversão inicial já falhou e o erro já foi adicionado.
    if estoque_peca is not None:
        if estoque_peca < 0:
            erros.append("O stock não pode ser um número negativo.")
        print("[Checkpoint 8] Estoque validado")

    # Se 'valor_peca' for None, a conversão também já falhou.
    if valor_peca is not None:
        if valor_peca < 0:
            erros.append("O valor unitário não pode ser negativo.")
        print("[Checkpoint 9] Valor unitário validado")

    print("[Checkpoint Final] Validação concluída com", len(erros), "erro(s)")
    return erros