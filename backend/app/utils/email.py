import smtplib
from email.message import EmailMessage
from app.config import settings

def send_email(subject: str, recipients: list[str], text_content: str, html_content: str | None = None):
    """Отправка письма через SMTP."""
    if not settings.smtp_host:
        print("⚠️ SMTP не настроен, письмо не будет отправлено.")
        print(f"Тема: {subject}")
        print(f"Текст: {text_content}")
        return

    msg = EmailMessage()
    msg['Subject'] = subject
    msg['From'] = settings.emails_from
    msg['To'] = ", ".join(recipients)
    msg.set_content(text_content)
    
    if html_content:
        msg.add_alternative(html_content, subtype='html')

    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
            if settings.smtp_password:
                server.starttls()
                server.login(settings.smtp_user, settings.smtp_password)
            server.send_message(msg)
    except Exception as e:
        print(f"❌ Ошибка при отправке письма: {e}")
        raise e
