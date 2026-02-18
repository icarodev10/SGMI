from flask import Blueprint, jsonify
from app.database.conectar import connect_db

# Criação do Blueprint
bp = Blueprint('dashboard', __name__)

# -----------------------------------------------------------------------------
# STATUS DAS ORDENS DE MANUTENÇÃO (OM)
# -----------------------------------------------------------------------------
@bp.route('/om/status', methods=['GET'])
def get_om_status():
    """
    Retorna a contagem de Ordens de Manutenção por estado (Aberta, Em Andamento, Concluída).
    """
    try:
        conn = connect_db("sgmi")
        cursor = conn.cursor(dictionary=True)
        
        # Garante que todos os estados possíveis retornem, mesmo se zerados
        status_validos = {"Aberta": 0, "Em Andamento": 0, "Concluida": 0}
        
        query = "SELECT Status, COUNT(*) AS quantidade FROM ordens_servico GROUP BY Status"
        cursor.execute(query)
        status_do_banco = cursor.fetchall()

        # Atualiza o dicionário com os valores reais
        for item in status_do_banco:
            if item['Status'] in status_validos:
                status_validos[item['Status']] = item['quantidade']
        
        cursor.close()
        conn.close()
        
        # Formata para lista de objetos (padrão que gráficos gostam)
        status_final = [{"Status": k, "quantidade": v} for k, v in status_validos.items()]
        return jsonify(status_final)

    except Exception as e:
        print(f"[Dashboard] Erro em /om/status: {e}")
        return jsonify({"error": "Falha ao buscar estado das OMs"}), 500


# -----------------------------------------------------------------------------
# STATUS DOS ATIVOS
# -----------------------------------------------------------------------------
@bp.route('/ativos/status', methods=['GET'])
def get_ativos_status():
    """
    Retorna a contagem de ativos por status (ativo, inativo, manutenção, condenado).
    """
    try:
        conn = connect_db("sgmi")
        cursor = conn.cursor(dictionary=True)

        status_validos = {
            "ativo": 0,
            "inativo": 0,
            "em manutenção": 0,
            "condenado": 0
        }

        query = "SELECT Status, COUNT(*) AS quantidade FROM ativos GROUP BY Status"
        cursor.execute(query)
        status_do_banco = cursor.fetchall()
        
        for item in status_do_banco:
            # .lower() garante que "Ativo" e "ativo" sejam contados iguais
            st_key = item['Status'].lower() if item['Status'] else ""
            if st_key in status_validos:
                status_validos[st_key] = item['quantidade']

        cursor.close()
        conn.close()

        status_final = [{"Status": k, "quantidade": v} for k, v in status_validos.items()]
        return jsonify(status_final)

    except Exception as e:
        print(f"[Dashboard] Erro em /ativos/status: {e}")
        return jsonify({"error": "Falha ao buscar status dos ativos"}), 500


# -----------------------------------------------------------------------------
# KPI DE ESTOQUE (Entrada vs Saída)
# -----------------------------------------------------------------------------
@bp.route("/estoque_pecas", methods=["GET"])
def get_estoque_pecas():
    """
    Calcula:
    - Estoque Atual (Soma do campo Estoque)
    - Total Saída (Soma das peças usadas em Ordens)
    - Total Entrada (Estoque Atual + Saída)
    """
    try:
        conn = connect_db("sgmi") # Adicionei "sgmi" explícito por segurança
        cursor = conn.cursor(dictionary=True)
        
        # Estoque atual nas prateleiras
        cursor.execute("SELECT COALESCE(SUM(Estoque), 0) AS total_estoque FROM pecas")
        estoque_atual = cursor.fetchone()["total_estoque"]
        
        # O que já foi gasto em ordens
        cursor.execute("SELECT COALESCE(SUM(Quantidade), 0) AS total_saida FROM ordens_pecas")
        total_saida = cursor.fetchone()["total_saida"]
        
        total_entrada = estoque_atual + total_saida
        
        cursor.close()
        conn.close()
        
        return jsonify({
            "estoque": float(estoque_atual), # Garante que seja número JSON safe
            "entrada": float(total_entrada),
            "saida": float(total_saida)
        })

    except Exception as e:
        print(f"[Dashboard] Erro em /estoque_pecas: {e}")
        return jsonify({"error": str(e)}), 500


# -----------------------------------------------------------------------------
# LISTA DE ALERTAS (Ativos com Problema + Última OS)
# -----------------------------------------------------------------------------
@bp.route('/ativos/alertas', methods=['GET'])
def get_ativos_com_alerta():
    """
    Retorna lista de ativos NÃO-ATIVOS e o motivo (descrição da última OS).
    """
    try:
        conn = connect_db("sgmi")
        cursor = conn.cursor(dictionary=True)

        # Query complexa para pegar a última OS de cada ativo
        query = """
            SELECT 
                a.id_Ativo, 
                a.Nome_Ativo, 
                a.Status, 
                latest_os.Descricao_Problema AS Ultima_Ocorrencia
            FROM 
                ativos a
            LEFT JOIN 
                (
                    SELECT 
                        os1.id_Ativo, 
                        os1.Descricao_Problema
                    FROM 
                        ordens_servico os1
                    INNER JOIN 
                        (
                            SELECT 
                                id_Ativo, 
                                MAX(Data_Abertura) AS MaxData
                            FROM 
                                ordens_servico
                            GROUP BY 
                                id_Ativo
                        ) os2 ON os1.id_Ativo = os2.id_Ativo AND os1.Data_Abertura = os2.MaxData
                ) latest_os ON a.id_Ativo = latest_os.id_Ativo
            WHERE 
                a.Status != 'ativo'
        """
        cursor.execute(query)
        ativos_db = cursor.fetchall()
        cursor.close()
        conn.close()

        # Cores para o frontend (Tailwind classes ou Hex)
        cores_status = {
            'inativo': '#9ca3af',      # Cinza
            'em manutenção': '#facc15', # Amarelo
            'condenado': '#f87171'      # Vermelho
        }

        resultado_final = []
        for ativo in ativos_db:
            st_lower = ativo['Status'].lower()
            resultado_final.append({
                "id": ativo['id_Ativo'],
                "nome": ativo['Nome_Ativo'],
                "status": ativo['Status'],
                "ultimo_erro": ativo.get('Ultima_Ocorrencia') or "Nenhuma ordem de serviço recente encontrada.",
                "cor_status": cores_status.get(st_lower, '#6b7280')
            })

        return jsonify(resultado_final)

    except Exception as e:
        print(f"[Dashboard] Erro em /ativos/alertas: {e}")
        return jsonify({"error": "Falha ao buscar ativos com alerta"}), 500