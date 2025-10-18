# backend/config.py
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_CONFIG = {
    "driver": os.getenv("DB_DRIVER", "{ODBC Driver 17 for SQL Server}"),
    "server": os.getenv("DB_SERVER", "localhost"),
    "database": os.getenv("DB_NAME", "InsightBridge"),
    "username": os.getenv("DB_USER", ""),
    "password": os.getenv("DB_PASSWORD", ""),
    "trusted_connection": os.getenv("DB_TRUSTED_CONNECTION", "yes")
}

def get_connection_string():
    if DATABASE_CONFIG["trusted_connection"].lower() == "yes":
        return (
            f"Driver={DATABASE_CONFIG['driver']};"
            f"Server={DATABASE_CONFIG['server']};"
            f"Database={DATABASE_CONFIG['database']};"
            f"Trusted_Connection=yes;"
        )
    else:
        return (
            f"Driver={DATABASE_CONFIG['driver']};"
            f"Server={DATABASE_CONFIG['server']};"
            f"Database={DATABASE_CONFIG['database']};"
            f"UID={DATABASE_CONFIG['username']};"
            f"PWD={DATABASE_CONFIG['password']};"
        )