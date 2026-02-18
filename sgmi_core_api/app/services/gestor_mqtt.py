"""
Módulo responsável por gerenciar a comunicação em tempo real com sensores
via protocolo MQTT.
"""

import paho.mqtt.client as paho
from paho import mqtt

# --- CORREÇÃO DE IMPORT ---
# O psensor.py deve estar na mesma pasta (services), então importamos do pacote.
try:
    from app.services.psensor import inserir_dados
except ImportError:
    # Fallback caso o psensor.py ainda não tenha sido arrumado
    print("[AVISO] psensor.py não encontrado. O MQTT receberá mensagens mas não salvará no banco.")
    def inserir_dados(topico, payload):
        print(f"[Simulação] Salvando {payload} do tópico {topico}")
        return True

# Instância global do cliente MQTT
mqtt_client = paho.Client(client_id="", protocol=paho.MQTTv5)

def init_mqtt(app):
    """
    Inicializa e configura o cliente MQTT usando as configs do Flask.
    """
    # Verifica se as configurações existem antes de tentar conectar
    if not app.config.get('MQTT_BROKER_URL'):
        print("[MQTT] Configurações de Broker não encontradas. Pulando inicialização.")
        return

    print("[MQTT] Inicializando cliente MQTT...")

    mqtt_client.user_data_set(app)

    # Callbacks
    mqtt_client.on_connect = _on_connect
    mqtt_client.on_message = _on_message
    mqtt_client.on_publish = _on_publish
    mqtt_client.on_subscribe = _on_subscribe

    broker = app.config['MQTT_BROKER_URL']
    port   = app.config.get('MQTT_BROKER_PORT', 1883)
    client = app.config.get('MQTT_BROKER_CLIENT')
    passwd = app.config.get('MQTT_BROKER_PASSWORD')

    print(f"[MQTT] Conectando ao broker {broker}:{port}...")

    # Configura TLS/Auth apenas se houver usuário/senha
    if client and passwd:
        mqtt_client.tls_set(tls_version=mqtt.client.ssl.PROTOCOL_TLS)
        mqtt_client.username_pw_set(client, passwd)

    try:
        mqtt_client.connect(broker, int(port), keepalive=60)
        mqtt_client.loop_start() # Inicia o loop em uma thread separada
    except Exception as e:
        print(f"[MQTT] Erro ao conectar: {e}")

def _on_connect(client, userdata, flags, rc, properties=None):
    """Callback de conexão."""
    app = userdata
    if rc == 0:
        print(f"[MQTT] Conectado com sucesso!")
        # Inscreve nos tópicos
        topics = app.config.get('MQTT_TOPICS', [])
        for topic in topics:
            client.subscribe(topic)
            print(f"[MQTT] Inscrevendo no tópico: {topic}")
    else:
        print(f"[MQTT] Falha na conexão. Código: {rc}")

def _on_message(client, userdata, msg):
    """Callback de mensagem recebida."""
    app = userdata
    try:
        payload = msg.payload.decode()
        topico = msg.topic
        print(f"[MQTT] Recebido de '{topico}': {payload}")

        # Cria contexto para acessar o banco de dados
        with app.app_context():
            inserir_dados(topico, payload)
            
    except Exception as e:
        print(f"[MQTT] Erro ao processar mensagem: {e}")

def _on_publish(client, userdata, mid, properties=None):
    pass # Silencioso para não poluir log

def _on_subscribe(client, userdata, mid, granted_qos, properties=None):
    pass # Silencioso