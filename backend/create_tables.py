import pyodbc  # or pymssql
from typing import Optional

def initialize_database(connection_string: str):
    """Initialize SQL Server database with required tables"""
    conn = pyodbc.connect(connection_string)
    cursor = conn.cursor()
    
    try:
        # Create accounting_transactions first (referenced by foreign key)
        cursor.execute("""
            IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'accounting_transactions')
            BEGIN
                CREATE TABLE accounting_transactions (
                    id INT PRIMARY KEY IDENTITY(1,1),
                    user_id NVARCHAR(255) NOT NULL,
                    transaction_date DATE NOT NULL,
                    description NVARCHAR(MAX),
                    amount DECIMAL(15, 2) NOT NULL,
                    reference NVARCHAR(255),
                    matched BIT DEFAULT 0,
                    created_at DATETIME2 DEFAULT GETDATE()
                )
            END
        """)
        
        cursor.execute("""
            IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_accounting_user_unmatched')
            BEGIN
                CREATE INDEX idx_accounting_user_unmatched 
                    ON accounting_transactions(user_id, matched)
            END
        """)
        
        # Create bank_transactions table
        cursor.execute("""
            IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'bank_transactions')
            BEGIN
                CREATE TABLE bank_transactions (
                    id INT PRIMARY KEY IDENTITY(1,1),
                    user_id NVARCHAR(255) NOT NULL,
                    transaction_date DATE NOT NULL,
                    description NVARCHAR(MAX),
                    amount DECIMAL(15, 2) NOT NULL,
                    reference NVARCHAR(255),
                    matched BIT DEFAULT 0,
                    matched_transaction_id INT,
                    created_at DATETIME2 DEFAULT GETDATE(),
                    CONSTRAINT FK_bank_matched_transaction 
                        FOREIGN KEY (matched_transaction_id) 
                        REFERENCES accounting_transactions(id)
                )
            END
        """)
        
        cursor.execute("""
            IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_bank_user_unmatched')
            BEGIN
                CREATE INDEX idx_bank_user_unmatched 
                    ON bank_transactions(user_id, matched)
            END
        """)
        
        conn.commit()
        print("Database tables created successfully")
        
    except Exception as e:
        conn.rollback()
        print(f"Error initializing database: {e}")
        raise
    finally:
        conn.close()

# Usage
if __name__ == "__main__":
    # Update with your connection string
    conn_str = "Driver={ODBC Driver 17 for SQL Server};Server=your_server;Database=your_db;UID=user;PWD=pass"
    initialize_database(conn_str)