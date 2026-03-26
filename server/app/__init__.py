from flask import Flask
from app.extensions import cors

def create_app():
    app = Flask(__name__)
    app.config.from_object("config.Config")

    cors.init_app(app)

    # Registrar blueprints
    from app.api import bp as api_bp
    app.register_blueprint(api_bp, url_prefix="/api")

    return app
