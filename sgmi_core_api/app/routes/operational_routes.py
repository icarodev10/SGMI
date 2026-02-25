from flask import Blueprint, request, jsonify, make_response, send_file
from decimal import Decimal
from datetime import datetime, date, timedelta
import os
import base64
import smtplib
from email.message import EmailMessage
import requests

# Imports internos da nova estrutura
from app.database.conectar import connect_db
from app.database.select_mono import generic_select
from app.database.select_multi import generic_join_select
from app.services.processamento import processar_dados
from app.services.email_utils import enviar_email_funcionario, enviar_email_solicitacao
from app.database.inserir import generic_insert
from app.database.deletar import generic_delete
from app.database.atualizar import generic_update

bp = Blueprint('operational', __name__)

# -----------------------------------------------------------------------------
# FUNÇÕES AUXILIARES
# -----------------------------------------------------------------------------

def preparar_para_json(dados):
    """
    Percorre a lista de dados e converte tipos incompatíveis com JSON
    (bytes, date, datetime, decimal) para string.
    """
    if not dados:
        return []
    
    for item in dados:
        for key, value in item.items():
            # 1. Se for bytes (Imagem BLOB), converte pra string utf-8
            if isinstance(value, bytes):
                try:
                    # Tenta decodificar direto (se for texto salvo como blob)
                    item[key] = value.decode('utf-8')
                except:
                    # Se for binário puro, converte pra Base64
                    item[key] = base64.b64encode(value).decode('utf-8')
            
            # 2. Se for Data, converte pra string "2023-01-01"
            elif isinstance(value, (date, datetime)):
                item[key] = value.strftime('%Y-%m-%d')
                
            # 3. Se for Decimal (dinheiro), converte pra float ou string
            from decimal import Decimal
            if isinstance(value, Decimal):
                item[key] = float(value)

    return dados


def atualizar_custo_ordem(id_ordem, cursor, conn):
    """
    Atualiza o custo total de uma ordem de serviço somando:
    - Custo das peças (Quantidade * Valor Unitário)
    - Custo da mão de obra (Horas * Valor Hora do Funcionário)
    """
    try:
        # 1. Busca a duração (em segundos) e converte para horas
        cursor.execute("SELECT Duracao FROM ordens_servico WHERE id_Ordem = %s", (id_ordem,))
        ordem = cursor.fetchone()
        duracao_horas = (ordem['Duracao'] or 0) / 3600 

        # 2. Custo das peças
        cursor.execute("""
            SELECT SUM(p.Valor_Unitario * op.Quantidade) AS total_pecas
            FROM ordens_pecas op
            INNER JOIN pecas p ON op.id_Peca = p.id_Peca
            WHERE op.id_Ordem = %s
        """, (id_ordem,))
        resultado_pecas = cursor.fetchone()
        total_pecas = resultado_pecas['total_pecas'] if (resultado_pecas and resultado_pecas['total_pecas']) else Decimal('0')

        # 3. Custo da mão de obra
        cursor.execute("""
            SELECT SUM(f.Valor_Hora) AS total_valor_hora
            FROM funcionarios_ordens fo
            JOIN cadastro_funcionario f ON fo.Cadastro_Funcionario_id_Cadastro = f.id_Cadastro
            WHERE fo.Ordens_Servico_id_Ordem = %s
        """, (id_ordem,))
        resultado_valor_hora = cursor.fetchone()
        total_valor_hora = resultado_valor_hora['total_valor_hora'] if (resultado_valor_hora and resultado_valor_hora['total_valor_hora']) else Decimal('0')

        # Cálculo final (Decimal * Decimal)
        custo_mao_obra = total_valor_hora * Decimal(str(duracao_horas))
        total = round(total_pecas + custo_mao_obra, 2)
        
        # 4. Atualiza no banco
        cursor.execute("UPDATE ordens_servico SET Custo = %s WHERE id_Ordem = %s", (total, id_ordem))
        
        print(f"[Op] Custo Ordem {id_ordem} atualizado: R$ {total}")

    except Exception as e:
        print(f"[Erro Crítico] Falha ao calcular custo: {str(e)}")
        raise e

def converter_types(value):
    if isinstance(value, (datetime, date)): return value.strftime("%Y-%m-%d %H:%M:%S")
    if isinstance(value, timedelta): return str(value)
    if isinstance(value, Decimal): return float(value)
    if isinstance(value, bytes): return value.decode("utf-8")
    return value

# -----------------------------------------------------------------------------
# ROTAS DE ORDENS DE SERVIÇO (CRUD BÁSICO)
# -----------------------------------------------------------------------------
@bp.route("/ordens", methods=["GET"])
def get_ordens():
    result = generic_select(table="ordens_servico", columns="*", database="sgmi")
    for ordem in result:
        if ordem.get("Duracao") is not None:
            ordem["Duracao"] = str(ordem["Duracao"])
    return jsonify(result)

