from flask_mail import Message
from flask import current_app
from concurrent.futures import ThreadPoolExecutor
import smtplib

# 5 threads for sending emails
email_executor = ThreadPoolExecutor(max_workers=5, thread_name_prefix="email-")

class EmailService:
    def __init__(self):
        self.executor = email_executor
    
    def send_async(self, recipient, subject, body):
        app = current_app._get_current_object()
        self.executor.submit(self._send_sync, app, recipient, subject, body)
    
    def _send_sync(self, app, recipient, subject, body):
        with app.app_context():
            try:
                mail = current_app.extensions.get("mail")
                if not mail:
                    print("Flask-Mail is not initialized.")
                    return False
                    
                msg = Message(
                    subject,
                    sender=current_app.config["MAIL_USERNAME"],
                    recipients=[recipient]
                )
                msg.body = body
                
                with current_app.app_context():
                    mail.send(msg)
                    return True
                    
            except smtplib.SMTPAuthenticationError as e:
                print(f"SMTP authentication error: {str(e)}")
                return False
            except Exception as e:
                print(f"Error sending email to {recipient}: {str(e)}")
                return False
    
    def send_aqi_alert(self, recipient, first_name, last_name, aqi, location):
        if aqi <= 50:
            level = "Good"
            emoji = "🟢"
            color = "green"
            recommendation = "Air quality is satisfactory. Enjoy your outdoor activities!"
        elif aqi <= 100:
            level = "Moderate"
            emoji = "🟡"
            color = "yellow"
            recommendation = "Air quality is acceptable. Some pollutants may be a concern for sensitive groups."
        elif aqi <= 150:
            level = "Unhealthy for Sensitive Groups"
            emoji = "🟠"
            color = "orange"
            recommendation = "Sensitive groups should limit outdoor activities."
        elif aqi <= 200:
            level = "Unhealthy"
            emoji = "🔴"
            color = "red"
            recommendation = "Everyone may experience health effects. Avoid intense outdoor activities."
        elif aqi <= 300:
            level = "Very Unhealthy"
            emoji = "🟣"
            color = "purple"
            recommendation = "Health alert: Everyone may experience serious effects. Stay indoors."
        else:
            level = "Hazardous"
            emoji = "⚫"
            color = "maroon"
            recommendation = "Health emergency: Everyone is at risk. Avoid going outside."
        
        subject = f"{emoji} Air Quality Alert - {level} in {location}"
        
        body = f"""
                    Hi {first_name} {last_name},

                    {emoji} AIR QUALITY ALERT {emoji}

                    Air quality in {location} has reached levels requiring your attention:

                    Air Quality Index (AQI): {aqi:.0f}
                    Location: {location}
                    Level: {level} ({color})

                    Health Recommendation:
                    {recommendation}

                    Preventive Measures:
                    • Stay informed about air quality
                    • Close doors and windows
                    • Use a mask if you must go outside
                    • Consider using air purifiers indoors

                    Visit our platform for more information.

                    Stay safe,
                    NASA Misti Skies Team
                """
    
        self.send_async(recipient, subject, body)

email_service = EmailService()