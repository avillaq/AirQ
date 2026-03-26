import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()
basedir = Path(__file__).parent
load_dotenv(basedir / '.env')

class Config:
  SECRET_KEY = os.getenv("SECRET_KEY")
  SQLALCHEMY_DATABASE_URI = os.getenv('SQLALCHEMY_DATABASE_URI')
  SQLALCHEMY_TRACK_MODIFICATIONS = False
  MAIL_SERVER = 'smtp.gmail.com'
  MAIL_PORT = 587
  MAIL_USE_TLS = True
  MAIL_USERNAME = os.getenv("MAIL_USERNAME")
  MAIL_PASSWORD = os.getenv("MAIL_PASSWORD")
