from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime
from database import get_db_connection
import logging

team_router = APIRouter()
logger = logging.getLogger(__name__)

# Pydantic models
class InviteRequest(BaseModel):
    email: EmailStr
    name: str
    role: str

class UpdateRoleRequest(BaseModel):
    role: str

class TeamMember(BaseModel):
    id: str
    name: str
    email: str
    status: str
    role: str
    last_login: Optional[str]
    invited_at: str
    invited_by: Optional[str]

# Get all team members
@team_router.get("/api/team/users")
async def get_team_users(x_user_id: Optional[str] = Header(None)):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT id, name, email, status, role, last_login, invited_at, invited_by
            FROM team_members
            ORDER BY 
                CASE role
                    WHEN 'owner' THEN 1
                    WHEN 'manager' THEN 2
                    WHEN 'accountant' THEN 3
                    WHEN 'viewer' THEN 4
                END,
                name ASC
        """)
        
        members = []
        for row in cursor.fetchall():
            member = {
                'id': str(row.id),
                'name': row.name,
                'email': row.email,
                'status': row.status,
                'role': row.role,
                'last_login': row.last_login.isoformat() if row.last_login else None,
                'invited_at': row.invited_at.isoformat() if row.invited_at else None,
                'invited_by': row.invited_by
            }
            members.append(member)
        
        conn.close()
        return members
        
    except Exception as e:
        logger.error(f"Error fetching team users: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

# Invite new team member
@team_router.post("/api/team/invite")
async def invite_team_member(
    invite: InviteRequest,
    x_user_id: Optional[str] = Header(None)
):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Check if email already exists
        cursor.execute("SELECT id FROM team_members WHERE email = ?", (invite.email,))
        if cursor.fetchone():
            conn.close()
            raise HTTPException(status_code=400, detail="User with this email already exists")
        
        # Insert new team member
        cursor.execute("""
            INSERT INTO team_members (name, email, role, status, invited_by, invited_at)
            VALUES (?, ?, ?, 'pending', ?, GETDATE());
            SELECT SCOPE_IDENTITY() AS id;
        """, (invite.name, invite.email, invite.role, x_user_id or 'system'))
        
        new_id = cursor.fetchone()[0]
        conn.commit()
        conn.close()
        
        # TODO: Send invitation email here
        logger.info(f"Team member invited: {invite.email} as {invite.role}")
        
        return {'success': True, 'id': str(new_id), 'message': f'Invitation sent to {invite.email}'}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error inviting team member: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Update team member role
@team_router.put("/api/team/users/{member_id}")
async def update_team_member(
    member_id: int,
    update: UpdateRoleRequest,
    x_user_id: Optional[str] = Header(None)
):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Check if member exists
        cursor.execute("SELECT id, role FROM team_members WHERE id = ?", (member_id,))
        row = cursor.fetchone()
        
        if not row:
            conn.close()
            raise HTTPException(status_code=404, detail="Team member not found")
        
        # Prevent changing owner role
        if row.role == 'owner' and update.role != 'owner':
            conn.close()
            raise HTTPException(status_code=403, detail="Cannot change owner role")
        
        # Update role
        cursor.execute("""
            UPDATE team_members 
            SET role = ?, updated_at = GETDATE()
            WHERE id = ?
        """, (update.role, member_id))
        
        conn.commit()
        conn.close()
        
        logger.info(f"Team member {member_id} role updated to {update.role}")
        return {'success': True, 'message': 'Role updated successfully'}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating team member: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Remove team member
@team_router.delete("/api/team/users/{member_id}")
async def remove_team_member(
    member_id: int,
    x_user_id: Optional[str] = Header(None)
):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Check if member exists and is not an owner
        cursor.execute("SELECT role FROM team_members WHERE id = ?", (member_id,))
        row = cursor.fetchone()
        
        if not row:
            conn.close()
            raise HTTPException(status_code=404, detail="Team member not found")
        
        if row.role == 'owner':
            conn.close()
            raise HTTPException(status_code=403, detail="Cannot remove owner from team")
        
        # Delete member
        cursor.execute("DELETE FROM team_members WHERE id = ?", (member_id,))
        
        conn.commit()
        conn.close()
        
        logger.info(f"Team member {member_id} removed")
        return {'success': True, 'message': 'Team member removed successfully'}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error removing team member: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Get activity logs
@team_router.get("/api/team/activity")
async def get_activity_logs():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT TOP 50 id, user_name, action, details, timestamp
            FROM team_activity_logs
            ORDER BY timestamp DESC
        """)
        
        logs = []
        for row in cursor.fetchall():
            log = {
                'id': str(row.id),
                'user_name': row.user_name,
                'action': row.action,
                'details': row.details,
                'timestamp': row.timestamp.isoformat() if row.timestamp else None
            }
            logs.append(log)
        
        conn.close()
        return logs
        
    except Exception as e:
        logger.error(f"Error fetching activity logs: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))