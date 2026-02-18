from flask import Blueprint, request, jsonify, current_app
import requests
from app.services.processamento import processar_dados
from app.database.deletar import generic_delete
from app.database.select_mono import generic_select
from app.services.gestor_mqtt import mqtt_client
from app.database.conectar import connect_db
from mysql.connector import Error as MySQLError

# Criação do Blueprint
bp = Blueprint('core', __name__)

# -----------------------------------------------------------------------------
# CONSTANTES E MAPAS (Para o Super Filtro)
# -----------------------------------------------------------------------------
TABELA_MAP = {
    "Ativo": "ativos", "Ativos": "ativos",
    "Funcionário": "cadastro_funcionario", "Funcionario": "cadastro_funcionario",
    "Sensores": "sensores", "Sensor": "sensores",
    "Peças": "pecas", "Peca": "pecas",
    "Ordens": "ordens_servico", "Ordem de Serviço": "ordens_servico", "Ordens de Serviço": "ordens_servico",
    "Solicitações": "solicitacoes", "Solicitação": "solicitacoes",
    "Histórico Ativo": "historico_ativos", "Histórico de Ativos": "historico_ativos",
    "Histórico de Sensor": "historico_sensores",
    "Modelo 3D": "modelos_3d", "Modelos 3D": "modelos_3d",
}

ID_COLUMN_MAP = {
    "ativos": "id_Ativo", "cadastro_funcionario": "id_Cadastro",
    "sensores": "id_Sensor", "pecas": "id_Peca",
    "ordens_servico": "id_Ordem", "solicitacoes": "id_Solicitacao",
    "historico": "id_Manutencao", "historico_ativos": "id_historico",
    "historico_sensores": "id_historico", "modelos_3d": "id_Modelo",
    "dados_sensores": "id_Dados", "ordens_pecas": "id_Ordens_Peca",
    "funcionarios_ordens": "id_Funcionario",
}

# -----------------------------------------------------------------------------
# FUNÇÕES UTILITÁRIAS
# -----------------------------------------------------------------------------
def convert_bytes(rows):
    """ Converte bytes para string para evitar erro JSON """
    result = []
    for r in rows:
        row = {}
        for k, v in r.items():
            if isinstance(v, bytes):
                row[k] = v.decode('utf-8', errors='ignore')
            else:
                row[k] = v
        result.append(row)
    return result

def get_data_column_type(tabela):
    conn = None
    try:
        conn = connect_db("sgmi")
        cursor = conn.cursor(dictionary=True)
        cursor.execute(f"""
            SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA='sgmi' AND TABLE_NAME='{tabela}'
            AND DATA_TYPE IN ('date', 'datetime', 'timestamp') LIMIT 1
        """)
        row = cursor.fetchone()
        return (row['COLUMN_NAME'], row['DATA_TYPE']) if row else (None, None)
    finally:
        if conn and conn.is_connected():
            conn.close()

def normalize_status(tabela, valor):
    if not valor: return None
    valor = valor.strip()
    if tabela in ["ativos", "sensores"]: return valor.lower()
    if tabela in ["ordens_servico", "historico", "solicitacoes"]: return valor.capitalize()
    return valor

def normalize_prioridade(tabela, valor):
    if not valor: return None
    if tabela in ["ordens_servico", "historico", "solicitacoes"]: return valor.strip().capitalize()
    return valor.strip()

# -----------------------------------------------------------------------------
# CRUD GENÉRICO
# -----------------------------------------------------------------------------
@bp.route("/insert", methods=["POST"])
def endpoint_insert():
    if request.content_type and request.content_type.startswith("multipart/form-data"):
        dados = {"table": request.form.get("table"), "database": "sgmi", "data": {}}
        for key in request.form:
            if key not in ("table", "database"): dados["data"][key] = request.form[key]
        for key, file in request.files.items():
            dados["data"][key] = file.read() 
    else:
        dados = request.get_json()

    result = processar_dados("POST", dados)
    if result.get('status') == 'erro': return jsonify(result), 400 
    return jsonify(result), 201

@bp.route("/update", methods=["PUT"])
def endpoint_update():
    result = processar_dados("PUT", request.get_json())
    if result.get('status') == 'erro': return jsonify(result), 400
    return jsonify(result), 200

@bp.route("/delete", methods=["DELETE"])
def endpoint_delete():
    data = request.get_json()
    result = generic_delete(data.get("table"), data.get("where"), "sgmi")
    if result.get('status') == 'erro': return jsonify(result), 400
    return jsonify(result), 200

