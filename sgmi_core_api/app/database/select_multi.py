# select_multi.py
"""
Módulo responsável por operações de leitura (Read) complexas que envolvem
a junção (JOIN) de múltiplas tabelas na base de dados.
"""

from app.database.conectar import connect_db
from mysql.connector import Error

def generic_join_select(main_table, joins, columns='*', where=None, order_by=None, limit=None, database='sgmi'):
    """
    Executa uma consulta SELECT que une dinamicamente várias tabelas.

    Args:
        main_table (str): O nome da tabela principal (a cláusula FROM).
        joins (list): Uma lista de dicionários, onde cada um descreve um JOIN.
                      Ex: [{'table': 'outra_tabela', 'condition': 'tabela.id = outra_tabela.id'}]
        columns (str or list, optional): As colunas a serem retornadas. Padrão é '*'.
        where (dict, optional): Dicionário com as condições da cláusula WHERE.
        order_by (str, optional): String para a cláusula ORDER BY.
        limit (int, optional): Número máximo de registros a serem retornados.
        database (str, optional): O nome da base de dados. O padrão é 'sgmi'.

    Returns:
        list: Uma lista de dicionários com os registros encontrados.
              Retorna None em caso de erro.
    """
    connection = None
    cursor = None
    try:
        print(f"[Checkpoint] Conectando à base de dados: {database}")
        connection = connect_db(database)

        print("[Checkpoint] Criando cursor com dictionary=True")
        cursor = connection.cursor(dictionary=True)

        # --- Construção Dinâmica da Consulta SQL ---
        
        # Permite que as colunas sejam passadas como uma lista de strings,
        # o que é mais limpo e seguro do que uma única string longa.
        if isinstance(columns, list):
            columns = ", ".join(columns)
            
        # Inicia a consulta com a tabela principal.
        query = f"SELECT {columns} FROM {main_table}"

        # Adiciona as cláusulas JOIN à consulta.
        for join in joins:
            join_type = join.get("type", "INNER").upper() # Padrão é INNER JOIN se não especificado.
            join_table = join["table"]
            join_condition = join["condition"]
            print(f"[Checkpoint] Adicionando {join_type} JOIN com {join_table} ON {join_condition}")
            # ATENÇÃO: As condições de JOIN são injetadas diretamente. Garanta que
            # estes valores venham do backend e não diretamente de um usuário.
            query += f" {join_type} JOIN {join_table} ON {join_condition}"

        # Adiciona a cláusula WHERE de forma segura com placeholders.
        params = []
        if where:
            print("[Checkpoint] Adicionando cláusula WHERE")
            conditions = " AND ".join([f"{col} = %s" for col in where.keys()])
            params.extend(where.values())
            query += f" WHERE {conditions}"

        # Adiciona a cláusula ORDER BY.
        if order_by:
            print(f"[Checkpoint] Adicionando cláusula ORDER BY: {order_by}")
            query += " ORDER BY " + order_by

        # Adiciona a cláusula LIMIT de forma segura.
        if limit:
            print(f"[Checkpoint] Adicionando cláusula LIMIT: {limit}")
            query += " LIMIT %s"
            params.append(limit)

        print("[Checkpoint] Query final montada:", query)
        print("[Checkpoint] Parâmetros da consulta:", params)

        # Executa a consulta final.
        cursor.execute(query, params)
        results = cursor.fetchall()
        print("[Checkpoint] Registros retornados:", len(results))
        return results

    except Error as e:
        print("[Erro] Erro na execução da consulta com JOIN:", e)
        return None
    finally:
        # Garante que a conexão e o cursor sejam sempre fechados.
        if cursor is not None:
            print("[Checkpoint] Fechando cursor")
            cursor.close()
        if connection is not None and connection.is_connected():
            print("[Checkpoint] Fechando conexão com a base de dados")
            connection.close()

'''
# Exemplo de uso: buscar o nome do ativo em uma ordem de serviço.
joins = [
    {
        "table": "ativos",
        "condition": "ordens_servico.id_Ativo = ativos.id_Ativo"
    }
]

resultados_join = generic_join_select(
    main_table="ordens_servico",
    joins=joins,
    columns=["ordens_servico.id_Ordem", "ordens_servico.Descricao_Problema", "ativos.Nome_Ativo"],
    where={"ordens_servico.Status": "Aberta"},
    limit=5
)

if resultados_join:
    for registro in resultados_join:
        print(registro)
'''
