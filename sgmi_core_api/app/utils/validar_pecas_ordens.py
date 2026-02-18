# validar_pecas_ordens.py
"""
Módulo especialista para validar a adição de uma peça a uma ordem de serviço.

A sua principal responsabilidade é garantir a integridade dos dados e,
mais importante, verificar se existe estoque suficiente da peça solicitada
antes de permitir que o vínculo seja criado na base de dados.
"""

def validar_pecas_ordens(dados, cursor):
    """
    Valida os IDs, a quantidade e o estoque disponível para o vínculo 'ordens_pecas'.

    Args:
        dados (dict): Os dados da requisição.
        cursor: Um cursor de base de dados já ativo para executar consultas.
    """
    erros = []  # Lista local para armazenar as mensagens de erro.

    # --- Passo 1: Validação e Conversão de Tipos Numéricos ---
    try:
        quantidade_pecas = int(dados["data"]["Quantidade"])
        print("[Checkpoint 1] Quantidade convertida:", quantidade_pecas)
    except (ValueError, TypeError):
        erros.append("Quantidade precisa de ser um número inteiro.")
        quantidade_pecas = None # Marca como inválido para as validações seguintes.
        print("[Checkpoint 1] Erro: Quantidade inválida")

    try:
        id_ordem_pecas = int(dados["data"]["id_Ordem"])
        print("[Checkpoint 2] ID da Ordem convertido:", id_ordem_pecas)
    except (ValueError, TypeError):
        erros.append("ID da ordem precisa de ser um número inteiro.")
        id_ordem_pecas = None
        print("[Checkpoint 2] Erro: ID da ordem inválido")

    try:
        id_peca_ordem = int(dados["data"]["id_Peca"])
        print("[Checkpoint 3] ID da Peça convertido:", id_peca_ordem)
    except (ValueError, TypeError):
        erros.append("ID da peça utilizada na ordem precisa de ser um número inteiro.")
        id_peca_ordem = None
        print("[Checkpoint 3] Erro: ID da peça inválido")

    # --- Passo 2: Validação de Obrigatoriedade ---
    # Verifica se os campos essenciais foram preenchidos.
    if quantidade_pecas is None:
        # A verificação 'not in erros' evita mensagens duplicadas.
        if "Quantidade precisa de ser um número inteiro." not in erros:
            erros.append("Quantidade de peças utilizadas na ordem é obrigatória.")
    elif quantidade_pecas <= 0:
        erros.append("A quantidade deve ser um número positivo.")

    if id_ordem_pecas is None:
        if "ID da ordem precisa de ser um número inteiro." not in erros:
            erros.append("ID da ordem é obrigatório.")

    if id_peca_ordem is None:
        if "ID da peça utilizada na ordem precisa de ser um número inteiro." not in erros:
            erros.append("ID da peça utilizada na ordem é obrigatório.")

    # --- Passo 3: Validação da Regra de Negócio (Verificação de estoque) ---
    # Este passo só é executado se a quantidade e o ID da peça forem válidos.
    if quantidade_pecas is not None and id_peca_ordem is not None:
        try:
            # Executa uma consulta para obter o estoque atual da peça.
            cursor.execute("SELECT Estoque FROM pecas WHERE id_Peca = %s", (id_peca_ordem,))
            resultado = cursor.fetchone() # Pega no resultado da consulta.

            if resultado is None:
                print("[Checkpoint 7] Erro: Peça não encontrada na base de dados")
                erros.append("A peça informada não existe no sistema.")
            # Compara a quantidade pedida com o estoque disponível.
            elif quantidade_pecas > resultado["Estoque"]:
                print(f"[Checkpoint 7] Erro: Quantidade ({quantidade_pecas}) > estoque ({resultado['Estoque']})")
                erros.append("Quantidade solicitada excede o estoque disponível.")
            else:
                print(f"[Checkpoint 7] estoque validado: {quantidade_pecas} <= {resultado['Estoque']}")

        except Exception as e:
            print(f"[Checkpoint 7] Erro na consulta ao estoque: {e}")
            erros.append("Erro interno ao verificar o estoque da peça.")

    print("[Checkpoint Final] Validação concluída com", len(erros), "erro(s)")
    return erros
