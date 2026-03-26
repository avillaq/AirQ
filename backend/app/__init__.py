from flask import Flask
from app.extensions import db, cors, migrate, mail

def create_app():
    app = Flask(__name__)
    app.config.from_object("config.Config")

    db.init_app(app)
    migrate.init_app(app, db)
    cors.init_app(app)
    mail.init_app(app) 

    # Registrar blueprints
    from app.api import bp as api_bp
    app.register_blueprint(api_bp, url_prefix="/api")

    return app
