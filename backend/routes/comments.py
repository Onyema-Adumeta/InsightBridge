from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from database import get_db_connection
from typing import List, Optional

comments_bp = APIRouter()

# Pydantic models for request/response
class CommentCreate(BaseModel):
    userId: str = "user-1"
    userName: str = "Current User"
    userInitials: str = "CU"
    metric: str
    text: str

class ReplyCreate(BaseModel):
    userId: str = "user-1"
    userName: str = "Current User"
    userInitials: str = "CU"
    text: str

class CommentUpdate(BaseModel):
    resolved: bool

@comments_bp.get("/api/comments")
async def get_comments(status: str = "all"):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        query = "SELECT * FROM comments"
        if status == 'open':
            query += " WHERE resolved = 0"
        elif status == 'resolved':
            query += " WHERE resolved = 1"
        query += " ORDER BY created_at DESC"
        
        cursor.execute(query)
        
        comments = []
        for row in cursor.fetchall():
            comment = {
                'id': str(row.id),
                'user': row.user_name,
                'userInitials': row.user_initials,
                'metric': row.metric,
                'text': row.text,
                'resolved': bool(row.resolved),
                'timestamp': row.created_at.isoformat() if row.created_at else None,
                'replies': []
            }
            
            # Get replies
            cursor.execute(
                "SELECT * FROM comment_replies WHERE comment_id = ? ORDER BY created_at ASC",
                (row.id,)
            )
            
            for reply_row in cursor.fetchall():
                reply = {
                    'id': str(reply_row.id),
                    'user': reply_row.user_name,
                    'userInitials': reply_row.user_initials,
                    'text': reply_row.text,
                    'timestamp': reply_row.created_at.isoformat() if reply_row.created_at else None
                }
                comment['replies'].append(reply)
            
            comments.append(comment)
        
        conn.close()
        return {'comments': comments}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@comments_bp.post("/api/comments")
async def create_comment(comment: CommentCreate):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO comments (user_id, user_name, user_initials, metric, text, resolved)
            VALUES (?, ?, ?, ?, ?, 0);
            SELECT SCOPE_IDENTITY() AS id;
        """, (comment.userId, comment.userName, comment.userInitials, comment.metric, comment.text))
        
        new_id = cursor.fetchone()[0]
        conn.commit()
        
        cursor.execute("SELECT * FROM comments WHERE id = ?", (new_id,))
        row = cursor.fetchone()
        
        result = {
            'id': str(row.id),
            'user': row.user_name,
            'userInitials': row.user_initials,
            'metric': row.metric,
            'text': row.text,
            'resolved': bool(row.resolved),
            'timestamp': 'Just now',
            'replies': []
        }
        
        conn.close()
        return {'success': True, 'comment': result}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@comments_bp.patch("/api/comments/{comment_id}")
async def update_comment(comment_id: int, update: CommentUpdate):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            UPDATE comments 
            SET resolved = ?, updated_at = GETDATE() 
            WHERE id = ?
        """, (1 if update.resolved else 0, comment_id))
        
        conn.commit()
        conn.close()
        
        return {'success': True}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@comments_bp.post("/api/comments/{comment_id}/replies")
async def create_reply(comment_id: int, reply: ReplyCreate):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO comment_replies (comment_id, user_id, user_name, user_initials, text)
            VALUES (?, ?, ?, ?, ?);
            SELECT SCOPE_IDENTITY() AS id;
        """, (comment_id, reply.userId, reply.userName, reply.userInitials, reply.text))
        
        new_id = cursor.fetchone()[0]
        conn.commit()
        
        result = {
            'id': str(new_id),
            'user': reply.userName,
            'userInitials': reply.userInitials,
            'text': reply.text,
            'timestamp': 'Just now'
        }
        
        conn.close()
        return {'success': True, 'reply': result}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))