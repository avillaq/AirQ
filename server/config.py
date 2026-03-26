import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()
basedir = Path(__file__).parent
load_dotenv(basedir / '.env')

class Config:
  SECRET_KEY = os.getenv("SECRET_KEY")
