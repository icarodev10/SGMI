# validar_cadastro.py
"""
Módulo com as funções especialistas para validar os campos
do registro de um novo funcionário.

COM SUPORTE A EDIÇÃO PARCIAL (PATCH/PUT):
Se o payload contiver a cláusula 'where', o sistema entende que é uma
atualização e só valida os campos que foram enviados no JSON.
"""

import requests
import re

def _get_id_sendo_editado(dados):
    """Função auxiliar para pegar e converter o ID de forma segura."""
    clausula_where = dados.get("where", {})
    id_str = clausula_where.get("id_Cadastro")
    
    if id_str is not None:
        try:
            return int(id_str)
        except (ValueError, TypeError):
            print(f"[AVISO] id_Cadastro recebido ('{id_str}') não é um inteiro válido.")
            return None
    return None

def verificar_cpf_existente(dados, cursor):
    """Verifica se um CPF já existe na base de dados, ignorando o usuário atual em edição."""
    cpf = dados["data"].get("CPF", "")
    id_atual = _get_id_sendo_editado(dados)

    query = "SELECT id_Cadastro FROM cadastro_funcionario WHERE CPF = %s"
    params = [cpf]
    
    if id_atual is not None:
        query += " AND id_Cadastro != %s"
        params.append(id_atual)

    print(f"[DEBUG SQL] Query: {query}, Params: {params}")
    cursor.execute(query, tuple(params))
    resultado = cursor.fetchone()
    
    if resultado:
        return "CPF já cadastrado no sistema."
    return None

def verificar_login_existente(dados, cursor):
    """Verifica se um Login já existe na base de dados, ignorando o usuário atual em edição."""
    login = dados["data"].get("Login", "")
    id_atual = _get_id_sendo_editado(dados)

    query = "SELECT id_Cadastro FROM cadastro_funcionario WHERE Login = %s"
    params = [login]
    if id_atual is not None:
        query += " AND id_Cadastro != %s"
        params.append(id_atual)

    cursor.execute(query, tuple(params))
    resultado = cursor.fetchone()
    
    if resultado:
        return "Este nome de login já está em uso."
    return None

def validar_cpf(dados, token, cursor):
    """Valida o formato do CPF via API e a sua unicidade na base de dados."""
    print("[Checkpoint] Iniciando validação de CPF...")
    
    is_update = "where" in dados
    # Tenta pegar o CPF. Se não vier no JSON, retorna None
    cpf = dados["data"].get("CPF")

    # --- LÓGICA DE UPDATE PARCIAL ---
    # Se for update e a chave CPF não foi enviada, ignora validação
    if is_update and cpf is None:
        return {"valid": True}

    # Garante que é string para validação
    cpf = str(cpf or "").strip()

    if not cpf:
        return {"valid": False, "message": "CPF não fornecido"}

    # Passo 1: Valida o formato com a API externa.
    url = "https://api.invertexto.com/v1/validator"
    params = {"token": token, "value": cpf, "type": "cpf"}
    try:
        response = requests.get(url, params=params)
        response.raise_for_status()
        data = response.json()
        
        if not data.get("valid"):
            return {"valid": False, "message": "CPF inválido."}

        # Passo 2: Se o formato for válido, verifica se já existe na base de dados.
        erro_duplicado = verificar_cpf_existente(dados, cursor)
        if erro_duplicado:
            return {"valid": False, "message": erro_duplicado}

        return {"valid": True, "message": "CPF válido.", "formatted": data.get("formatted")}

    except requests.exceptions.RequestException as err:
        print("[Erro na requisição de CPF]", err)
        return {"valid": False, "message": "Serviço de validação de CPF indisponível."}

def validar_email(dados, token, cursor):
    """Valida um e-mail (unicidade, formato e MX)."""
    print("[Checkpoint] Iniciando validação de e-mail...")
    
    is_update = "where" in dados
    email = dados["data"].get("Email")

    # --- LÓGICA DE UPDATE PARCIAL ---
    if is_update and email is None:
        return {"valid": True}

    email = str(email or "").strip()
    # Atualiza o dado limpo no dicionário para a verificação de existência usar
    dados["data"]["Email"] = email

    # Passo 1: Validação de unicidade na base de dados.
    query = "SELECT id_Cadastro FROM cadastro_funcionario WHERE Email = %s"
    params = [email]
    id_atual = _get_id_sendo_editado(dados)
    if id_atual is not None:
        query += " AND id_Cadastro != %s"
        params.append(id_atual)
    
    cursor.execute(query, tuple(params))
    resultado = cursor.fetchone()
    if resultado:
        return {"valid": False, "message": "E-mail já existe no sistema."}

    # Passo 2: Validação externa de formato e MX.
    url = f"https://api.invertexto.com/v1/email-validator/{email}"
    params = {"token": token}
    try:
        response = requests.get(url, params=params)
        response.raise_for_status()
        data = response.json()

        if data.get("valid_format") and data.get("valid_mx") and not data.get("disposable"):
            return {"valid": True, "message": "E-mail válido."}
        else:
            return {"valid": False, "message": "E-mail inválido ou não possui MX válido."}

    except requests.exceptions.RequestException as err:
        print("[Erro na requisição de e-mail]", err)
        return {"valid": False, "message": "Erro na validação do e-mail externo."}

