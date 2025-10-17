from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from database import get_db_connection
from typing import Optional

finance_terms_bp = APIRouter()

class TermCreate(BaseModel):
    term: str
    category: str
    definition: str
    example: Optional[str] = None
    bestPractice: Optional[str] = None

@finance_terms_bp.get("/api/learn-finance/terms")
async def get_terms(category: Optional[str] = None, search: Optional[str] = None):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        query = "SELECT * FROM finance_terms WHERE 1=1"
        params = []
        
        if category and category != 'all':
            query += " AND category = ?"
            params.append(category)
        
        if search:
            query += " AND (term LIKE ? OR definition LIKE ?)"
            params.extend([f'%{search}%', f'%{search}%'])
        
        query += " ORDER BY term ASC"
        
        cursor.execute(query, params)
        
        terms = []
        for row in cursor.fetchall():
            term = {
                'id': str(row.id),
                'term': row.term,
                'category': row.category,
                'definition': row.definition,
                'example': row.example or '',
                'bestPractice': row.best_practice or ''
            }
            terms.append(term)
        
        conn.close()
        return {'terms': terms}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@finance_terms_bp.post("/api/learn-finance/terms")
async def create_term(term_data: TermCreate):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO finance_terms (term, category, definition, example, best_practice, created_by)
            VALUES (?, ?, ?, ?, ?, ?);
            SELECT SCOPE_IDENTITY() AS id;
        """, (
            term_data.term,
            term_data.category,
            term_data.definition,
            term_data.example,
            term_data.bestPractice,
            'user-1'
        ))
        
        new_id = cursor.fetchone()[0]
        conn.commit()
        
        result = {
            'id': str(new_id),
            'term': term_data.term,
            'category': term_data.category,
            'definition': term_data.definition,
            'example': term_data.example or '',
            'bestPractice': term_data.bestPractice or ''
        }
        
        conn.close()
        return {'success': True, 'term': result}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@finance_terms_bp.put("/api/learn-finance/terms/{term_id}")
async def update_term(term_id: int, term_data: TermCreate):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            UPDATE finance_terms 
            SET term = ?, category = ?, definition = ?, 
                example = ?, best_practice = ?, updated_at = GETDATE()
            WHERE id = ?
        """, (
            term_data.term,
            term_data.category,
            term_data.definition,
            term_data.example,
            term_data.bestPractice,
            term_id
        ))
        
        conn.commit()
        conn.close()
        
        return {'success': True}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@finance_terms_bp.delete("/api/learn-finance/terms/{term_id}")
async def delete_term(term_id: int):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("DELETE FROM finance_terms WHERE id = ?", (term_id,))
        
        conn.commit()
        conn.close()
        
        return {'success': True}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))