@bp.route("/ordens/<int:id_ordem>", methods=["GET"])
def get_ordem_by_id(id_ordem):
    result = generic_select(table="ordens_servico", where={"id_Ordem": id_ordem}, limit=1, database="sgmi")
    if result:
        ordem = result[0]
        if ordem.get("Duracao") is not None:
            ordem["Duracao"] = str(ordem["Duracao"])
        return jsonify(ordem)
    return jsonify({"error": "Ordem não encontrada"}), 404

# -----------------------------------------------------------------------------
# ATUALIZAÇÃO DE ORDENS
# -----------------------------------------------------------------------------
@bp.route("/update_ordens/<int:id>", methods=["PUT"])
def update_ordens(id):
    payload = request.get_json()
    conn = connect_db("sgmi")
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute("SELECT * FROM ordens_servico WHERE id_Ordem=%s", (id,))
        ordem_antiga = cursor.fetchone()
        if not ordem_antiga:
            return jsonify({"status": "erro", "mensagem": "Ordem não encontrada"}), 404

        status_antigo = ordem_antiga.get('Status')
        status_novo = payload.get('Status')
        duracao_calculada = None

        if status_novo == 'Concluida' and status_antigo != 'Concluida':
            data_fechamento = datetime.now()
            payload['Data_Fechamento'] = data_fechamento.strftime("%Y-%m-%d %H:%M:%S")
            data_abertura = ordem_antiga['Data_Abertura']
            if isinstance(data_abertura, str):
                data_abertura = datetime.strptime(data_abertura, "%Y-%m-%d %H:%M:%S")
            duracao_calculada = int((data_fechamento - data_abertura).total_seconds())
            payload['Duracao'] = duracao_calculada if duracao_calculada >= 0 else 0
        
        campos_monitorados = ['id_Ativo', 'Descricao_Problema', 'Status', 'Prioridade', 'Tipo_Manutencao', 'id_Solicitacao', 'id_Funcionario_Consertou']
        campos_alterados = []
        valores_antigos = []
        valores_novos = []

        for campo in campos_monitorados:
            val_payload = str(payload.get(campo) or '').strip()
            val_antigo = str(ordem_antiga.get(campo) or '').strip()
            if campo in payload and val_payload != val_antigo:
                campos_alterados.append(campo)
                valores_antigos.append(val_antigo if val_antigo else 'N/A')
                valores_novos.append(val_payload)

        if payload:
            update_fields = ", ".join([f"{campo}=%s" for campo in payload.keys()])
            update_values = list(payload.values()) + [id]
            cursor.execute(f"UPDATE ordens_servico SET {update_fields} WHERE id_Ordem=%s", update_values)

        conn.commit()
        atualizar_custo_ordem(id, cursor, conn)

        if ordem_antiga.get('id_Ativo'):
            id_ativo = ordem_antiga['id_Ativo']
            status_ordem = str(payload.get("Status", ordem_antiga["Status"])).strip().lower()
            prioridade = str(payload.get("Prioridade", ordem_antiga["Prioridade"])).strip().lower()
            novo_status_ativo = None
            if status_ordem == "concluida": novo_status_ativo = "Ativo"
            elif prioridade == "alta": novo_status_ativo = "Inativo"
            elif prioridade == "media": novo_status_ativo = "Em Manutenção"
            elif prioridade == "baixa": novo_status_ativo = "Ativo"
            if novo_status_ativo:
                cursor.execute("UPDATE ativos SET Status=%s WHERE id_Ativo=%s", (novo_status_ativo, id_ativo))

        if campos_alterados or duracao_calculada is not None:
            cursor.execute("SELECT Custo, Duracao, Data_Fechamento FROM ordens_servico WHERE id_Ordem=%s", (id,))
            dados_finais = cursor.fetchone()
            cursor.execute("""
                INSERT INTO historico (
                    id_Ordem, id_Ativo, Descricao_Problema, Data_Abertura, Data_Fechamento,
                    Status, Prioridade, Custo, Duracao, Tipo_Manutencao,
                    id_Solicitacao, id_Funcionario_Consertou, Data_Modificacao,
                    Campo_Alterado, Valor_Antigo, Valor_Novo
                ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,NOW(),%s,%s,%s)
            """, (
                ordem_antiga['id_Ordem'], payload.get('id_Ativo', ordem_antiga['id_Ativo']), 
                payload.get('Descricao_Problema', ordem_antiga['Descricao_Problema']),
                ordem_antiga['Data_Abertura'], dados_finais['Data_Fechamento'],
                payload.get('Status', ordem_antiga['Status']), payload.get('Prioridade', ordem_antiga['Prioridade']),
                dados_finais['Custo'], dados_finais['Duracao'], payload.get('Tipo_Manutencao', ordem_antiga['Tipo_Manutencao']),
                payload.get('id_Solicitacao', ordem_antiga['id_Solicitacao']), payload.get('id_Funcionario_Consertou', ordem_antiga['id_Funcionario_Consertou']),
                ', '.join(campos_alterados), ', '.join(valores_antigos), ', '.join(valores_novos)
            ))
        conn.commit()
    except Exception as e:
        conn.rollback()
        return jsonify({"status": "erro", "mensagem": str(e)}), 500
    finally:
        cursor.close()
        conn.close()
    return jsonify({"status": "sucesso", "mensagem": "Ordem atualizada"})

