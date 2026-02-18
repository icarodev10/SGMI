"""
Módulo utilitário responsável por toda a lógica de envio de e-mails.
"""
import smtplib
import random
import string
import re
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from flask_mail import Message

# Importações de banco de dados
from app.database.conectar import connect_db

mail = None

def set_mail(mail_obj):
    """
    Recebe e armazena a instância do Flask-Mail inicializada no app.py.
    """
    global mail
    mail = mail_obj

# -----------------------------------------------------------------------------
# AUXILIARES
# -----------------------------------------------------------------------------
def get_gestores_emails():
    """Busca e-mails de todos os gestores/admins."""
    conn = connect_db()
    cursor = conn.cursor(dictionary=True)
    try:
        # Ajuste a query conforme sua estrutura de Tipo_Usuario
        cursor.execute("SELECT Email FROM cadastro_funcionario WHERE Tipo_Usuario IN ('Gestor', 'Administrador')")
        gestores = cursor.fetchall()
        return [g['Email'] for g in gestores if g['Email']]
    except Exception as e:
        print(f"Erro ao buscar gestores: {e}")
        return []
    finally:
        conn.close()



def gerar_senha(tamanho=10):
    chars = string.ascii_letters + string.digits
    return ''.join(random.choice(chars) for _ in range(tamanho))

# -----------------------------------------------------------------------------
# ENVIO DE E-MAILS (FLASK-MAIL)
# -----------------------------------------------------------------------------

def enviar_email_funcionario(destino, nome_funcionario, id_ordem):
    """Notifica funcionário sobre nova ordem (com links AR)."""
    if not mail:
        print("[Erro] Flask-Mail não configurado.")
        return

    try:
        print(f"Preparando e-mail OS #{id_ordem} para {destino}...")
    

        msg = Message(
            subject=f"Você foi atribuído à Ordem de Serviço #{id_ordem}",
            sender='teamcyphercompany@gmail.com',
            recipients=[destino]
        )

        msg.html = f"""
        <h3>Olá, {nome_funcionario}</h3>
        <p>Você foi vinculado à OS <strong>#{id_ordem}</strong>.</p>
        <p>Att, Equipe Cypher</p>
        """
        
        mail.send(msg)
        print("E-mail enviado!")

    except Exception as e:
        print(f"Erro ao enviar email funcionário: {e}")

def enviar_email_boas_vindas(email_destino, nome_funcionario, dados, senha_original):
    """Envia credenciais de acesso."""
    if not mail: return

    try:
        msg = Message(
            "Bem-vindo ao CYPHER",
            sender='teamcyphercompany@gmail.com',
            recipients=[email_destino]
        )
        msg.html = f"""
        <h3>Bem-vindo, {nome_funcionario}!</h3>
        <p>Suas credenciais:</p>
        <p><strong>Login:</strong> {email_destino}</p>
        <p><strong>Senha:</strong> {senha_original}</p>
        <p>Altere sua senha no primeiro acesso.</p>
        """
        mail.send(msg)
        print(f"Boas vindas enviado para {email_destino}")
    except Exception as e:
        print(f"Erro boas vindas: {e}")

def enviar_email_solicitacao(solicitacao):
    """Notifica gestores e admins sobre nova solicitação."""
    if not mail: return

    try:
        gestores = get_gestores_emails()
        print(f"--- GESTORES --- {gestores}")
        if not gestores: return

        msg = Message(
            f"Nova Solicitação: {solicitacao.get('Titulo', 'Sem título')}",
            sender='teamcyphercompany@gmail.com',
            recipients=gestores
        )
        msg.html = f"""
        <h3>Nova Solicitação Pendente</h3>
        <p><strong>Título:</strong> {solicitacao.get('Titulo')}</p>
        <p><strong>Prioridade:</strong> {solicitacao.get('Prioridade')}</p>
        <p><strong>Problema:</strong> {solicitacao.get('Problema')}</p>
        """
        mail.send(msg)
        print("Notificação de solicitação enviada aos gestores.")
    except Exception as e:
        print(f"Erro email solicitação: {e}")

# -----------------------------------------------------------------------------
# ENVIO DE E-MAILS (SMTP PURO - LEGADO/BACKUP)
# -----------------------------------------------------------------------------
def enviar_email_empresa(email_destino, email_login, senha_gerada, nome_empresa):
    """Envia credenciais da empresa via SMTP direto (sem Flask-Mail)."""
    remetente = "teamcyphercompany@gmail.com"
    senha_app = "basw bmpz auev htzs"  # SUA SENHA DE APP

    msg = MIMEMultipart()
    msg["From"] = remetente
    msg["To"] = email_destino
    msg["Subject"] = "Acesso ao Sistema Cypher"

    corpo = f"""
    Olá, {nome_empresa}!
    Login: {email_login}
    Senha: {senha_gerada}
    """
    msg.attach(MIMEText(corpo, "plain"))

    try:
        with smtplib.SMTP("smtp.gmail.com", 587) as server:
            server.starttls()
            server.login(remetente, senha_app)
            server.send_message(msg)
            print("Email empresa enviado (SMTP)!")
            return True
    except Exception as e:
        print(f"Erro SMTP empresa: {e}")
        return False