# Database connections for La Bague Impériale
from motor.motor_asyncio import AsyncIOMotorClient
from contextlib import contextmanager
import pymysql
import os
from pathlib import Path
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# MySQL connection config for cigars database
MYSQL_CONFIG = {
    'host': 'gb60402-001.eu.clouddb.ovh.net',
    'port': 35741,
    'user': 'cigare20',
    'password': 'Barthe20167',
    'database': 'CIGARE',
    'charset': 'utf8mb4',
    'use_unicode': True
}

@contextmanager
def get_mysql_connection():
    """Get MySQL connection for cigars database"""
    connection = pymysql.connect(**MYSQL_CONFIG)
    try:
        yield connection
    finally:
        connection.close()