@bp.route("/concluir_ordem/<int:id_ordem>", methods=["PUT"])
def concluir_ordem(id_ordem):
    return update_ordens(id_ordem) # Reutiliza a lógica robusta acima

# -----------------------------------------------------------------------------
# FUNCIONÁRIOS NA ORDEM
# -----------------------------------------------------------------------------
@bp.route("/ordens/<int:id_ordem>/funcionarios", methods=["POST"])
def vincular_funcionario(id_ordem):
    data = request.get_json()
    id_funcionario = data.get("id_Funcionario")
    if not id_funcionario: return jsonify({"error": "ID Obrigatório"}), 400
    
    conn = connect_db("sgmi")
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("INSERT INTO funcionarios_ordens (Cadastro_Funcionario_id_Cadastro, Ordens_Servico_id_Ordem) VALUES (%s, %s)", (id_funcionario, id_ordem))
        atualizar_custo_ordem(id_ordem, cursor, conn)
        cursor.execute("SELECT Nome, Email FROM cadastro_funcionario WHERE id_Cadastro = %s", (id_funcionario,))
        func = cursor.fetchone()
        if func: enviar_email_funcionario(func['Email'], func['Nome'], id_ordem)
        conn.commit()
        return jsonify({"message": "Vinculado"}), 201
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@bp.route("/ordens/<int:id_ordem>/funcionarios/<int:id_funcionario>", methods=["DELETE"])
def desvincular_funcionario(id_ordem, id_funcionario):
    conn = connect_db("sgmi")
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("DELETE FROM funcionarios_ordens WHERE Cadastro_Funcionario_id_Cadastro = %s AND Ordens_Servico_id_Ordem = %s", (id_funcionario, id_ordem))
        conn.commit()
        atualizar_custo_ordem(id_ordem, cursor, conn)
        conn.commit()
        return jsonify({"message": "Desvinculado"}), 200
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

