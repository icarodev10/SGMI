# inserir.py
"""
Módulo responsável pela operação de inserção (Create) na base de dados.

Contém uma função genérica que pode ser reutilizada para inserir registros
em qualquer tabela do sistema de forma segura.
"""

from app.database.conectar import connect_db
from mysql.connector import Error

def generic_insert(table, data, database='sgmi'):
    """
    Insere um registro na tabela especificada de forma dinâmica e segura.

    Args:
        table (str): O nome da tabela onde os dados serão inseridos.
        data (dict): Um dicionário onde as chaves são os nomes das colunas
                     e os valores são os dados a serem inseridos.
        database (str, optional): O nome da base de dados. O padrão é 'sgmi'.

    Returns:
        dict: Um dicionário contendo o ID do registro inserido ('inserted_id')
              em caso de sucesso, ou uma mensagem de erro ('error').
    """
    print(f"[Checkpoint] Tentando conectar à base de dados '{database}'...")
    connection = connect_db(database)

    if connection is None:
        print("[Erro] Falha na ligação com a base de dados.")
        return {"error": "Não foi possível ligar à base de dados."}

    cursor = None
    try:
        cursor = connection.cursor()
        print(f"[Checkpoint] Ligado com sucesso. A preparar INSERT na tabela '{table}'...")
        
        # --- Construção Dinâmica da Consulta SQL ---
        # Pega nos nomes das colunas a partir das chaves do dicionário.
        columns = ", ".join(data.keys())
        # Cria um placeholder '%s' para cada valor, para uma inserção segura.
        placeholders = ", ".join(["%s"] * len(data))
        # Monta a consulta SQL final.
        query = f"INSERT INTO {table} ({columns}) VALUES ({placeholders})"
        
        # Extrai os valores do dicionário para uma lista, na ordem correta.
        values = list(data.values())

        print(f"[Checkpoint] A executar consulta: {query}")
        print(f"[Checkpoint] Com valores: {values}")

        # Executa a consulta, passando os valores de forma segura para evitar SQL Injection.
        cursor.execute(query, values)
        # Confirma (grava permanentemente) a transação na base de dados.
        connection.commit()

        # `lastrowid` retorna o ID auto-incrementado do registro que acabámos de inserir.
        print(f"[Sucesso] registro inserido com ID: {cursor.lastrowid}")
        return {"inserted_id": cursor.lastrowid}
    
    except Error as e:
        # Se ocorrer um erro durante a operação da base de dados, captura-o.
        print("[Erro] Ocorreu um erro durante o INSERT:", e)
        # Opcional: Se a transação falhou, podemos fazer um rollback.
        # if connection.is_connected():
        #     connection.rollback()
        return {"error": str(e)}
    
    finally:
        # Este bloco é executado sempre, garantindo que os recursos são libertados.
        if cursor:
            cursor.close()
            print("[Checkpoint] Cursor fechado.")
        if connection and connection.is_connected():
            connection.close()
            print("[Checkpoint] Ligação com a base de dados encerrada.")


# Sua nova função para buscar os e-mails
def get_gestores_emails():
    """Busca a lista de e-mails de todos os gestores no banco de dados."""
    try:
        conn = connect_db()
        cursor = conn.cursor()
        
        # Consulta SQL CORRETA para sua tabela
        cursor.execute("SELECT Email FROM cadastro_funcionario WHERE Tipo_Usuario = 'Gestor'")
        emails = cursor.fetchall()
        
        # Converte a tupla de resultados em uma lista de strings
        email_list = [email[0] for email in emails]
        
        cursor.close()
        conn.close()
        return email_list
        
    except Exception as e:
        print(f"Erro ao buscar e-mails dos gestores: {e}")
        return []