@bp.route("/generic_select", methods=["POST"])
def api_generic_select():
    data = request.get_json()
    result = generic_select(data.get("table"), data.get("columns", "*"), data.get("where"), data.get("order_by"), data.get("limit"), "base")
    return jsonify(result), 200

# -----------------------------------------------------------------------------
# O "SUPER FILTRO" (EXECUTAR OPERAÇÃO)
# -----------------------------------------------------------------------------
@bp.route("/executar_operacao", methods=["POST"])
def executar_operacao_endpoint():
    data = request.get_json() or {}
    tabela_front = data.get("tabela")
    if not tabela_front: return jsonify({"erro": "Parâmetro 'tabela' ausente"}), 400

    tabela = TABELA_MAP.get(tabela_front, tabela_front)
    tipo = data.get("tipo")
    page_size = int(data.get("page_size", 10))
    offset = (int(data.get("page", 1)) - 1) * page_size
    
    conn = None
    try:
        conn = connect_db("sgmi")
        cursor = conn.cursor(dictionary=True)
        coluna_data, tipo_coluna = get_data_column_type(tabela)
        
        sql, params = "", []

        if tipo == "consulta":
            id_col = ID_COLUMN_MAP.get(tabela)
            if not id_col or not data.get("id"): return jsonify({"erro": "ID inválido"}), 400
            sql = f"SELECT * FROM `{tabela}` WHERE `{id_col}` = %s"
            params = [data.get("id")]

        elif tipo == "total":
            sql = f"SELECT COUNT(*) AS total FROM `{tabela}`"

        elif tipo == "status":
            st = normalize_status(tabela, data.get("status") or data.get("statusSelect"))
            sql = f"SELECT * FROM `{tabela}` WHERE `Status`=%s LIMIT %s OFFSET %s"
            params = [st, page_size, offset]

        elif tipo == "prioridade":
            pr = normalize_prioridade(tabela, data.get("prioridade") or data.get("prioridadeSelect"))
            sql = f"SELECT * FROM `{tabela}` WHERE `Prioridade`=%s LIMIT %s OFFSET %s"
            params = [pr, page_size, offset]

        elif tipo == "multi": # Filtros combinados
            filtros = data.get("filtros", [])
            where_clauses = []
            for f in filtros:
                if f.get("status"):
                    where_clauses.append("`Status` = %s")
                    params.append(normalize_status(tabela, f.get("status")))
                if f.get("prioridade"):
                    where_clauses.append("`Prioridade` = %s")
                    params.append(normalize_prioridade(tabela, f.get("prioridade")))
                # Adicione aqui a lógica de datas se necessário (simplificado para caber)
                for k, v in f.items():
                    if k not in ["status", "prioridade", "periodo"] and isinstance(v, (str, int)):
                        where_clauses.append(f"`{k}`=%s")
                        params.append(v)
            
            where_sql = " WHERE " + " AND ".join(where_clauses) if where_clauses else ""
            sql = f"SELECT * FROM `{tabela}` {where_sql} LIMIT %s OFFSET %s"
            params.extend([page_size, offset])

        else:
            return jsonify({"erro": "Tipo desconhecido"}), 400

        cursor.execute(sql, tuple(params))
        rows = cursor.fetchall()
        resultado = convert_bytes(rows)
        
        return jsonify({"resultado": resultado, "page": data.get("page", 1), "page_size": page_size})

    except Exception as e:
        print(f"[Core] Erro Executar Operacao: {e}")
        return jsonify({"erro": str(e)}), 500
    finally:
        if conn and conn.is_connected(): conn.close()

# -----------------------------------------------------------------------------
# UTILITÁRIOS
# -----------------------------------------------------------------------------
@bp.route('/mqtt/publish', methods=['POST'])
def publish_mqtt():
    body = request.json or {}
    mqtt_client.publish(body.get('topic'), body.get('payload', ''))
    return jsonify({'status': 'publicado'})

@bp.route('/teste', methods=['GET'])
def teste():
    return {"status": "ok", "mensagem": "API Flask a funcionar!"}

@bp.route("/analisar_ia", methods=["POST"])
def analisar_ia():
    try:
        dados_frontend = request.get_json()
        prompt_usuario = dados_frontend.get("prompt")

        # Pega a chave que está SEGURA no seu .env através do config.py
        api_key = current_app.config.get('GEMINI_API_KEY')
        
        model = "gemini-3-flash-preview"
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"

        payload = {
            "contents": [{
                "parts": [{ "text": prompt_usuario }]
            }]
        }

        # O Python faz a chamada para o Google
        response = requests.post(url, json=payload)
        return jsonify(response.json())

    except Exception as e:
        return jsonify({"error": str(e)}), 500