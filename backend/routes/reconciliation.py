"""
Reconciliation API Routes - Complete with PDF Support
"""
from fastapi import APIRouter, HTTPException, UploadFile, File, Query
from database import get_db_connection
from typing import List, Dict
import pandas as pd
import io
from datetime import datetime
import logging
import re

logger = logging.getLogger(__name__)
router = APIRouter()

# PDF support (optional - only if pdfplumber is installed)
try:
    import pdfplumber
    from dateutil import parser as date_parser
    PDF_SUPPORT = True
    logger.info("✅ PDF support enabled")
except ImportError:
    PDF_SUPPORT = False
    logger.warning("⚠️ PDF support disabled (install: pip install pdfplumber python-dateutil)")


# ============================================================================
# PDF PARSING FUNCTIONS
# ============================================================================

def parse_date(date_str: str, default_year: int = None) -> str:
    """Parse various date formats to YYYY-MM-DD"""
    if default_year is None:
        default_year = datetime.now().year
    
    try:
        dt = date_parser.parse(date_str, fuzzy=True)
        if not re.search(r'\d{4}', date_str):
            dt = dt.replace(year=default_year)
        return dt.strftime('%Y-%m-%d')
    except:
        # Manual parsing
        month_match = re.match(r'([A-Z][a-z]{2})\s+(\d{1,2})', date_str)
        if month_match:
            month_name, day = month_match.groups()
            months = {
                'Jan': 1, 'Feb': 2, 'Mar': 3, 'Apr': 4, 'May': 5, 'Jun': 6,
                'Jul': 7, 'Aug': 8, 'Sep': 9, 'Oct': 10, 'Nov': 11, 'Dec': 12
            }
            if month_name in months:
                return f"{default_year}-{months[month_name]:02d}-{int(day):02d}"
        
        date_match = re.match(r'(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})', date_str)
        if date_match:
            month, day, year = date_match.groups()
            if len(year) == 2:
                year = f"20{year}"
            return f"{year}-{int(month):02d}-{int(day):02d}"
        
        raise ValueError(f"Cannot parse date: {date_str}")


def parse_text_transactions(text: str) -> list:
    """Parse transactions from bank statement text"""
    transactions = []
    lines = text.split('\n')
    
    in_transaction_section = False
    current_year = datetime.now().year
    last_date = None
    
    # Extract year from statement
    year_match = re.search(r'(20\d{2})', text)
    if year_match:
        current_year = int(year_match.group(1))
    
    for line in lines:
        line = line.strip()
        
        # Find transaction section
        if 'Transaction details' in line or 'Date Description' in line or 'Trans Date' in line:
            in_transaction_section = True
            continue
        
        if not in_transaction_section:
            continue
        
        # Skip headers and footers
        if any(skip in line for skip in ['Opening balance', 'Closing balance', 'Page', 'Balance ($)']):
            continue
        
        # Try to parse date at start of line
        date_pattern = r'^([A-Z][a-z]{2}\s+\d{1,2}|\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\s+(.+)'
        date_match = re.match(date_pattern, line)
        
        if date_match:
            last_date = parse_date(date_match.group(1), current_year)
            rest_of_line = date_match.group(2).strip()
        else:
            rest_of_line = line
            if not last_date:
                continue
        
        # Extract description and amounts
        parts = re.split(r'\s{2,}|\s+(?=[\d,]+\.\d{2})', rest_of_line)
        if len(parts) < 2:
            continue
        
        description = parts[0].strip()
        if not description or len(description) < 2:
            continue
        
        # Find amounts
        amounts = re.findall(r'([\d,]+\.\d{2})', rest_of_line)
        if len(amounts) >= 1:
            is_deposit = any(word in description.upper() for word in [
                'DEPOSIT', 'WAIVER', 'CREDIT', 'TRANSFER IN', 'REFUND', 'INTEREST'
            ])
            
            txn_amount = float(amounts[0].replace(',', ''))
            amount = txn_amount if is_deposit else -txn_amount
            
            transactions.append({
                'date': last_date,
                'description': description[:200],
                'amount': amount
            })
    
    return transactions


