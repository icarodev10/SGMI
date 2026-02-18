# atualizar.py
"""
Módulo responsável pela operação de atualização (Update) na base de dados.

Contém uma função genérica que pode ser reutilizada para atualizar registros
em qualquer tabela do sistema de forma segura e flexível.
"""

from app.database.conectar import connect_db
from mysql.connector import Error

def generic_update(table, data, where, database='sgmi'):
    """
    Atualiza um ou mais registros na tabela especificada.

    Args:
        table (str): O nome da tabela a ser atualizada.
        data (dict): Um dicionário com as colunas a serem atualizadas e os seus novos valores.
        where (dict): Um dicionário com as condições da cláusula WHERE para identificar os registros.
        database (str, optional): O nome da base de dados. O padrão é 'sgmi'.

    Returns:
        dict: Um dicionário com o número de linhas afetadas ('affected_rows')
              em caso de sucesso, ou uma mensagem de erro ('error').
    """
    print(f"[Checkpoint] Iniciando UPDATE na tabela '{table}'")
    print(f"[Checkpoint] Novos dados: {data}")
    print(f"[Checkpoint] Condição WHERE: {where}")

    connection = None
    cursor = None
    try:
        connection = connect_db(database)
        if connection is None:
            print("[Erro] Ligação com a base de dados falhou.")
            return {"error": "Falha na ligação com a base de dados"}

        cursor = connection.cursor()
        
        # --- Construção Dinâmica da Consulta SQL ---
        # Cria a parte "SET" da consulta. Ex: "Nome = %s, Estoque = %s"
        set_clause = ", ".join([f"{col} = %s" for col in data.keys()])
        
        # Cria a parte "WHERE" da consulta. Ex: "id_Peca = %s AND Fornecedor = %s"
        where_clause = " AND ".join([f"{col} = %s" for col in where.keys()])
        
        # Monta a consulta UPDATE completa.
        query = f"UPDATE {table} SET {set_clause} WHERE {where_clause}"
        
        # Cria a lista de valores na ordem correta: primeiro os valores do SET, depois os do WHERE.
        values = list(data.values()) + list(where.values())

        print(f"[Checkpoint] A executar consulta: {query}")
        print(f"[Checkpoint] Com valores: {values}")

        # Executa a consulta de forma segura.
        cursor.execute(query, values)
        # Confirma a transação.
        connection.commit()

        # `rowcount` retorna o número de linhas que foram modificadas pela consulta.
        print(f"[Sucesso] Linhas afetadas: {cursor.rowcount}")
        return {"affected_rows": cursor.rowcount}

    except Error as e:
        # Captura qualquer erro da base de dados.
        print("[Erro] Erro no UPDATE:", e)
        # Se ocorrer um erro, é uma boa prática desfazer a transação.
        if connection and connection.is_connected():
            connection.rollback()
        return {"error": str(e)}
    
    finally:
        # Garante que a ligação e o cursor sejam sempre fechados.
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()
            print("[Checkpoint] Ligação com a base de dados encerrada.")
