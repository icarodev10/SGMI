import re

def validar_empresa(dados):
    print("Teste Dados", dados)

    empresa = dados["data"]  # usa somente os dados certos

    # Nome
    if not empresa.get("Nome") or len(empresa["Nome"].strip()) < 3:
        return "Nome da empresa inválido."

    # CNPJ: 14 números
    cnpj = re.sub(r"\D", "", empresa.get("CNPJ", ""))
    if len(cnpj) != 14:
        return "CNPJ inválido. Deve conter 14 números."

    # Email
    regex_email = r"^[^@\s]+@[^@\s]+\.[^@\s]+$"
    if not re.match(regex_email, empresa.get("Email", "")):
        return "E-mail inválido."

    # Telefone: mínimo 10 números
    telefone = re.sub(r"\D", "", empresa.get("Telefone", ""))
    if len(telefone) < 10:
        return "Telefone inválido."

    return None  # Sem erros
