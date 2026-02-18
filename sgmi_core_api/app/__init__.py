from flask import Flask
from flask_mail import Mail
from flask_cors import CORS
from .utils.config import DevelopmentConfig
from .services.email_utils import set_mail
from .services.gestor_mqtt import init_mqtt

# Importamos apenas o "Pai" das rotas
from .routes import main_bp 

def create_app():
    app = Flask(__name__)
    app.config.from_object(DevelopmentConfig) 

    CORS(app)
    mail = Mail(app)
    set_mail(mail)
    init_mqtt(app)

    # REGISTRO SIMPLIFICADO: Registra o pai e todos os filhos vêm junto
    app.register_blueprint(main_bp)

    return app