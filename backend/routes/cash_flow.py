# routes/cash_flow.py
"""
Cash Flow API Routes - Minimal Working Version
"""

from fastapi import APIRouter, HTTPException, Body
from typing import Dict, List, Any, Optional
import logging
from datetime import datetime, timedelta
from collections import defaultdict

logger = logging.getLogger(__name__)

router = APIRouter()

# ============================================================================
# SANKEY DIAGRAM ENDPOINT
# ============================================================================

@router.get("/financial-flow")
async def get_financial_flow(
    user_id: Optional[str] = None,
    months: int = 1
):
    """
    Generate Sankey diagram from REAL transaction data
    Returns empty state if no user_id or no data
    """
    try:
        logger.info(f"📊 Generating financial flow for user: {user_id}")
        
        # If no user_id, return empty state
        if not user_id:
            logger.warning("⚠️ No user_id provided")
            return {
                "success": True,
                "nodes": [],
                "links": [],
                "message": "Please sign in to view your cash flow data.",
                "empty": True
            }
        
        # Try to get real data from database
        try:
            from database import SessionLocal
            from models import LedgerEntry
            
            db = SessionLocal()
            
            try:
                # Get date range
                end_date = datetime.now()
                start_date = end_date - timedelta(days=30 * months)
                
                # Query REAL transactions
                ledger_entries = db.query(LedgerEntry).filter(
                    LedgerEntry.user_id == user_id,
                    LedgerEntry.date >= start_date,
                    LedgerEntry.date <= end_date
                ).all()
                
                logger.info(f"📝 Found {len(ledger_entries)} ledger entries")
                
                # If NO data, return empty state
                if not ledger_entries:
                    logger.warning("⚠️ No transaction data found")
                    return {
                        "success": True,
                        "nodes": [],
                        "links": [],
                        "message": "No transaction data available. Upload financial statements to see your cash flow visualization.",
                        "empty": True
                    }
                
                # Build Sankey from REAL data
                nodes, links = _build_sankey_from_ledger(ledger_entries)
                
                # If no meaningful flows, return empty
                if not links:
                    return {
                        "success": True,
                        "nodes": [],
                        "links": [],
                        "message": "Transaction amounts too small to visualize. Upload more data or adjust time period.",
                        "empty": True
                    }
                
                logger.info(f"✅ Generated {len(nodes)} nodes and {len(links)} links from REAL data")
                
                return {
                    "success": True,
                    "nodes": nodes,
                    "links": links,
                    "period": {
                        "start": start_date.strftime("%Y-%m-%d"),
                        "end": end_date.strftime("%Y-%m-%d"),
                        "months": months
                    },
                    "total_transactions": len(ledger_entries),
                    "empty": False
                }
                
            finally:
                db.close()
                
        except ImportError as e:
            logger.error(f"❌ Database not available: {e}")
            return {
                "success": True,
                "nodes": [],
                "links": [],
                "message": "Database not configured. Please contact support.",
                "empty": True
            }
            
    except Exception as e:
        logger.error(f"❌ Error generating financial flow: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


def _build_sankey_from_ledger(ledger_entries: List) -> tuple:
    """
    Build Sankey from REAL ledger entries
    """
    
    # Aggregate by account and category
    inflows = defaultdict(float)
    outflows = defaultdict(float)
    
    for entry in ledger_entries:
        try:
            amount = float(entry.amount or 0)
            if amount == 0:
                continue
                
            account = str(entry.account_name or entry.description or "Unknown")
            category = str(entry.category or "Uncategorized")
            
            # Classify as income or expense
            is_income = (
                amount > 0 or 
                any(keyword in (account + category).lower() 
                    for keyword in ['revenue', 'income', 'sales', 'receivable'])
            )
            
            if is_income:
                key = category if category != "Uncategorized" else account
                inflows[key] += abs(amount)
            else:
                key = category if category != "Uncategorized" else account
                outflows[key] += abs(amount)
        except Exception as e:
            logger.warning(f"Error processing entry: {e}")
            continue
    
    # Build nodes
    nodes = []
    node_map = {}
    
    # Add income nodes
    for income_source in sorted(inflows.keys()):
        if inflows[income_source] > 1:
            idx = len(nodes)
            nodes.append({"name": income_source})
            node_map[income_source] = idx
    
    # Add cash account
    if nodes:
        cash_account_idx = len(nodes)
        nodes.append({"name": "Cash Account"})
        node_map["Cash Account"] = cash_account_idx
    
    # Add expense nodes
    for expense_category in sorted(outflows.keys()):
        if outflows[expense_category] > 1:
            idx = len(nodes)
            nodes.append({"name": expense_category})
            node_map[expense_category] = idx
    
    # Build links
    links = []
    
    # Income → Cash
    if "Cash Account" in node_map:
        for income_source, amount in inflows.items():
            if amount > 1 and income_source in node_map:
                links.append({
                    "source": node_map[income_source],
                    "target": node_map["Cash Account"],
                    "value": round(amount, 2)
                })
        
        # Cash → Expenses
        for expense_category, amount in outflows.items():
            if amount > 1 and expense_category in node_map:
                links.append({
                    "source": node_map["Cash Account"],
                    "target": node_map[expense_category],
                    "value": round(amount, 2)
                })
    
    return nodes, links


# ============================================================================
# HEALTH CHECK
# ============================================================================

@router.get("/health")
async def health_check():
    """Check if cash flow service is running"""
    return {
        "status": "healthy",
        "service": "cash-flow",
        "version": "1.0.0",
        "endpoints": [
            "/financial-flow",
            "/health"
        ]
    }


# ============================================================================
# QUICK FORECAST (Simple version)
# ============================================================================

@router.post("/quick-forecast")
async def quick_forecast(payload: Dict[str, Any] = Body(...)):
    """
    Quick cash flow forecast
    """
    try:
        current_balance = payload.get('current_balance', 0)
        monthly_revenue = payload.get('monthly_revenue', 0)
        monthly_expenses = payload.get('monthly_expenses', 0)
        
        if not all([current_balance, monthly_revenue, monthly_expenses]):
            raise HTTPException(
                status_code=400,
                detail="Please provide current_balance, monthly_revenue, and monthly_expenses"
            )
        
        # Simple forecast
        daily_forecast = []
        balance = current_balance
        
        for day in range(1, 91):
            balance += (monthly_revenue / 30) - (monthly_expenses / 30)
            daily_forecast.append({
                'day_number': day,
                'closing_balance': round(balance, 2),
                'status': 'healthy' if balance > 0 else 'critical'
            })
        
        runway_months = current_balance / monthly_expenses if monthly_expenses > 0 else 999
        
        return {
            'success': True,
            'daily_forecast': daily_forecast,
            'summary': {
                'current_balance': current_balance,
                'lowest_balance': min(d['closing_balance'] for d in daily_forecast),
                'runway_months': round(runway_months, 1),
                'health_score': 75 if runway_months > 3 else 25
            },
            'recommendations': [
                f"Current runway: {runway_months:.1f} months",
                "Monitor cash flow weekly" if runway_months < 6 else "Cash position is healthy"
            ]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Quick forecast failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))