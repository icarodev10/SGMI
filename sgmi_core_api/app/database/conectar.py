# conectar.py
"""
Módulo utilitário para gerir a ligação à base de dados.

Este arquivo centraliza a lógica de ligação ao MySQL, garantindo que
todas as partes da aplicação se ligam da mesma forma e utilizando as
configurações corretas carregadas pela aplicação Flask.
"""

from flask import current_app
import mysql.connector

def connect_db(database="sgmi"):
    """
    Estabelece e retorna uma ligação com a base de dados MySQL.

    Utiliza as configurações definidas no arquivo config.py e carregadas
    na instância da aplicação Flask (`current_app`).

    Args:
        database (str, optional): O nome da base de dados a ligar. O padrão é 'sgmi'.

    Returns:
        mysql.connector.connection_cext.CMySQLConnection: Um objeto de ligação
        ativo em caso de sucesso, ou None em caso de falha.
    """
    print(f"[Checkpoint] Iniciando ligação com a base de dados '{database}'...")
    
    # `current_app` é um proxy do Flask que aponta para a aplicação que está a tratar o pedido.
    # `current_app.config` dá acesso a todas as variáveis de configuração (ex: SECRET_KEY, MYSQL_HOST).
    cfg = current_app.config
    print("[Checkpoint] Configurações de ligação lidas da config.py:", {
        "host": cfg.get('MYSQL_HOST'),
        "port": cfg.get('MYSQL_PORT'),
        "user": cfg.get('MYSQL_USER'),
        "database": cfg.get('MYSQL_DB')
    })

    try:
        # Tenta estabelecer a ligação usando as credenciais do arquivo de configuração.
        connection = mysql.connector.connect(
            host     = cfg['MYSQL_HOST'],
            port     = cfg['MYSQL_PORT'],
            user     = cfg['MYSQL_USER'],
            password = cfg['MYSQL_PASSWORD'],
            database = database
        )
        print("[Sucesso] Ligação com a base de dados estabelecida.")
        return connection
    except mysql.connector.Error as err:
        # Se ocorrer um erro durante a tentativa de ligação (ex: palavra-passe errada, servidor offline),
        # captura a exceção.
        print("[Erro] Falha ao ligar à base de dados:", err)
        # Retorna None para indicar que a ligação falhou.
        return None
