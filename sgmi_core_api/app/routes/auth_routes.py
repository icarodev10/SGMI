from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash

# Imports ajustados para a nova estrutura de pastas
from app.services.login import processar_login

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

