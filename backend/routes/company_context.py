from fastapi import APIRouter, HTTPException, Depends, Request, Header
from pydantic import BaseModel
from typing import List, Optional
from database import get_db_connection
import json
import logging
from routes.auth import get_current_user_id  

logger = logging.getLogger(__name__)

company_context_router = APIRouter()

# Pydantic model
class CompanyContext(BaseModel):
    companyName: str
    industry: str
    subIndustry: Optional[str] = None
    companySize: str
    revenue: str
    stage: str
    geography: str
    fiscalYearEnd: str
    compareToIndustry: bool = True
    compareToSize: bool = True
    compareToStage: bool = True
    compareToRegion: bool = False
    preferredMetrics: List[str] = []
    autoEnrich: bool = True
    smartSuggestions: bool = True

# Get company context
@company_context_router.get("/api/company-context")
async def get_company_context(
    request: Request,
    authorization: Optional[str] = Header(None)
):
    """
    Get company context for the authenticated user
    """
    try:
        # Get authenticated user ID using your existing auth
        user_id = await get_current_user_id(request, authorization)
        logger.info(f"📊 Fetching company context for user: {user_id}")
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT company_name, industry, sub_industry, company_size, revenue_range,
                   growth_stage, geography, fiscal_year_end,
                   compare_to_industry, compare_to_size, compare_to_stage, compare_to_region,
                   preferred_metrics, auto_enrich, smart_suggestions
            FROM company_context
            WHERE user_id = ?
        """, (user_id,))
        
        row = cursor.fetchone()
        conn.close()
        
        if not row:
            logger.info(f"ℹ️ No company context found for user: {user_id}")
            return None
        
        logger.info(f"✅ Company context retrieved for user: {user_id}")
        return {
            'companyName': row.company_name,
            'industry': row.industry,
            'subIndustry': row.sub_industry,
            'companySize': row.company_size,
            'revenue': row.revenue_range,
            'stage': row.growth_stage,
            'geography': row.geography,
            'fiscalYearEnd': row.fiscal_year_end,
            'compareToIndustry': bool(row.compare_to_industry),
            'compareToSize': bool(row.compare_to_size),
            'compareToStage': bool(row.compare_to_stage),
            'compareToRegion': bool(row.compare_to_region),
            'preferredMetrics': json.loads(row.preferred_metrics) if row.preferred_metrics else [],
            'autoEnrich': bool(row.auto_enrich),
            'smartSuggestions': bool(row.smart_suggestions)
        }
        
    except HTTPException:
        # Re-raise auth errors
        raise
    except Exception as e:
        logger.error(f"❌ Error fetching company context: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Create or update company context
@company_context_router.post("/api/company-context")
async def save_company_context(
    context: CompanyContext,
    request: Request,
    authorization: Optional[str] = Header(None)
):
    """
    Save company context for the authenticated user
    """
    try:
        # Get authenticated user ID using your existing auth
        user_id = await get_current_user_id(request, authorization)
        logger.info(f"💾 Saving company context for user: {user_id}")
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Check if context exists for this user
        cursor.execute("SELECT id FROM company_context WHERE user_id = ?", (user_id,))
        existing = cursor.fetchone()
        
        preferred_metrics_json = json.dumps(context.preferredMetrics)
        
        if existing:
            # Update existing record
            logger.info(f"🔄 Updating existing company context for user: {user_id}")
            cursor.execute("""
                UPDATE company_context
                SET company_name = ?,
                    industry = ?,
                    sub_industry = ?,
                    company_size = ?,
                    revenue_range = ?,
                    growth_stage = ?,
                    geography = ?,
                    fiscal_year_end = ?,
                    compare_to_industry = ?,
                    compare_to_size = ?,
                    compare_to_stage = ?,
                    compare_to_region = ?,
                    preferred_metrics = ?,
                    auto_enrich = ?,
                    smart_suggestions = ?
                WHERE user_id = ?
            """, (
                context.companyName,
                context.industry,
                context.subIndustry,
                context.companySize,
                context.revenue,
                context.stage,
                context.geography,
                context.fiscalYearEnd,
                1 if context.compareToIndustry else 0,
                1 if context.compareToSize else 0,
                1 if context.compareToStage else 0,
                1 if context.compareToRegion else 0,
                preferred_metrics_json,
                1 if context.autoEnrich else 0,
                1 if context.smartSuggestions else 0,
                user_id
            ))
        else:
            # Insert new record
            logger.info(f"➕ Creating new company context for user: {user_id}")
            cursor.execute("""
                INSERT INTO company_context (
                    user_id, company_name, industry, sub_industry, company_size,
                    revenue_range, growth_stage, geography, fiscal_year_end,
                    compare_to_industry, compare_to_size, compare_to_stage, compare_to_region,
                    preferred_metrics, auto_enrich, smart_suggestions
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                user_id,
                context.companyName,
                context.industry,
                context.subIndustry,
                context.companySize,
                context.revenue,
                context.stage,
                context.geography,
                context.fiscalYearEnd,
                1 if context.compareToIndustry else 0,
                1 if context.compareToSize else 0,
                1 if context.compareToStage else 0,
                1 if context.compareToRegion else 0,
                preferred_metrics_json,
                1 if context.autoEnrich else 0,
                1 if context.smartSuggestions else 0
            ))
        
        conn.commit()
        conn.close()
        
        logger.info(f"✅ Company context saved successfully for user: {user_id}")
        return {'success': True, 'message': 'Company context saved successfully'}
        
    except HTTPException:
        # Re-raise auth errors
        raise
    except Exception as e:
        logger.error(f"❌ Error saving company context: {str(e)}")
        logger.error(f"Failed to execute query. Error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to execute query. Error: {str(e)}")

# Delete company context
@company_context_router.delete("/api/company-context")
async def delete_company_context(
    request: Request,
    authorization: Optional[str] = Header(None)
):
    """
    Delete company context for the authenticated user
    """
    try:
        # Get authenticated user ID using your existing auth
        user_id = await get_current_user_id(request, authorization)
        logger.info(f"🗑️ Deleting company context for user: {user_id}")
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("DELETE FROM company_context WHERE user_id = ?", (user_id,))
        
        conn.commit()
        conn.close()
        
        logger.info(f"✅ Company context deleted for user: {user_id}")
        return {'success': True, 'message': 'Company context deleted successfully'}
        
    except HTTPException:
        # Re-raise auth errors
        raise
    except Exception as e:
        logger.error(f"❌ Error deleting company context: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))