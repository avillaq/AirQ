from flask_cors import CORS
from dotenv import load_dotenv
import os

load_dotenv()

allowed_origins = [
    os.getenv('DEVELOPMENT_HOST'),
    os.getenv('PRODUCTION_HOST'),
    "http://localhost:3000",
]

# cors configuration
cors = CORS(  
    resources={
        r"/api/*": {
            "origins": [origin for origin in allowed_origins if origin],
            "methods": ["GET", "POST", "PUT", "DELETE"],
            "allow_headers": ["Content-Type", "Authorization"],
            "expose_headers": ["Content-Range", "X-Content-Range"],
            "supports_credentials": True
        }
    }
)

