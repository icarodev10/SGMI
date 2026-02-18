from flask import Blueprint

# 1. Importa os Blueprints de cada arquivo
from .auth_routes import bp as auth_bp
from .dashboard_routes import bp as dashboard_bp
from .operational_routes import bp as operational_bp
from .core_routes import bp as core_bp

# 2. Cria um Blueprint "Pai" (o mestre de todos)
main_bp = Blueprint('main', __name__)

# 3. Registra os "filhos" dentro do pai
main_bp.register_blueprint(auth_bp)
main_bp.register_blueprint(dashboard_bp)
main_bp.register_blueprint(operational_bp)
main_bp.register_blueprint(core_bp)