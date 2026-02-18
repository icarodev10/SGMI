# deletar.py
"""
Módulo responsável pela operação de exclusão (Delete) na base de dados.

Contém uma função genérica que pode ser reutilizada para apagar registros
de qualquer tabela do sistema de forma segura.
"""

from app.database.conectar import connect_db
from mysql.connector import Error

def generic_delete(table, where, database='sgmi'):
    """
    Remove um ou mais registros da tabela especificada com base numa condição.

    Args:
        table (str): O nome da tabela de onde os registros serão apagados.
        where (dict): Um dicionário com as condições da cláusula WHERE para identificar os registros.
        database (str, optional): O nome da base de dados. O padrão é 'sgmi'.

    Returns:
        dict: Um dicionário com o número de linhas afetadas ('affected_rows')
              em caso de sucesso, ou uma mensagem de erro ('error').
    """
    print(f"[Checkpoint] Iniciando DELETE na tabela '{table}' com condição: {where}")

    connection = None
    cursor = None
    try:
        # Estabelece a ligação com a base de dados.
        connection = connect_db(database)
        if connection is None:
            print("[Erro] Ligação com a base de dados falhou.")
            return {"error": "Falha na ligação com a base de dados"}

        cursor = connection.cursor()

        # --- Construção Dinâmica da Consulta SQL ---
        # Cria a parte "WHERE" da consulta. Ex: "id_Peca = %s AND Fornecedor = %s"
        where_clause = " AND ".join([f"{col} = %s" for col in where.keys()])
        
        # Monta a consulta DELETE completa.
        query = f"DELETE FROM {table} WHERE {where_clause}"
        
        # Extrai os valores do dicionário 'where' para uma lista.
        values = list(where.values())

        print(f"[Checkpoint] A executar consulta: {query}")
        print(f"[Checkpoint] Com valores: {values}")

        # Executa a consulta de forma segura.
        cursor.execute(query, values)
        # Confirma a transação, apagando permanentemente os registros.
        connection.commit()

        # `rowcount` retorna o número de linhas que foram afetadas (apagadas).
        if cursor.rowcount > 0:
            print(f"[Sucesso] Linhas afetadas: {cursor.rowcount}")
            return {"affected_rows": cursor.rowcount}
        else:
            # Se rowcount for 0, significa que a condição WHERE não encontrou nenhum registro.
            print("[Aviso] Nenhum registro encontrado para excluir com a condição fornecida.")
            return {"message": "Nenhum registro encontrado para excluir", "affected_rows": 0}

    except Error as e:
        # Captura qualquer erro da base de dados.
        print(f"[Erro] Erro no DELETE: {e}")
        # Em caso de erro, é uma boa prática desfazer a transação.
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