def validar_senha(dados):
    """Valida a senha. Obrigatória apenas na criação de um novo usuário."""
    senha = dados["data"].get("Senha", "")
    is_update = "where" in dados 
    if not senha and not is_update:
        return False
    return True

def validar_cep(dados):
    """Valida um CEP (Código Postal) utilizando a BrasilAPI."""
    # Tenta pegar o CEP
    cep = dados.get("data", {}).get("CEP")
    
    # --- CORREÇÃO AQUI ---
    # Se for update e não mandou CEP, retorna um dicionário PREENCHIDO
    # Dicionário preenchido = True no Python.
    if "where" in dados and cep is None:
        return {"ignorado": True} 

    # Se mandou o CEP, limpa e valida
    cep = str(cep or "").strip()
    
    # Se CEP vazio ou formato errado
    if not cep or len(cep) != 8 or not cep.isdigit():
        return {} # Retorna vazio (False) para indicar erro
        
    url = f"https://brasilapi.com.br/api/cep/v1/{cep}"
    try:
        response = requests.get(url, timeout=5)
        response.raise_for_status()
        data = response.json()
        # Retorna os dados da API (True) ou vazio se tiver erros (False)
        return data if 'errors' not in data else {}
    except requests.exceptions.RequestException:
        return {} # Erro na API conta como falha

def validar_cadastro_geral(dados, cursor):
    """
    Valida os campos gerais do formulário e a unicidade do Login.
    Suporta Validação Parcial: Se for UPDATE, só valida os campos presentes.
    """
    print("[Checkpoint] Iniciando validação geral de cadastro...")
    erros = []
    
    # Detecta se é uma ATUALIZAÇÃO (tem cláusula WHERE)
    is_update = "where" in dados
    
    # Dicionário com os dados recebidos
    data_payload = dados.get("data", {})

    # --- 1. LOGIN (Regra Especial) ---
    # Só valida unicidade se o usuário mandou um Login novo
    if "Login" in data_payload:
        erro_login = verificar_login_existente(dados, cursor)
        if erro_login:
            erros.append(erro_login)
        
        # Validação de formato
        login = str(data_payload.get("Login", "")).strip()
        if not login:
            erros.append("Login é obrigatório")
        elif len(login) > 45:
            erros.append("Login excede o tamanho máximo de 45 caracteres.")
    elif not is_update:
        # Se for cadastro novo e não mandou login, erro.
        erros.append("Login é obrigatório")


    # --- 2. VALIDAÇÃO CONDICIONAL DOS OUTROS CAMPOS ---
    
    def validar_campo(nome_campo, regex, msg_obrigatorio, msg_invalido):
        """Helper para validar campo somente se necessário"""
        # Se for update e o campo NÃO veio no JSON, ignora (não valida)
        if is_update and nome_campo not in data_payload:
            return

        # Pega o valor (se não veio no insert, pega vazio)
        valor = data_payload.get(nome_campo)
        valor_str = str(valor).strip() if valor is not None else ""

        if not valor_str:
            erros.append(msg_obrigatorio)
        elif regex and not re.match(regex, valor_str):
            erros.append(msg_invalido)

    # Aplica a lógica para cada campo
    validar_campo("Nome", r'^[A-Za-zÀ-ÖØ-öø-ÿ\s]{2,100}$', "Nome é obrigatório.", "Nome com padrão inválido")
    validar_campo("Telefone", r'^[0-9\-\+\(\)\s]*$', "Telefone é obrigatório", "Telefone contém caracteres inválidos.")
    validar_campo("Sexo", r'^(Masculino|Feminino)$', "Sexo é obrigatório", "Sexo inválido")
    
    # Data Nascimento
    validar_campo("Data_Nascimento", r'\d{4}-\d{2}-\d{2}$', "Data de nascimento é obrigatória", "Data de nascimento inválida")
    
    # Cargo
    validar_campo("Cargo", r'^[A-Za-zÀ-ÖØ-öø-ÿ\s.-]{2,50}$', "Cargo do funcionário é obrigatório.", "Cargo com padrão inválido.")
    
    # Departamento
    validar_campo("Departamento", r'^[A-Za-zÀ-ÖØ-öø-ÿ\s.]{2,50}$', "Departamento é obrigatório", "Departamento com padrão inválido.")
    
    # Admissão
    validar_campo("Data_Admissao", r'\d{4}-\d{2}-\d{2}$', "Data de Admissão é obrigatória", "Data de admissão inválida.")

    print("[Checkpoint] Erros encontrados na validação geral:", erros)
    return erros