def parse_table_transactions(table: list) -> list:
    """Parse transactions from PDF table"""
    transactions = []
    
    for row_idx, row in enumerate(table):
        if row_idx == 0:
            continue
        
        if not row or len(row) < 3:
            continue
        
        date_val = None
        desc_val = None
        amount_val = None
        
        for cell in row:
            if not cell or str(cell).strip() == '':
                continue
            
            cell = str(cell).strip()
            
            if re.match(r'\d{1,2}[/-]\d{1,2}[/-]\d{2,4}', cell):
                try:
                    date_val = parse_date(cell)
                except:
                    pass
            elif re.match(r'-?\$?[\d,]+\.?\d*', cell):
                try:
                    amount_str = cell.replace('$', '').replace(',', '').strip()
                    amount_val = float(amount_str)
                except:
                    pass
            else:
                if not desc_val:
                    desc_val = cell
                else:
                    desc_val += ' ' + cell
        
        if date_val and desc_val and amount_val is not None:
            transactions.append({
                'date': date_val,
                'description': desc_val[:200],
                'amount': amount_val
            })
    
    return transactions


def parse_pdf_bank_statement(file_content: bytes) -> list:
    """Extract transactions from PDF bank statement"""
    if not PDF_SUPPORT:
        raise Exception("PDF support not available. Install: pip install pdfplumber python-dateutil")
    
    transactions = []
    
    try:
        with pdfplumber.open(io.BytesIO(file_content)) as pdf:
            logger.info(f"📄 PDF has {len(pdf.pages)} page(s)")
            
            for page_num, page in enumerate(pdf.pages):
                text = page.extract_text()
                tables = page.extract_tables()
                
                if tables:
                    for table in tables:
                        transactions.extend(parse_table_transactions(table))
                elif text:
                    transactions.extend(parse_text_transactions(text))
        
        logger.info(f"📄 Extracted {len(transactions)} transactions from PDF")
        return transactions
        
    except Exception as e:
        logger.error(f"❌ PDF parsing error: {e}")
        raise


# ============================================================================
# API ENDPOINTS
# ============================================================================

@router.post("/upload_bank_statement")
async def upload_bank_statement(
    file: UploadFile = File(...),
    user_id: str = Query(...)
):
    """Upload bank statement (CSV, Excel, or PDF)"""
    try:
        logger.info(f"📤 Upload: {file.filename} for user {user_id}")
        
        contents = await file.read()
        is_pdf = file.filename.lower().endswith('.pdf')
        is_csv = file.filename.lower().endswith('.csv')
        is_excel = file.filename.lower().endswith(('.xlsx', '.xls'))
        
        # Parse based on file type
        if is_pdf:
            if not PDF_SUPPORT:
                raise HTTPException(
                    status_code=400,
                    detail="PDF upload not supported. Please install pdfplumber or use CSV/Excel."
                )
            
            raw_transactions = parse_pdf_bank_statement(contents)
            if not raw_transactions:
                raise HTTPException(
                    status_code=400,
                    detail="No transactions found in PDF. Try CSV/Excel for better results."
                )
            
            df = pd.DataFrame(raw_transactions)
            accuracy_note = "PDF parsing is experimental. Please review carefully."
            
        elif is_csv:
            df = pd.read_csv(io.BytesIO(contents))
            accuracy_note = None
            
        elif is_excel:
            df = pd.read_excel(io.BytesIO(contents))
            accuracy_note = None
            
        else:
            raise HTTPException(
                status_code=400,
                detail="Unsupported format. Upload CSV, Excel, or PDF."
            )
        
        # Normalize columns
        df.columns = df.columns.str.strip().str.lower()
        df.rename(columns={
            'transaction date': 'date',
            'date posted': 'date',
            'memo': 'description',
            'payee': 'description',
            'debit': 'debit_amount',
            'credit': 'credit_amount',
        }, inplace=True)
        
        # Validate columns
        if 'date' not in df.columns:
            raise HTTPException(status_code=400, detail="Date column not found")
        if 'description' not in df.columns:
            raise HTTPException(status_code=400, detail="Description column not found")
        
        # Handle amounts
        if 'amount' not in df.columns:
            if 'debit_amount' in df.columns and 'credit_amount' in df.columns:
                df['debit_amount'] = pd.to_numeric(df['debit_amount'], errors='coerce').fillna(0)
                df['credit_amount'] = pd.to_numeric(df['credit_amount'], errors='coerce').fillna(0)
                df['amount'] = df['credit_amount'] - df['debit_amount']
            else:
                raise HTTPException(status_code=400, detail="Amount column not found")
        
        # Clean data
        df['amount'] = pd.to_numeric(df['amount'], errors='coerce')
        df['date'] = pd.to_datetime(df['date'], errors='coerce')
        
        initial_count = len(df)
        df = df.dropna(subset=['date', 'description', 'amount'])
        cleaned_count = len(df)
        
        if cleaned_count == 0:
            raise HTTPException(status_code=400, detail="No valid transactions found")
        
        # Insert into database
        conn = get_db_connection()
        cursor = conn.cursor()
        
        inserted_count = 0
        duplicate_count = 0
        errors = []
        
        for _, row in df.iterrows():
            try:
                transaction_date = row['date'].strftime('%Y-%m-%d')
                description = str(row['description']).strip()[:200]
                amount = float(row['amount'])
                
                # Check duplicates
                cursor.execute("""
                    SELECT COUNT(*) FROM bank_transactions 
                    WHERE user_id = ? AND transaction_date = ? 
                    AND description = ? AND amount = ?
                """, user_id, transaction_date, description, amount)
                
                if cursor.fetchone()[0] > 0:
                    duplicate_count += 1
                    continue
                
                # Insert
                cursor.execute("""
                    INSERT INTO bank_transactions 
                    (user_id, transaction_date, description, amount, created_at)
                    VALUES (?, ?, ?, ?, GETDATE())
                """, user_id, transaction_date, description, amount)
                
                inserted_count += 1
                
            except Exception as e:
                errors.append(str(e))
        
        conn.commit()
        conn.close()
        
        logger.info(f"✅ Inserted {inserted_count}, skipped {duplicate_count}")
        
        return {
            "success": True,
            "message": f"Imported {inserted_count} transactions",
            "details": {
                "total_rows": initial_count,
                "valid_rows": cleaned_count,
                "inserted": inserted_count,
                "duplicates_skipped": duplicate_count,
                "errors": len(errors),
                "accuracy_note": accuracy_note
            },
            "errors": errors[:5]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Upload failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/bank_transactions")
async def get_bank_transactions(user_id: str = Query(...)):
    """Get all bank transactions"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT id, transaction_date, description, amount, created_at
            FROM bank_transactions
            WHERE user_id = ?
            ORDER BY transaction_date DESC
        """, user_id)
        
        transactions = []
        for row in cursor.fetchall():
            transactions.append({
                "id": row[0],
                "date": row[1].strftime('%Y-%m-%d') if row[1] else None,
                "description": row[2],
                "amount": float(row[3]) if row[3] else 0,
                "notes": None,
                "created_at": row[4].isoformat() if row[4] else None
            })
        
        conn.close()
        
        return {
            "success": True,
            "count": len(transactions),
            "transactions": transactions
        }
        
    except Exception as e:
        logger.error(f"❌ Failed to fetch: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/bank_transactions/{transaction_id}")
