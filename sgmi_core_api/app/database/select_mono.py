# select_mono.py
"""
Módulo responsável pela operação de leitura (Read) na base de dados.

Contém uma função genérica e flexível que pode ser reutilizada para executar
consultas SELECT em qualquer tabela, com suporte para filtros, ordenação e limites.
"""

from app.database.conectar import connect_db
from mysql.connector import Error

def generic_select(table, columns='*', where=None, order_by=None, limit=None, database='sgmi'):
    """
    Executa uma consulta SELECT genérica em uma tabela específica.

    Args:
        table (str): O nome da tabela a ser consultada.
        columns (str, optional): As colunas a serem retornadas (ex: "id, nome"). Padrão é '*'.
        where (dict, optional): Dicionário com as condições da cláusula WHERE (ex: {"id": 1}).
        order_by (str, optional): String para a cláusula ORDER BY (ex: "nome ASC").
        limit (int, optional): Número máximo de registros a serem retornados.
        database (str, optional): O nome da base de dados. O padrão é 'sgmi'.

    Returns:
        list: Uma lista de dicionários, onde cada dicionário é um registro.
              Retorna None em caso de erro.
    """
    connection = None
    cursor = None
    try:
        print(f"[Checkpoint] Conectando à base de dados: {database}")
        connection = connect_db(database)

        # 'dictionary=True' faz com que os resultados venham como dicionários,
        # o que é ideal para converter para JSON no frontend.
        print("[Checkpoint] Criando cursor em modo dicionário")
        cursor = connection.cursor(dictionary=True)

        # --- Construção Dinâmica da Consulta SQL ---
        query = f"SELECT {columns} FROM {table}"
        params = [] # Lista para armazenar os valores dos placeholders de forma segura.

        # Adiciona a cláusula WHERE se um dicionário de condições for fornecido.
        if where:
            print("[Checkpoint] Adicionando cláusula WHERE")
            conditions = []
            for col, val in where.items():
                conditions.append(f"{col} = %s")
                params.append(val)
            # Junta as condições com "AND". Ex: "id = %s AND status = %s"
            query += " WHERE " + " AND ".join(conditions)

        # Adiciona a cláusula ORDER BY se for fornecida.
        if order_by:
            print(f"[Checkpoint] Adicionando cláusula ORDER BY: {order_by}")
            # ATENÇÃO: order_by é injetado diretamente. Garanta que este valor
            # não venha diretamente de um usuário sem validação para evitar SQL Injection.
            query += " ORDER BY " + order_by

        # Adiciona a cláusula LIMIT se for fornecida.
        if limit:
            print(f"[Checkpoint] Adicionando cláusula LIMIT: {limit}")
            query += " LIMIT %s"
            params.append(limit)

        print(f"[Checkpoint] Query final montada: {query}")
        print(f"[Checkpoint] Parâmetros: {params}")

        # Executa a consulta com os parâmetros de forma segura.
        cursor.execute(query, params)
        # Pega todos os resultados da consulta.
        results = cursor.fetchall()

        print(f"[Checkpoint] Número de registros retornados: {len(results)}")
        return results

    except Error as e:
        print(f"[Erro] Erro na execução da consulta: {e}")
        return None # Retorna None para indicar que a operação falhou.

    finally:
        # Garante que a conexão e o cursor sejam sempre fechados.
        if cursor is not None:
            print("[Checkpoint] Fechando cursor")
            cursor.close()
        if connection is not None and connection.is_connected():
            print("[Checkpoint] Encerrando conexão com a base de dados")
            connection.close()

'''
# Exemplo de uso:
resultados = generic_select(
    table='cadastro_funcionario', 
    columns='id_Cadastro, Nome, Email', 
    where={'Tipo_Usuario': 'Administrador'},
    order_by='Nome ASC',
    limit=10,
    database='sgmi'
)
if resultados is not None:
    for registro in resultados:
        print(registro)
'''
