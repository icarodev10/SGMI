# validar_historico.py
"""
Módulo especialista para validar os campos da tabela 'historico'.

Este arquivo contém a lógica para validar os dados do relatório final
de uma ordem de serviço, garantindo que todas as informações de fecho
sejam consistentes e corretamente formatadas.
"""

import re

def validar_historico(dados):
    """
    Valida os campos obrigatórios e os formatos dos dados para um registro de histórico.
    """
    erros = []  # Lista local para armazenar as mensagens de erro.

    print("Checkpoint 1: Dados recebidos para validação:", dados)

    # --- Extração e Limpeza dos Dados ---
    try:
        id_ordem_historico = dados["data"]["id_Ordem"]
        tipo_manutencao = dados["data"]["Tipo_Manutencao"].strip()
        duracao_manutencao = dados["data"]["Duracao"].strip()
        custo_manutencao = dados["data"]["Custo"]
        observacoes_manutencao = dados["data"]["Observacoes"].strip()
        id_func_consertou = dados["data"]["id_Funcionario_Consertou"]
        print("Checkpoint 2: Extração de dados concluída.")
    except KeyError as e:
        # Captura o erro se uma chave obrigatória não for encontrada nos dados.
        print(f"Checkpoint ERRO: Campo obrigatório em falta: {e}")
        erros.append(f"Campo obrigatório em falta: {e}")
        return erros

    # --- Validações de Regras de Negócio ---

    # Validação do ID da Ordem
    if not id_ordem_historico:
        erros.append("ID da ordem de serviço é obrigatório.")
    elif not isinstance(id_ordem_historico, int):
        erros.append("ID da ordem de serviço precisa de ser um número inteiro.")
    print("Checkpoint 3: Validação do ID da ordem concluída.")

    # Validação do Tipo de manutenção
    tipos_permitidos = ["Preventiva", "Corretiva", "Preditiva"]
    if not tipo_manutencao:
        erros.append("Tipo de manutenção é obrigatório.")
    # Garante que o valor seja um dos três tipos permitidos.
    elif tipo_manutencao not in tipos_permitidos:
        erros.append("Tipo de manutenção inválido. Use: Preventiva, Corretiva ou Preditiva.")
    print("Checkpoint 4: Validação do tipo de manutenção concluída.")

    # Validação da Duração
    if not duracao_manutencao:
        erros.append("Duração da manutenção é obrigatória.")
    elif len(duracao_manutencao) > 45:
        erros.append("Duração não pode ter mais que 45 caracteres.")
    print("Checkpoint 5: Validação da duração concluída.")

    # Validação do Custo
    if custo_manutencao is None: # Verifica se o custo é nulo
        erros.append("Custo da manutenção é obrigatório.")
    # Garante que o custo seja um número (inteiro ou float).
    elif not isinstance(custo_manutencao, (int, float)):
        erros.append("Custo da manutenção tem de ser um número.")
    print("Checkpoint 6: Validação do custo concluída.")

    # Validação das Observações
    if not observacoes_manutencao:
        erros.append("Observações são obrigatórias.")
    elif len(observacoes_manutencao) > 100:
        erros.append("Observações não podem ter mais que 100 caracteres.")
    print("Checkpoint 7: Validação das observações concluída.")
    

    # Validação do ID do funcionário que consertou
    if not id_func_consertou:
        erros.append("ID do funcionário que consertou a máquina é obrigatório.")
    elif not isinstance(id_func_consertou, int):
        erros.append("ID do funcionário que consertou a máquina precisa de ser um número inteiro.")
    print("Checkpoint 8: Validação do ID do funcionário concluída.")

    print("Checkpoint 9: Validação finalizada. Erros encontrados:", erros)
    return erros
