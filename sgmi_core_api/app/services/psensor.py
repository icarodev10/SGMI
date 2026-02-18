"""
Módulo responsável pelas operações de CRUD (Create, Read, Delete)
na tabela 'dados_sensores'.
"""

# CORREÇÃO: Importando do lugar certo
from app.database.conectar import connect_db

def inserir_dados(topico, valor):
    """
    Insere um novo registro de dados de sensor na tabela 'dados_sensores'.
    """
    print(f"[PSensor] Inserindo dados: Tópico={topico}, Valor={valor}")
    conn = None
    cursor = None
    try:
        conn = connect_db()
        cursor = conn.cursor()
        
        sql = "INSERT INTO dados_sensores (topico, valor) VALUES (%s, %s)"
        cursor.execute(sql, (topico, valor))
        conn.commit()
        
        print("[PSensor] Sucesso!")
        return {'status': 'dado inserido'}

    except Exception as e:
        print(f"[PSensor] Erro: {str(e)}")
        if conn:
            conn.rollback()
        return {'erro': str(e)}

    finally:
        if cursor:
            cursor.close()
        if conn and conn.is_connected():
            conn.close()