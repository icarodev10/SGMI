from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash

# Imports ajustados para a nova estrutura de pastas
from app.services.login import processar_login
from app.services.email_utils import gerar_senha, enviar_email_empresa
from app.services.processamento import processar_dados
from app.database.inserir import generic_insert

bp = Blueprint('auth', __name__)

# -----------------------------------------------------------------------------
# ROTA DE LOGIN
# -----------------------------------------------------------------------------
@bp.route('/login', methods=['POST'])
def login():
    """
    Recebe usuario e senha, verifica no banco e retorna token/sucesso.
    """
    data = request.get_json()
    return processar_login(data)

# -----------------------------------------------------------------------------
# ROTA DE CADASTRO ESPECÍFICA DO SGMI
# -----------------------------------------------------------------------------
@bp.route("/cadastrar_empresa", methods=["POST"])
def cadastrar_empresa_publico():
    """
    Cadastro simplificado direto para o banco SGMI.
    """
    try:
        # 1. Pegar dados
        nome = request.form.get("nome")
        cnpj = request.form.get("cnpj")
        email = request.form.get("email")
        telefone = request.form.get("telefone")

        # 2. Gerar Senha
        senha_plana = gerar_senha()
        senha_hash = generate_password_hash(senha_plana)

        # AQUI ESTÁ O PULO DO GATO: database="sgmi"
        # Essa é a rota que importa pro seu projeto atual.
        dados_para_inserir = {
            "table": "empresas",
            "database": "sgmi",
            "data": {
                "Nome": nome,
                "CNPJ": cnpj,
                "Email": email,
                "Telefone": telefone,
                "Senha": senha_hash 
            }
        }

        # 3. Salvar no Banco
        resultado_db = processar_dados("POST", dados_para_inserir)
        print(f"[Auth] Resultado do banco: {resultado_db}")

        sucesso_banco = (resultado_db.get("status") == "sucesso") or (resultado_db.get("inserted_id") is not None)

        if sucesso_banco:
            # 4. Tentar enviar E-mail
            try:
                print(f"[Auth] Tentando enviar email para {email}...")
                enviou_email = enviar_email_empresa(email, email, senha_plana, nome)
            except Exception as e_email:
                print(f"[Erro Email] Falha ao enviar: {e_email}")
                enviou_email = False

            if enviou_email:
                return jsonify({"status": "sucesso", "mensagem": "Cadastro realizado! Senha enviada por e-mail."}), 201
            else:
                msg_aviso = f"Empresa cadastrada (ID {resultado_db.get('inserted_id')}), mas o e-mail falhou. Sua senha provisória: {senha_plana}"
                return jsonify({"status": "sucesso", "mensagem": msg_aviso}), 201
        
        else:
            print("[Auth] Banco recusou a inserção.")
            return jsonify(resultado_db), 400

    except Exception as e:
        print(f"[Erro Fatal] {e}")
        return jsonify({"status": "erro", "mensagem": str(e)}), 500