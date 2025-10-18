"""Database connection management - Azure SQL"""
import pyodbc
import logging
import os
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

class DatabaseConfig:
    """Database configuration from environment variables"""
    DRIVER = os.getenv("DB_DRIVER", "{ODBC Driver 17 for SQL Server}")
    SERVER = os.getenv("DB_SERVER") or os.getenv("AZURE_SQL_SERVER")
    DATABASE = os.getenv("DB_NAME") or os.getenv("AZURE_SQL_DATABASE")
    USERNAME = os.getenv("DB_USERNAME") or os.getenv("AZURE_SQL_USERNAME")
    PASSWORD = os.getenv("DB_PASSWORD") or os.getenv("AZURE_SQL_PASSWORD")
    
    @classmethod
    def validate_config(cls):
        """Validate that all required config is present"""
        missing = []
        if not cls.SERVER:
            missing.append("DB_SERVER or AZURE_SQL_SERVER")
        if not cls.DATABASE:
            missing.append("DB_NAME or AZURE_SQL_DATABASE")
        if not cls.USERNAME:
            missing.append("DB_USERNAME or AZURE_SQL_USERNAME")
        if not cls.PASSWORD:
            missing.append("DB_PASSWORD or AZURE_SQL_PASSWORD")
        
        if missing:
            raise ValueError(f"Missing required environment variables: {', '.join(missing)}")
    
    @classmethod
    def get_connection_string(cls):
        """Generate Azure SQL Server connection string"""
        cls.validate_config()
        
        # Azure SQL connection string - modern format
        connection_string = (
            "DRIVER={ODBC Driver 17 for SQL Server};"
            f"SERVER=tcp:{cls.SERVER},1433;"
            f"DATABASE={cls.DATABASE};"
            f"UID={cls.USERNAME};"  # NO @server suffix
            f"PWD={cls.PASSWORD};"
            "Encrypt=yes;"
            "TrustServerCertificate=no;"
            "Connection Timeout=30;"
        )
        
        return connection_string

def get_db_connection():
    """Get Azure SQL Database connection"""
    try:
        logger.info(f"🔌 Attempting connection to: {DatabaseConfig.SERVER}")
        
        # Connect using master database context
        conn = pyodbc.connect(
            driver='{ODBC Driver 17 for SQL Server}',
            server=f'{DatabaseConfig.SERVER}',  # Remove tcp: prefix
            database=DatabaseConfig.DATABASE,
            uid=DatabaseConfig.USERNAME,
            pwd=DatabaseConfig.PASSWORD,
            encrypt='yes',
            TrustServerCertificate='no',
            timeout=30
        )
        
        logger.info(f"✅ Successfully connected to Azure SQL: {DatabaseConfig.DATABASE}")
        return conn
        
    except pyodbc.Error as e:
        error_msg = str(e)
        logger.error(f"❌ Azure SQL connection failed: {error_msg}")
        raise Exception(f"Database connection failed: {str(e)}")


def test_connection():
    """Test Azure SQL connection and verify tables exist"""
    try:
        logger.info("=" * 60)
        logger.info("Testing Azure SQL Database Connection")
        logger.info("=" * 60)
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Test 1: Get database name
        cursor.execute("SELECT DB_NAME()")
        db_name = cursor.fetchone()[0]
        logger.info(f"✅ Connected to database: {db_name}")
        
        # Test 2: Get SQL Server version
        cursor.execute("SELECT @@VERSION")
        version = cursor.fetchone()[0]
        logger.info(f"✅ SQL Server: {version[:80]}...")
        
        # Test 3: Check for required tables
        cursor.execute("""
            SELECT TABLE_NAME 
            FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_TYPE = 'BASE TABLE'
            ORDER BY TABLE_NAME
        """)
        tables = [row[0] for row in cursor.fetchall()]
        logger.info(f"✅ Found {len(tables)} tables: {tables}")
        
        # Test 4: Check specific reconciliation tables
        required_tables = ['bank_transactions', 'ledger_entries', 'reconciliation_matches']
        missing_tables = [t for t in required_tables if t not in tables]
        
        if missing_tables:
            logger.warning(f"⚠️ Missing required tables: {missing_tables}")
        else:
            logger.info(f"✅ All required reconciliation tables exist")
        
        conn.close()
        logger.info("=" * 60)
        logger.info("✅ Connection test PASSED")
        logger.info("=" * 60)
        
        return True
        
    except Exception as e:
        logger.error("=" * 60)
        logger.error(f"❌ Connection test FAILED: {e}")
        logger.error("=" * 60)
        return False

# For compatibility with code that might import SessionLocal
# This is a simple factory function
def SessionLocal():
    """Compatibility function - returns a new database connection"""
    return get_db_connection()

if __name__ == "__main__":
    # Set up logging for direct execution
    logging.basicConfig(
        level=logging.INFO,
        format='%(levelname)s:%(name)s:%(message)s'
    )
    
    print("\n🔍 Testing Azure SQL Connection...\n")
    
    if test_connection():
        print("\n✅ SUCCESS! Database connection is working.\n")
        exit(0)
    else:
        print("\n❌ FAILED! Check the errors above.\n")
        exit(1)

"""Add these lines to the END of your existing database.py file"""

# ============================================================================
# COMPATIBILITY EXPORTS - Add this to the end of your database.py
# ============================================================================

# For code that tries to import SessionLocal
def SessionLocal():
    """Compatibility function - returns a new database connection"""
    return get_db_connection()

# For code that tries to import engine (even though we don't use SQLAlchemy)
# This is just a dummy to prevent import errors
class DummyEngine:
    """Dummy engine for compatibility - not actually used"""
    pass

engine = DummyEngine()

# ============================================================================
# END OF COMPATIBILITY EXPORTS
# ============================================================================