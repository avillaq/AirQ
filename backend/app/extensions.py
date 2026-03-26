from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_cors import CORS
from flask_mail import Mail
from dotenv import load_dotenv
import os

load_dotenv()

# Connection to the database
db = SQLAlchemy()

# Database migrations
migrate = Migrate()

# Mail configuration
mail = Mail()


# cors configuration
cors = CORS(  
    resources={
        r"/api/*": {
            "origins": [
                os.getenv('DEVELOPMENT_HOST'),
                os.getenv('PRODUCTION_HOST'),
                "http://localhost:3000"
            ],
            "methods": ["GET", "POST", "PUT", "DELETE"],
            "allow_headers": ["Content-Type", "Authorization"],
            "expose_headers": ["Content-Range", "X-Content-Range"],
            "supports_credentials": True
        }
    }
)

