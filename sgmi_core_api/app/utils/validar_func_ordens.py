# validar_func_ordens.py
"""
Módulo especialista para validar os dados da tabela de ligação
'funcionarios_ordens'.

A sua principal responsabilidade é garantir a integridade das chaves
estrangeiras (IDs) ao vincular um funcionário a uma ordem de serviço.
"""

import re

def validar__func_ordens(dados):
    """
    Valida se os IDs do funcionário e da ordem de serviço são números inteiros válidos.
    """
    erros = []  # Lista local para armazenar as mensagens de erro.

    print("Checkpoint 1: Dados recebidos para validação:", dados)
    
    # --- Passo 1: Conversão e Verificação de Tipo ---
    # É crucial garantir que os IDs sejam números inteiros antes de qualquer outra validação.
    try:
        # Tenta converter os valores recebidos para o tipo 'int'.
        # Isto protege contra dados malformados (ex: texto em vez de número).
        dados["data"]["Cadastro_Funcionario_id_Cadastro"] = int(dados["data"]["Cadastro_Funcionario_id_Cadastro"])
        dados["data"]["Ordens_Servico_id_Ordem"] = int(dados["data"]["Ordens_Servico_id_Ordem"])
        print("Checkpoint 2: IDs convertidos para inteiro com sucesso.")
    except (ValueError, TypeError) as e:
        # Se a conversão falhar (ex: int("abc")), captura o erro.
        erros.append(f"Erro ao converter IDs para inteiro: {e}")
        print("Checkpoint ERRO: Falha ao converter IDs para inteiro:", e)
        # Retorna imediatamente, pois as validações seguintes não fariam sentido.
        return erros

    # Extrai os IDs já convertidos para variáveis locais.
    id_cad_func = dados["data"]["Cadastro_Funcionario_id_Cadastro"]
    id_ordem_func = dados["data"]["Ordens_Servico_id_Ordem"]

    print("Checkpoint 3: Dados extraídos com sucesso.")

    # --- Passo 2: Validação de Obrigatoriedade e Tipo ---
    # Mesmo que a conversão funcione, os valores podem ser 0 ou outros valores "falsos".
    
    # Validação do ID do funcionário
    if not id_cad_func:
        erros.append("ID do cadastro do funcionário é obrigatório")
    # Esta verificação é um pouco redundante devido ao 'try-except' acima,
    # mas serve como uma dupla garantia de que o tipo de dado é correto.
    elif not isinstance(id_cad_func, int):
        erros.append("ID do cadastro do funcionário precisa ser um número inteiro")

    # Validação do ID da ordem de serviço
    if not id_ordem_func:
        erros.append("ID da ordem do funcionário é obrigatório")
    elif not isinstance(id_ordem_func, int):
        erros.append("ID da ordem do funcionário precisa ser um número inteiro")

    print("Checkpoint 7: Validação dos IDs concluída.")
    print("Checkpoint 8: Validação finalizada com erros:", erros)

    # Retorna a lista de erros. Se estiver vazia, a validação foi bem-sucedida.
    return erros
