from flask import jsonify
from werkzeug.security import check_password_hash
import mysql.connector

# CORREÇÃO CRÍTICA: Importando do caminho absoluto
from app.database.conectar import connect_db

def processar_login(dados):
    """
    Recebe os dados do formulário de login (Email/Senha) 
    e verifica nas tabelas de 'cadastro_funcionario' e 'empresas'.
    """
    # .strip() remove espaços antes e depois (caso tenha copiado errado do email)
    email = str(dados.get("Email", "")).strip()
    senha = str(dados.get("Senha", "")).strip()

    print(f"\n--- [DEBUG LOGIN] Tentativa para: {email} ---")
    # print(f"--- [DEBUG LOGIN] Senha digitada: {senha}") # Evite printar senha em produção!

    if not (email and senha):
        return jsonify({'error': 'Email e senha são obrigatórios.'}), 400

    connection = None
    cursor = None
    try:
        connection = connect_db()
        cursor = connection.cursor(dictionary=True, buffered=True)

        # ---------------------------------------------------------
        # 1. TENTA COMO FUNCIONÁRIO
        # ---------------------------------------------------------
        cursor.execute("SELECT * FROM cadastro_funcionario WHERE Email = %s", (email,))
        funcionario = cursor.fetchone()

        if funcionario:
            print("--- [DEBUG] Encontrado na tabela FUNCIONÁRIOS")
            hash_banco = funcionario.get('Senha', '')
            
            # Verifica se a senha bate com o hash
            if check_password_hash(hash_banco, senha):
                print("--- [DEBUG] SENHA OK (Funcionário)!")
                return jsonify({
                    'message': "Login realizado com sucesso!",
                    'Tipo_Usuario': funcionario.get('Tipo_Usuario'),
                    'Id': funcionario.get('id_Cadastro'),
                    'Nome': funcionario.get('Nome'),
                    # O redirect geralmente é decidido pelo front, mas mantive aqui
                    'redirect': '../View/home.html' 
                }), 200
            else:
                print("--- [DEBUG] SENHA INCORRETA (Funcionário)")
                return jsonify({'error': 'Senha incorreta.'}), 401

        # ---------------------------------------------------------
        # 2. TENTA COMO EMPRESA
        # ---------------------------------------------------------
        cursor.execute("SELECT * FROM empresas WHERE Email = %s", (email,))
        empresa = cursor.fetchone()

        if empresa:
            print(f"--- [DEBUG] Encontrado na tabela EMPRESAS (ID: {empresa.get('id_Empresa')})")
            hash_banco = empresa.get('Senha', '')
            
            # Testa a senha
            senha_valida = check_password_hash(hash_banco, senha)
            
            if senha_valida:
                print("--- [DEBUG] SENHA OK (Empresa)!")
                return jsonify({
                    'message': "Login realizado com sucesso!",
                    'Tipo_Usuario': 'empresa', 
                    'Id': empresa.get('id_Empresa'),
                    'Nome': empresa.get('Nome'),
                    'CNPJ': empresa.get('CNPJ'),
                    'redirect': '../View/home.html' 
                }), 200
            else:
                print("--- [DEBUG] SENHA INCORRETA (Empresa)")
                return jsonify({'error': 'Senha incorreta.'}), 401

        # ---------------------------------------------------------
        # NÃO ACHOU EM LUGAR NENHUM
        # ---------------------------------------------------------
        print("--- [DEBUG] Email não encontrado em nenhuma tabela.")
        return jsonify({'error': 'Usuário não encontrado.'}), 401

    except mysql.connector.Error as err:
        print(f"[LOGIN] Erro DB: {err}")
        return jsonify({'error': str(err)}), 500
    except Exception as e:
        print(f"[LOGIN] Erro Geral: {e}")
        return jsonify({'error': 'Erro interno no servidor.'}), 500
    finally:
        if cursor: cursor.close()
        if connection and connection.is_connected(): connection.close()