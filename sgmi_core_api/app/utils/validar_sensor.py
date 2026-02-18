# validar_sensor.py
"""
Módulo especialista para validar os campos da tabela 'sensores'.

Este arquivo contém a lógica para validar os dados de um sensor,
incluindo uma verificação na base de dados para garantir que, se um sensor
for associado a um ativo, esse ativo realmente exista.
"""

import re
from app.database.conectar import connect_db

def validar_sensor(dados):
    """
    Valida os campos de um sensor, incluindo a existência do ativo associado.
    """
    erros = []

    # --- Extração e Limpeza dos Dados ---
    try:
        nome_sensor = dados["data"]["Nome_Sensor"].strip()
        tipo_sensor = dados["data"]["Tipo"].strip()
        unid_med = dados["data"]["Unidade_Medida"].strip()
        status_sensor = dados["data"]["Status"].strip()
        modelo_sensor = dados["data"]["Modelo"].strip()
        num_serie_sensor = dados["data"]["Numero_Serie"].strip()
        # O .get() é usado para o id_Ativo, pois ele é um campo opcional.
        num_ativo_sensor = dados["data"].get("id_Ativo")
    except KeyError as e:
        erros.append(f"Campo obrigatório em falta: {e}")
        return erros

    # --- Validações de Formato e Regras de Negócio ---

    # Validação do Nome do sensor
    if not nome_sensor:
        erros.append("Nome do sensor é obrigatório.")
    elif not re.match(r'^[A-Za-zÀ-ÖØ-öø-ÿ0-9\s-]{2,100}$', nome_sensor):
        erros.append("Nome do sensor com padrão inválido.")

    # Validação do Tipo do sensor
    if not tipo_sensor:
        erros.append("Tipo do sensor é obrigatório.")
    elif not re.match(r'^[A-Za-zÀ-ÖØ-öø-ÿ0-9\s/.]{2,100}$', tipo_sensor):
        erros.append("Tipo do sensor com padrão inválido.")

    # Validação da Unidade de medida
    if not unid_med:
        erros.append("Unidade de medida é obrigatória.")
    # Permite letras, números, espaços e caracteres comuns em unidades (°%/).
    elif not re.match(r'^[A-Za-zÀ-ÖØ-öø-ÿ\s°%/]{1,45}$', unid_med):
        erros.append("Unidade de medida com formato inválido.")

    # Validação do Status
    status_permitidos = ["Ativo", "Inativo", "Em Manutenção"]
    if not status_sensor:
        erros.append("Status do sensor é obrigatório.")
    elif status_sensor not in status_permitidos:
        erros.append("Status inválido. Use: Ativo, Inativo ou Em Manutenção.")

    # Validação do Modelo
    if not modelo_sensor:
        erros.append("Modelo do sensor é obrigatório.")
    elif not re.match(r'^[A-Za-zÀ-ÖØ-öø-ÿ0-9\s\-]{2,45}$', modelo_sensor):
        erros.append("Modelo com formato inválido.")

    # Validação do Número de série
    if not num_serie_sensor:
        erros.append("Número de série é obrigatório.")
    elif len(num_serie_sensor) > 45:
        erros.append("Número de série não pode ter mais que 45 caracteres.")

    # --- Validação da Chave Estrangeira (id_Ativo) ---
    # Um sensor pode ser registado sem estar associado a um ativo.
    # Se um ID de ativo for fornecido, ele tem de existir na base de dados.
    
    # Verifica se o id_Ativo é nulo, uma string vazia ou a string "null".
    if num_ativo_sensor is None or str(num_ativo_sensor).strip().lower() in ["", "null"]:
        print("[Checkpoint 7] id_Ativo é nulo ou vazio, o que é permitido.")
        # Se for nulo, não há mais nada a validar aqui.
    else:
        # Se um ID foi fornecido, verifica se ele existe na tabela 'ativos'.
        try:
            id_ativo_str = str(num_ativo_sensor).strip()
            conn = connect_db()
            cursor = conn.cursor()

            # Consulta para contar quantos ativos existem com o ID fornecido.
            cursor.execute("SELECT COUNT(*) FROM ativos WHERE id_Ativo = %s", (id_ativo_str,))
            result = cursor.fetchone() # Retorna um tuplo, ex: (1,) ou (0,)

            cursor.close()
            conn.close()

            # Se a contagem for 0, o ativo não existe.
            if not result or result[0] == 0:
                erros.append("O ID do ativo fornecido não foi encontrado na base de dados.")
                print("[Checkpoint 7] Erro: Ativo não encontrado")
            else:
                print("[Checkpoint 7] Ativo validado com sucesso.")
        except Exception as e:
            erros.append(f"Erro ao verificar o ativo na base de dados: {str(e)}")
            print("[Checkpoint 7] Erro de ligação ou consulta:", str(e))

    print("[Checkpoint Final] Validação concluída com", len(erros), "erro(s).")
    return erros
