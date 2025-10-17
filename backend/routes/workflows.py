from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from database import get_db_connection

workflows_router = APIRouter()

# Pydantic models
class Trigger(BaseModel):
    metric: str
    condition: str
    value: float

class Action(BaseModel):
    type: str
    target: str

class WorkflowCreate(BaseModel):
    name: str
    trigger: Trigger
    action: Action
    is_active: bool = True

class WorkflowUpdate(BaseModel):
    is_active: bool

# Get all workflows
@workflows_router.get("/api/workflows")
async def get_workflows():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT id, name, trigger_metric, trigger_condition, trigger_value,
                   action_type, action_target, is_active, created_at
            FROM workflows
            ORDER BY created_at DESC
        """)
        
        workflows = []
        for row in cursor.fetchall():
            workflow = {
                'id': str(row.id),
                'name': row.name,
                'trigger': {
                    'metric': row.trigger_metric,
                    'condition': row.trigger_condition,
                    'value': float(row.trigger_value)
                },
                'action': {
                    'type': row.action_type,
                    'target': row.action_target
                },
                'is_active': bool(row.is_active)
            }
            workflows.append(workflow)
        
        conn.close()
        return workflows
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Create workflow
@workflows_router.post("/api/workflows")
async def create_workflow(workflow: WorkflowCreate):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO workflows (name, trigger_metric, trigger_condition, trigger_value,
                                 action_type, action_target, is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?);
            SELECT SCOPE_IDENTITY() AS id;
        """, (
            workflow.name,
            workflow.trigger.metric,
            workflow.trigger.condition,
            workflow.trigger.value,
            workflow.action.type,
            workflow.action.target,
            1 if workflow.is_active else 0
        ))
        
        new_id = cursor.fetchone()[0]
        conn.commit()
        
        # Fetch the created workflow
        cursor.execute("SELECT * FROM workflows WHERE id = ?", (new_id,))
        row = cursor.fetchone()
        
        result = {
            'id': str(row.id),
            'name': row.name,
            'trigger': {
                'metric': row.trigger_metric,
                'condition': row.trigger_condition,
                'value': float(row.trigger_value)
            },
            'action': {
                'type': row.action_type,
                'target': row.action_target
            },
            'is_active': bool(row.is_active)
        }
        
        conn.close()
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Update workflow (toggle active status)
@workflows_router.patch("/api/workflows/{workflow_id}")
async def update_workflow(workflow_id: int, update: WorkflowUpdate):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            UPDATE workflows 
            SET is_active = ?, updated_at = GETDATE()
            WHERE id = ?
        """, (1 if update.is_active else 0, workflow_id))
        
        conn.commit()
        conn.close()
        
        return {'success': True, 'message': 'Workflow updated successfully'}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Delete workflow
@workflows_router.delete("/api/workflows/{workflow_id}")
async def delete_workflow(workflow_id: int):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("DELETE FROM workflows WHERE id = ?", (workflow_id,))
        
        conn.commit()
        conn.close()
        
        return {'success': True, 'message': 'Workflow deleted successfully'}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))