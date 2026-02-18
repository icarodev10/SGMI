# validar_ativo.py
"""
Módulo especialista para validar os campos da tabela 'ativos'.

Contém a lógica para garantir que todos os dados de um ativo
(máquina, equipamento, etc.) cumprem as regras de negócio
antes de serem gravados na base de dados.
"""

import re  # Importa o módulo de expressões regulares

def validar_ativo(dados):
    """
    Valida os campos obrigatórios, formatos e valores permitidos para um ativo.
    """
    print("[Checkpoint] Início da validação do ativo")
    erros = []

    # --- Extração e Limpeza dos Dados ---
    # O método .get("chave", "") evita erros se a chave não existir, retornando uma string vazia.
    # O método .strip() remove espaços em branco no início e no fim dos dados.
    nome_ativo = dados["data"].get("Nome_Ativo", "").strip()
    desc_ativo = dados["data"].get("Descricao", "").strip()
    fab_ativo = dados["data"].get("Fabricante", "").strip()
    modelo_ativo = dados["data"].get("Modelo", "").strip()
    num_ser_ativo = dados["data"].get("Numero_Serie", "").strip()
    data_aquisicao = dados["data"].get("Data_Aquisicao", "").strip()
    loc_ativo = dados["data"].get("Localizacao", "").strip()
    # O .lower() converte o status para minúsculas para tornar a validação insensível a maiúsculas/minúsculas.
    status_ativo = dados["data"].get("Status", "").strip().lower()

    print("[Checkpoint] Dados extraídos com sucesso")

    # --- Validações de Regras de Negócio ---
    
    # Validação do Nome do ativo
    if not nome_ativo:
        erros.append("Nome do ativo é obrigatório.")
    # re.match verifica se o nome contém apenas letras (incluindo acentuadas), números, espaços e hífens,
    # e se tem entre 2 e 100 caracteres.
    elif not re.match(r'^[A-Za-zÀ-ÖØ-öø-ÿ0-9\s\-.]{2,100}$', nome_ativo):
        erros.append("Nome do ativo com padrão inválido.")

    # Validação da Descrição
    if not desc_ativo:
        erros.append("Descrição é obrigatória.")
    elif len(desc_ativo) > 100:
        erros.append("Descrição não pode ter mais que 100 caracteres.")

    # Validação do Fabricante
    if not fab_ativo:
        erros.append("Fabricante é obrigatório.")
    elif not re.match(r'^[A-Za-zÀ-ÖØ-öø-ÿ0-9\s\-.]{2,100}$', fab_ativo):
        erros.append("Fabricante com formato inválido.")

    # Validação do Modelo
    if not modelo_ativo:
        erros.append("Modelo é obrigatório.")
    elif len(modelo_ativo) > 100:
        erros.append("Modelo não pode ter mais que 100 caracteres.")

    # Validação do Número de série
    if not num_ser_ativo:
        erros.append("Número de série é obrigatório.")
    elif len(num_ser_ativo) > 100:
        erros.append("Número de série não pode ter mais que 100 caracteres.")

    # Validação da Data de aquisição
    if not data_aquisicao:
        erros.append("Data de aquisição é obrigatória.")
    # A expressão regular garante que a data está no formato AAAA-MM-DD.
    elif not re.match(r'^\d{4}-\d{2}-\d{2}$', data_aquisicao):
        erros.append("Data de aquisição deve estar no formato YYYY-MM-DD.")

    # Validação da Localização
    if not loc_ativo:
        erros.append("Localização do ativo é obrigatória.")
    elif len(loc_ativo) > 100:
        erros.append("Localização não pode ter mais que 100 caracteres.")

    # Validação do Status
    # Garante que o status seja um dos valores permitidos na base de dados.
    status_permitidos = ["ativo", "inativo", "em manutenção", "condenado"]
    if not status_ativo:
        erros.append("Status é obrigatório.")
    elif status_ativo not in status_permitidos:
        erros.append("Status inválido. Use: ativo, inativo, em manutenção ou condenado.")

    print("[Checkpoint] Validação concluída com", len(erros), "erro(s)")
    # Retorna a lista de erros. Se a lista estiver vazia, a validação foi bem-sucedida.
    return erros
