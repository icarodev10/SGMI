import os
from dotenv import load_dotenv

# Carrega as variáveis do arquivo .env para a memória do Python
load_dotenv()

class Config:
    # --- Configurações do Flask ---
    # Busca no .env, se não achar, usa o valor padrão 'dev_key'
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev_key')
    DEBUG = False

    # --- Configurações do Broker MQTT ---
    MQTT_BROKER_URL = os.getenv('MQTT_URL')
    MQTT_BROKER_PORT = 8883
    MQTT_BROKER_CLIENT = os.getenv('MQTT_USER')
    MQTT_BROKER_PASSWORD = os.getenv('MQTT_PASSWORD')
    MQTT_TOPICS = [
        'Cypher/Temperatura', 'Cypher/Umidade', 'Cypher/Presenca',
        'Cypher/Vibracao', 'Cypher/Estoque', 'Cypher/Luminosidade'
    ]

    # --- Configurações do Banco de Dados MySQL ---
    MYSQL_HOST = os.getenv('MYSQL_HOST', 'localhost')
    MYSQL_PORT = 3306
    MYSQL_USER = os.getenv('MYSQL_USER', 'root')
    MYSQL_PASSWORD = os.getenv('MYSQL_PASSWORD', '')
    MYSQL_DB = os.getenv('MYSQL_DB', 'sgmi')

    # --- Configurações do Flask-Mail ---
    MAIL_SERVER = 'smtp.gmail.com'
    MAIL_PORT = 587
    MAIL_USE_TLS = True
    MAIL_USE_SSL = False
    MAIL_USERNAME = os.getenv('MAIL_USER')
    MAIL_PASSWORD = os.getenv('MAIL_PASS')
    MAIL_DEFAULT_SENDER = os.getenv('MAIL_USER')

    GEMINI_API_KEY = os.getenv('GEMINI_KEY')


class DevelopmentConfig(Config):
    DEBUG = True


class ProductionConfig(Config):
    DEBUG = False