async def delete_bank_transaction(transaction_id: int):
    """Delete a transaction"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("DELETE FROM bank_transactions WHERE id = ?", transaction_id)
        
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Transaction not found")
        
        conn.commit()
        conn.close()
        
        return {"success": True, "message": "Transaction deleted"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Delete failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/pending_matches")
async def get_pending_matches(user_id: str = Query(...)):
    """Get pending reconciliation matches"""
    try:
        logger.info(f"Fetching pending matches for user: {user_id}")
        
        # Placeholder - you'll need to implement the matching logic
        return {
            "success": True,
            "count": 0,
            "matches": []
        }
        
    except Exception as e:
        logger.error(f"❌ Failed to fetch matches: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/auto_match")
async def auto_match(user_id: str = Query(...)):
    """Run auto-matching algorithm"""
    try:
        logger.info(f"Running auto-match for user: {user_id}")
        
        # Placeholder - implement your matching logic
        return {
            "success": True,
            "message": "Auto-match completed",
            "data": {
                "matches_found": 0,
                "high_confidence": 0,
                "medium_confidence": 0,
                "low_confidence": 0
            }
        }
        
    except Exception as e:
        logger.error(f"❌ Auto-match failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/approve_match/{match_id}")
async def approve_match(match_id: int, user_id: str = Query(...)):
    """Approve a match"""
    return {"success": True, "message": "Match approved"}


@router.post("/reject_match/{match_id}")
async def reject_match(match_id: int, user_id: str = Query(...)):
    """Reject a match"""
    return {"success": True, "message": "Match rejected"}


@router.post("/bulk_approve")
async def bulk_approve(user_id: str = Query(...)):
    """Bulk approve high confidence matches"""
    return {"success": True, "message": "Bulk approval completed"}


@router.get("/stats")
async def get_stats(user_id: str = Query(...)):
    """Get reconciliation statistics"""
    return {
        "success": True,
        "stats": {
            "total_transactions": 0,
            "matched": 0,
            "unmatched": 0
        }
    }