# -----------------------------------------------------------------------------
# PEÇAS NA ORDEM
# -----------------------------------------------------------------------------
@bp.route("/ordens/<int:id_ordem>/pecas", methods=["POST"])
def adicionar_peca_na_ordem(id_ordem):
    data = request.get_json()
    id_peca, qtd = data.get("id_Peca"), data.get("Quantidade")
    if not id_peca or not qtd: return jsonify({"erro": "Dados incompletos"}), 400
    
    conn = connect_db("sgmi")
    cursor = conn.cursor(dictionary=True)
    try:
        quantidade = int(qtd)
        cursor.execute("SELECT Estoque FROM pecas WHERE id_Peca = %s", (id_peca,))
        peca = cursor.fetchone()
        if not peca or peca["Estoque"] is None: return jsonify({"erro": "Peça inválida"}), 404
        if int(peca["Estoque"]) < quantidade: return jsonify({"erro": "Estoque insuficiente"}), 400
        
        cursor.execute("INSERT INTO ordens_pecas (id_Ordem, id_Peca, Quantidade) VALUES (%s, %s, %s)", (id_ordem, id_peca, quantidade))
        cursor.execute("UPDATE pecas SET Estoque = Estoque - %s WHERE id_Peca = %s", (quantidade, id_peca))
        atualizar_custo_ordem(id_ordem, cursor, conn)
        conn.commit()
        return jsonify({"status": "sucesso"})
    except Exception as e:
        conn.rollback()
        return jsonify({"erro": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@bp.route("/funcionarios/<int:id_funcionario>/ordens", methods=["GET"])
def get_ordens_por_funcionario(id_funcionario):
    main_table = "funcionarios_ordens"
    joins = [
        {
            "table": "ordens_servico",
            "condition": "funcionarios_ordens.Ordens_Servico_id_Ordem = ordens_servico.id_Ordem"
        }
    ]
    columns = [
        "ordens_servico.id_Ordem",
        "ordens_servico.id_Ativo",
        "ordens_servico.Descricao_Problema",
        "ordens_servico.Data_Abertura",
        "ordens_servico.Status",
        "ordens_servico.Prioridade",
        "ordens_servico.id_Solicitacao"
    ]
    where = {
        "funcionarios_ordens.Cadastro_Funcionario_id_Cadastro": id_funcionario
    }

    result = generic_join_select(
        main_table=main_table,
        joins=joins,
        columns=columns,
        where=where,
        order_by="ordens_servico.Data_Abertura DESC",
        limit=100,
        database="sgmi"
    )

    if not result:
        result = []

    return jsonify(result)

@bp.route("/ordens/<int:id_ordem>/pecas/<int:id_ordem_peca>", methods=["PUT"])
def atualizar_peca_na_ordem(id_ordem, id_ordem_peca):
    data = request.get_json()
    quantidade_adicional = int(data.get("Quantidade"))

    conn = connect_db()
    cursor = conn.cursor(dictionary=True)
    try:
        # Consulta vínculo
        cursor.execute("SELECT id_Peca, Quantidade FROM ordens_pecas WHERE id_Ordens_Peca = %s", (id_ordem_peca,))
        vinculo = cursor.fetchone()
        if not vinculo:
            return jsonify({"status": "erro", "mensagem": "Vínculo da peça não encontrado"}), 404

        id_peca = vinculo['id_Peca']

        # Verifica estoque
        cursor.execute("SELECT Estoque FROM pecas WHERE id_Peca = %s", (id_peca,))
        peca = cursor.fetchone()
        if not peca or peca["Estoque"] < quantidade_adicional:
            return jsonify({"status": "erro", "mensagem": "Estoque insuficiente"}), 400

        # Atualiza quantidade
        cursor.execute(
            "UPDATE ordens_pecas SET Quantidade = Quantidade + %s WHERE id_Ordens_Peca = %s",
            (quantidade_adicional, id_ordem_peca)
        )

        # Atualiza estoque
        cursor.execute(
            "UPDATE pecas SET Estoque = Estoque - %s WHERE id_Peca = %s",
            (quantidade_adicional, id_peca)
        )

        # Atualiza custo
        # Atualiza custo da ordem
        atualizar_custo_ordem(id_ordem, cursor, conn)

                
        conn.commit()
        return jsonify({"status": "sucesso", "mensagem": "Quantidade da peça atualizada, estoque e custo atualizados"})
    except Exception as e:
        conn.rollback()
        return jsonify({"status": "erro", "mensagem": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@bp.route("/ordens/<int:id_ordem>/pecas/<int:id_ordens_peca>", methods=["DELETE"])
def remover_peca_da_ordem(id_ordem, id_ordens_peca):
    conn = connect_db("sgmi")
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT id_Peca, Quantidade FROM ordens_pecas WHERE id_Ordens_Peca = %s", (id_ordens_peca,))
        vinculo = cursor.fetchone()
        if not vinculo: return jsonify({"erro": "Vinculo nao encontrado"}), 404
        
        cursor.execute("UPDATE pecas SET Estoque = Estoque + %s WHERE id_Peca = %s", (vinculo['Quantidade'], vinculo['id_Peca']))
        cursor.execute("DELETE FROM ordens_pecas WHERE id_Ordens_Peca = %s", (id_ordens_peca,))
        atualizar_custo_ordem(id_ordem, cursor, conn)
        conn.commit()
        return jsonify({"status": "sucesso"})
    except Exception as e:
        conn.rollback()
        return jsonify({"erro": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@bp.route("/ordens/<int:id_ordem>/funcionarios", methods=["GET"])
def get_funcionarios_por_ordem(id_ordem):
    """Busca todos os funcionários associados a uma ordem de serviço específica."""
    params = {
        "main_table": "funcionarios_ordens",
        "joins": [{"table": "cadastro_funcionario", "condition": "funcionarios_ordens.Cadastro_Funcionario_id_Cadastro = cadastro_funcionario.id_Cadastro"}],
        "columns": ["funcionarios_ordens.id_Funcionario", "cadastro_funcionario.id_Cadastro", "cadastro_funcionario.Nome", "cadastro_funcionario.Cargo", 
        "cadastro_funcionario.Valor_Hora", "funcionarios_ordens.Ordens_Servico_id_Ordem AS id_Ordem"],
        "where": {"funcionarios_ordens.Ordens_Servico_id_Ordem": id_ordem},
        "database": "sgmi"
    }
    result = generic_join_select(**params)
    return jsonify(result)

@bp.route("/ordens/<int:id_ordem>/pecas", methods=["GET"])
def get_pecas_por_ordem(id_ordem):
    """Busca todas as peças associadas a uma ordem de serviço específica."""
    params = {
        "main_table": "ordens_pecas",
        "joins": [{"table": "pecas", "condition": "ordens_pecas.id_Peca = pecas.id_Peca"}],
        "columns": ["ordens_pecas.id_Ordens_Peca", "ordens_pecas.id_Ordem", "ordens_pecas.id_Peca",
        "ordens_pecas.Quantidade", "pecas.Nome_Peca", "pecas.Estoque", "pecas.Valor_Unitario"],
        "where": {"ordens_pecas.id_Ordem": id_ordem},
        "database": "sgmi"
    }
    result = generic_join_select(**params)
    return jsonify(result)

# -----------------------------------------------------------------------------
# CUSTOS E RELATÓRIOS
# -----------------------------------------------------------------------------
@bp.route("/api/custos/<int:id_ordem>", methods=["GET"])
def get_custo_ordem(id_ordem):
    conn = connect_db("sgmi")
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT SUM(op.Quantidade * p.Valor_Unitario) AS pecas FROM ordens_pecas op JOIN pecas p ON op.id_Peca=p.id_Peca WHERE op.id_Ordem=%s", (id_ordem,))
        pecas = cursor.fetchone()['pecas'] or 0
        cursor.execute("SELECT SUM(f.Valor_Hora) AS mao_obra FROM funcionarios_ordens fo JOIN cadastro_funcionario f ON fo.Cadastro_Funcionario_id_Cadastro=f.id_Cadastro WHERE fo.Ordens_Servico_id_Ordem=%s", (id_ordem,))
        rh = cursor.fetchone()['mao_obra'] or 0
        return jsonify({"pecas": float(pecas), "mao_obra": float(rh), "total": float(pecas + rh)})
    finally:
        conn.close()

# -----------------------------------------------------------------------------
# MODELOS 3D
# -----------------------------------------------------------------------------
@bp.route("/arquivos-upload", methods=["GET"])
def get_arquivos_upload():
    try:
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
        path = os.path.join(base_dir, 'FrontEnd', 'uploads', 'modelos_3d')
        arquivos = [f for f in os.listdir(path) if f.endswith(('.glb', '.gltf', '.obj'))] if os.path.exists(path) else []
        return jsonify(arquivos)
    except: return jsonify([])


@bp.route('/uploads/modelos_3d/<path:filename>')
def serve_model(filename):
    # Pega a raiz do projeto
    BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
    
    # Caminho exato: raiz / FrontEnd / uploads / modelos_3d
    UPLOADS_3D_PATH = os.path.join(BASE_DIR, 'FrontEnd', 'uploads', 'modelos_3d')
    
    filepath = os.path.join(UPLOADS_3D_PATH, filename)
    
    if not os.path.exists(filepath):
        return {"erro": "Arquivo não encontrado"}, 404

    response = make_response(send_file(filepath))
    
    # Configura os Headers para o navegador entender que é um modelo 3D
    if filename.endswith('.glb'):
        response.headers['Content-Type'] = 'model/gltf-binary'
    elif filename.endswith('.gltf'):
        response.headers['Content-Type'] = 'model/gltf+json'
    
    return response



@bp.route("/ativos/<int:id_ativo>/modelos3d", methods=["GET", "POST"])
def gerir_modelos(id_ativo):
    conn = connect_db("sgmi")
    cursor = conn.cursor(dictionary=True)
    if request.method == "POST":
        data = request.get_json()
        cursor.execute("INSERT INTO modelos_3d (id_Ativo, Nome, Arquivo) VALUES (%s, %s, %s)", (id_ativo, data.get('Nome'), data.get('Arquivo')))
        conn.commit()
        conn.close()
        return jsonify({"sucesso": True}), 201
    else:
        cursor.execute("SELECT * FROM modelos_3d WHERE id_Ativo = %s", (id_ativo,))
        res = cursor.fetchall()
        conn.close()
        return jsonify(res)

@bp.route("/modelos3d/<int:id_modelo>", methods=["DELETE"])
def deletar_modelo(id_modelo):
    conn = connect_db("sgmi")
    cursor = conn.cursor()
    cursor.execute("DELETE FROM modelos_3d WHERE id_Modelo = %s", (id_modelo,))
    conn.commit()
    conn.close()
    return jsonify({"sucesso": True})

# -----------------------------------------------------------------------------
# NOTIFICAÇÕES E SOLICITAÇÕES
# -----------------------------------------------------------------------------

@bp.route('/criar_solicitacao', methods=['POST'])
def criar_solicitacao():
    try:
        dados_da_requisicao = request.get_json()

        resultado = processar_dados('POST', dados_da_requisicao)

        # O processador retorna um erro se a validação falhar
        if resultado.get('status') == 'erro':
            return jsonify(resultado), 400 # Retorna 400 Bad Request com os erros

        # --- LÓGICA DE NOTIFICAÇÃO PÓS-SUCESSO ---
        # Se chegamos aqui, os dados eram válidos e foram inseridos.
        if "inserted_id" in resultado:
            novo_id = resultado["inserted_id"]
            
            # Prepara os dados para a notificação (pega do request original)
            dados_para_notificacao = dados_da_requisicao.get("data", {})
            dados_para_notificacao['id_Solicitacao'] = novo_id
            
            try:
                enviar_email_solicitacao(dados_para_notificacao)
                print("Requisição para a funçao de notificação enviada.")
            except Exception as notif_e:
                print(f"Erro ao chamar a funçao de notificação: {notif_e}")
            
            # Retorna a resposta de sucesso vinda do processador
            return jsonify(resultado), 201 # 201 Created é o status ideal para sucesso
        
        else:
            # Caso algo inesperado aconteça no processador
            return jsonify({'status': 'erro', 'mensagem': 'Processamento falhou sem um erro claro.'}), 500

    except Exception as e:
        print(f"Erro fatal na rota /criar_solicitacao: {e}")
        return jsonify({'success': False, 'message': 'Erro no servidor: ' + str(e)}), 500
        

@bp.route('/atualizar_status_solicitacao', methods=['POST'])
def atualizar_solicitacao():
    data = request.get_json()
    conn = connect_db("sgmi")
    cursor = conn.cursor()
    cursor.execute("UPDATE solicitacoes SET Status = %s WHERE id_Solicitacao = %s", (data.get('Status'), data.get('id_Solicitacao')))
    conn.commit()
    conn.close()
    return jsonify({'success': True})


# -----------------------------------------------------------------------------
# ROTAS GERAIS
# -----------------------------------------------------------------------------
@bp.route("/ativos", methods=["GET"])
def get_ativos():
    # 1. Busca os dados usando sua função pronta
    ativos = generic_select(table="ativos", columns="*", database="sgmi")
    modelos = generic_select(table="modelos_3d", columns="id_Ativo, Arquivo", database="sgmi")
    
    # 2. Cria o mapa de modelos 
    mapa_modelos = {m['id_Ativo']: m['Arquivo'] for m in modelos}
    
    # 3. Itera para corrigir os dados 
    for a in ativos:
        # Vincula o modelo 3D
        a['caminho_modelo_3d'] = mapa_modelos.get(a['id_Ativo'])
        
        # --- CORREÇÃO DINÂMICA DE BYTES  ---
        for chave, valor in a.items():
            if isinstance(valor, (bytes, bytearray)):
                try:
                    # Tenta converter para texto normal (resolve o problema do MEDIUMTEXT)
                    a[chave] = valor.decode('utf-8')
                except UnicodeDecodeError:
                    # Se for arquivo binário mesmo (como a Imagem LONGBLOB), converte para Base64
                    a[chave] = base64.b64encode(valor).decode('utf-8')

        # --- CORREÇÃO DE DATAS ---
        # O JSON também não gosta de objetos 'date', tem que virar string
        if isinstance(a.get('Data_Aquisicao'), (date, datetime)):
            a['Data_Aquisicao'] = a['Data_Aquisicao'].strftime('%Y-%m-%d')

    return jsonify(ativos)

@bp.route("/ativos/<int:id_ativo>", methods=["GET"])
def get_ativo_id(id_ativo):
    res = generic_select("ativos", where={"id_Ativo": id_ativo}, limit=1, database="sgmi")
    return jsonify(res[0]) if res else (jsonify({"erro": "404"}), 404)

@bp.route("/sensores", methods=["GET"])
def get_sensores():
    return jsonify(generic_select("sensores", columns="*", database="sgmi"))

@bp.route("/sensores/<int:id>", methods=["GET"])
def get_sensor_id(id):
    res = generic_select("sensores", where={"id_Sensor": id}, limit=1, database="sgmi")
    return jsonify(res[0]) if res else (jsonify({"erro": "404"}), 404)

@bp.route('/sensores_por_ativo/<int:id_ativo>', methods=['GET'])
def sensores_por_ativo(id_ativo):
    """Busca todos os sensores associados a um ativo específico."""
    conn = connect_db()
    cursor = conn.cursor(dictionary=True)
    query = "SELECT * FROM sensores WHERE id_Ativo = %s"
    cursor.execute(query, (id_ativo,))
    sensores = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify(sensores)

@bp.route("/update_ativo/<int:id>", methods=["PUT"])
def update_ativo(id):
    # Se for FormData, use request.form e request.files
    payload_data = request.form.to_dict()  # pega todos os campos do form

    # Se tiver imagem
    imagem = request.files.get("Imagem")
    if imagem:
        payload_data["Imagem"] = imagem.read()  # armazena o conteúdo da imagem como bytes

    # O usuário enviado pelo front-end
    usuario_logado = payload_data.pop('Usuario', 'sistema')

    # Buscar valores antigos
    ativo_antigos = generic_select("ativos", where={"id_Ativo": id})
    if not ativo_antigos:
        return jsonify({"status": "erro", "mensagem": f"Ativo {id} não encontrado."}), 404
    ativo_antigo = ativo_antigos[0]

    # Registrar histórico só dos campos alterados
    alteracoes = []
    for campo, valor_novo in payload_data.items():
        valor_antigo = ativo_antigo.get(campo)
        if campo == "Imagem":
            if valor_novo != valor_antigo:
                alteracoes.append({
                    "id_Ativo": id,
                    "Campo_Alterado": campo,
                    "Valor_Antigo": "<imagem_anterior>",
                    "Valor_Novo": "<nova_imagem>",
                    "Usuario": usuario_logado,
                    "Data_Modificacao": datetime.now()
                })
        else:
            if str(valor_novo) != str(valor_antigo):
                alteracoes.append({
                    "id_Ativo": id,
                    "Campo_Alterado": campo,
                    "Valor_Antigo": str(valor_antigo),
                    "Valor_Novo": str(valor_novo),
                    "Usuario": usuario_logado,
                    "Data_Modificacao": datetime.now()
                })

    # Inserir histórico
    for alteracao in alteracoes:
        generic_insert("historico_ativos", alteracao)

    # Atualizar ativo
    data = {
        "table": "ativos",
        "where": {"id_Ativo": id},
        "data": payload_data,
        "database": "sgmi"
    }
    result = processar_dados("PUT", data)
    if result.get('status') == 'erro':
        return jsonify(result), 400

    return jsonify(result), 200

@bp.route("/delete_ativo/<int:id>", methods=["DELETE"])
def delete_ativo(id):
    """Apaga um ativo específico pelo ID."""
    result = generic_delete(table="ativos", where={"id_Ativo": id}, database="sgmi")
    return jsonify(result)


@bp.route("/historico", methods=["GET"])
def get_historico():
    res = generic_select("historico", columns="*", database="sgmi")
    for r in res:
        for k, v in r.items(): r[k] = converter_types(v)
    return jsonify(res)

@bp.route("/historico/<int:id>", methods=["GET"])
def get_historico_id(id):
    res = generic_select("historico", where={"id_Manutencao": id}, limit=1, database="sgmi")
    if res:
        for k, v in res[0].items(): res[0][k] = converter_types(v)
        return jsonify(res[0])
    return jsonify({"erro": "404"}), 404

@bp.route("/pecas", methods=["GET"])
def listar_pecas():
    return jsonify(generic_select("pecas", columns="*", database="sgmi"))

@bp.route("/pecas/<int:id>", methods=["GET"])
def peca_id(id):
    res = generic_select("pecas", where={"id_Peca": id}, limit=1, database="sgmi")
    return jsonify(res[0]) if res else (jsonify({"erro": "404"}), 404)

@bp.route("/solicitacoes", methods=["GET"])
def listar_solicitacoes():
    return jsonify(generic_select("solicitacoes", columns="*", database="sgmi"))

@bp.route("/solicitacoes/<int:id_solicitacao>", methods=["GET"])
def get_solicitacao_by_id(id_solicitacao):
    """Busca uma solicitação específica pelo ID."""
    result = generic_select(table="solicitacoes", where={"id_Solicitacao": id_solicitacao}, limit=1, database="sgmi")
    if result:
        return jsonify(result[0])
    return jsonify({"error": "Solicitação não encontrada"}), 404

@bp.route("/usuario", methods=["GET"])
def get_usuario():
    """Busca todos os utilizadores e processa as suas fotos."""
    try:
        result = generic_select(table="cadastro_funcionario", columns="*", database="sgmi")
        if not result:
            return jsonify([])
        
        # Converte a foto de cada utilizador para Base64.
        for usuario in result:
            foto = usuario.get("Foto_Usuario")
            if foto and isinstance(foto, (bytes, bytearray)):
                usuario["Foto_Usuario"] = base64.b64encode(foto).decode('utf-8')
            else:
                usuario["Foto_Usuario"] = None
        return jsonify(result)
    except Exception as e:
        print("[ERROR] Falha ao buscar utilizadores:", e)
        return jsonify({"error": "Falha ao buscar utilizadores"}), 500
    
@bp.route("/usuario/<int:id_usuario>", methods=["GET"])
def get_usuario_by_id(id_usuario):
    """Busca um utilizador específico pelo ID e processa a sua foto."""
    try:
        result = generic_select(table="cadastro_funcionario", where={"id_Cadastro": id_usuario}, limit=1, database="sgmi")
        if not result:
            return jsonify({"error": "Utilizador não encontrado"}), 404

        usuario = result[0]
        foto = usuario.get("Foto_Usuario")
        if foto and isinstance(foto, (bytes, bytearray)):
            usuario["Foto_Usuario_Base64"] = base64.b64encode(foto).decode('utf-8')
        else:
            usuario["Foto_Usuario_Base64"] = None
        
        usuario.pop("Foto_Usuario", None)
        return jsonify(usuario)
    except Exception as e:
        print("[ERROR] Falha ao buscar utilizador por ID:", e)
        return jsonify({"error": "Falha ao buscar utilizador"}), 500
    
@bp.route("/update_usuario/<int:id>", methods=["PUT"])
def update_usuario(id):
    """Atualiza um utilizador específico, com suporte para upload de nova foto."""
    payload_data = {}
    if request.content_type.startswith("multipart/form-data"):
        print("[Checkpoint] Pedido PUT recebido como multipart/form-data.")
        for key in request.form:
            payload_data[key] = request.form[key]
        if "Foto_Usuario" in request.files:
            file = request.files["Foto_Usuario"]
            payload_data["Foto_Usuario"] = file.read()
            print("[Checkpoint] arquivo 'Foto_Usuario' recebido e lido.")
    else:
        print("[Checkpoint] Pedido PUT recebido como JSON.")
        payload_data = request.get_json()
    
    # Se a senha não for fornecida no payload, remova o campo para não atualizar
    if "Senha_Usuario" in payload_data and not payload_data["Senha_Usuario"]:
        payload_data.pop("Senha_Usuario")
    # Se a senha for fornecida, você pode criptografá-la aqui
    elif "Senha_Usuario" in payload_data and payload_data["Senha_Usuario"]:
        # Exemplo com hash
        # payload_data["Senha_Usuario"] = generate_password_hash(payload_data["Senha_Usuario"])
        pass # Ou remova o pass e adicione sua lógica de hash

    data = {
        "table": "cadastro_funcionario",
        "where": {"id_Cadastro": id},
        "data": payload_data, # O payload_data já está tratado aqui
        "database": "sgmi"
    }
    print("[Checkpoint] PUT /update_usuario recebido:", list(data["data"].keys()))
    result = processar_dados("PUT", data)
    if result.get('status') == 'erro':
        return jsonify(result), 400 # Retorna erro

    print("[Checkpoint] Resultado do update_usuario:", result)
    return jsonify(result),200

    
@bp.route("/delete_usuario/<int:id>", methods=["DELETE"])
def delete_usuario(id):
    """Apaga um utilizador específico pelo ID."""
    
    # Tenta deletar
    result = generic_delete(
        table="cadastro_funcionario", 
        where={"id_Cadastro": id}, 
        database="sgmi"
    )
    
    # Verifica se voltou erro do banco. 
    # O MySQL Connector costuma retornar a chave 'error' ou 'erro' no seu try/catch.
    if "error" in result or "erro" in result:
        # Retorna 400 (Bad Request) ou 409 (Conflict)
        msg = result.get("error") or result.get("erro")
        return jsonify({"mensagem": f"Erro ao deletar: {msg}"}), 400
        
    # Se chegou aqui, deu certo (affected_rows > 0)
    return jsonify(result), 200

@bp.route("/delete_pecas/<int:id>", methods=["DELETE"])
def delete_pecas(id):
    """Apaga uma peça específica pelo ID."""
    result = generic_delete(table="pecas", where={"id_Peca": id}, database="sgmi")
    return jsonify(result)

@bp.route("/update_peca/<int:id>", methods=["PUT"])
def update_peca_legacy(id):
    data = request.get_json()
    
    where_dict = {"id_Peca": id}
    
    resultado = generic_update(
        table="pecas",
        data=data,
        where=where_dict,
        database="sgmi"
    )
    
    # Verifica se voltou erro
    if "error" in resultado or "erro" in resultado:
        msg = resultado.get("error") or resultado.get("erro")
        return jsonify({"mensagem": msg}), 400
        
    return jsonify({"mensagem": "Atualizado com sucesso"}), 200

@bp.route("/update_sensor/<int:id>", methods=["PUT"])
def update_sensor(id):
    """Atualiza um sensor e registra alterações no histórico automaticamente."""
    payload_data = request.get_json()

    # Remove 'Usuario' do payload para não quebrar o UPDATE na tabela sensores.
    # O .pop() remove a chave do dicionário e retorna o valor dela.
    usuario_logado = payload_data.pop('Usuario', 'sistema')
    
    # Remove o id_Sensor também, pois ele vai no WHERE, não no SET
    if 'id_Sensor' in payload_data:
        del payload_data['id_Sensor']

    # Buscar os valores antigos do sensor
    sensor_antigos = generic_select("sensores", where={"id_Sensor": id})
    if not sensor_antigos:
        return jsonify({"status": "erro", "mensagem": f"Sensor {id} não encontrado."}), 404
    sensor_antigo = sensor_antigos[0]

    # Registrar histórico somente dos campos alterados
    alteracoes = []
    
    # Agora payload_data só tem os campos reais da tabela sensores
    for campo, valor_novo in payload_data.items():
        
        valor_antigo = sensor_antigo.get(campo)

        # Comparação especial para campos de imagem (blob)
        if campo == "Imagem":
            if valor_novo != valor_antigo:
                alteracoes.append({
                    "id_Sensor": id,
                    "Campo_Alterado": campo,
                    "Valor_Antigo": "<imagem_anterior>",
                    "Valor_Novo": "<nova_imagem>",
                    "Usuario": usuario_logado,
                    "Data_Modificacao": datetime.now()
                })
        else:
            # Converte para string para evitar erros de comparação entre int/str
            if str(valor_novo) != str(valor_antigo):
                alteracoes.append({
                    "id_Sensor": id,
                    "Campo_Alterado": campo,
                    "Valor_Antigo": str(valor_antigo),
                    "Valor_Novo": str(valor_novo),
                    "Usuario": usuario_logado,
                    "Data_Modificacao": datetime.now()
                })

    # Inserir alterações no histórico
    for alteracao in alteracoes:
        # AQUI SIM, o Usuario é inserido, mas na tabela historico_sensores
        generic_insert("historico_sensores", alteracao)

    # Atualizar o sensor na tabela principal
    data = {
        "table": "sensores",
        "where": {"id_Sensor": id},
        "data": payload_data, # Aqui vai sem 'Usuario' e sem 'id_Sensor'
        "database": "sgmi"
    }
    
    result = processar_dados("PUT", data)
    
    if result.get('status') == 'erro':
        return jsonify(result), 400

    return jsonify(result), 200

@bp.route("/delete_sensor/<int:id>", methods=["DELETE"])
def delete_sensor(id):
    """Apaga um sensor específico pelo ID."""
    result = generic_delete(table="sensores", where={"id_Sensor": id}, database="sgmi")
    return jsonify(result)

@bp.route("/delete_ordens/<int:id>", methods=["DELETE"])
def delete_ordens(id):
    """Apaga uma ordem de serviço específica pelo ID."""
    result = generic_delete(table="ordens_servico", where={"id_Ordem": id}, database="sgmi")
    return jsonify(result)

@bp.route("/historico_ativos", methods=["GET"], endpoint="listar_ativos")
def listar_historico_ativos():
    """Busca todas as alterações de ativos."""
    result = generic_select(table="historico_ativos", columns="*", database="sgmi")
    return jsonify(result)

@bp.route("/historico_sensores", methods=["GET"], endpoint="listar_sensores")
def listar_historico_sensores():
    """Busca todas as alterações de sensores."""
    result = generic_select(table="historico_sensores", columns="*", database="sgmi")
    return jsonify(result)

