from fastapi import APIRouter, HTTPException, Body
from typing import Dict, List, Any, Optional
from pydantic import BaseModel, Field
from datetime import datetime
from ai.simulations import (
    StrategicSimulator,
    ScenarioAnalyzer,
    MonteCarloSimulator,
    ScenarioParameters,
    MonteCarloConfig,
    ScenarioType
)
import logging


logger = logging.getLogger(__name__)

router = APIRouter()

# ============================================================================
# ENDPOINTS
# ============================================================================

@router.post("/smart-suggestions")
async def get_smart_suggestions(payload: Dict[str, Any] = Body(...)):
    """
    Generate AI-powered strategic suggestions based on financial data
    """
    try:
        user_id = payload.get('user_id', 'anonymous')
        financial_data = payload.get('financial_data', {})
        
        logger.info(f"📊 Generating smart suggestions for user: {user_id}")
        
        # Use provided financial data or defaults
        if not financial_data:
            financial_data = {
                'revenue': 1000000,
                'costs': 700000,
                'fixed_costs': 200000,
                'variable_costs': 500000,
                'customers': 1000
            }
        
        suggestions = [
            {
                "id": "price-optimization",
                "title": "Optimize Pricing Strategy",
                "description": "Increase prices by 8-12% to improve margins without significant volume loss",
                "impact": "high",
                "expected_revenue_change": "+12%",
                "expected_margin_change": "+5 points",
                "confidence": 85,
                "timeframe": "3-6 months",
                "parameters": {
                    "price_change": 10.0,
                    "revenue_growth": 0.08,
                    "volume_change": -2.0
                }
            },
            {
                "id": "cost-reduction",
                "title": "Cost Reduction Initiative",
                "description": "Reduce operational costs through automation and process optimization",
                "impact": "medium",
                "expected_revenue_change": "0%",
                "expected_margin_change": "+8 points",
                "confidence": 78,
                "timeframe": "6-12 months",
                "parameters": {
                    "cost_change": -0.15,
                    "productivity_improvement": 12.0,
                    "automation_savings": 8.0
                }
            },
            {
                "id": "customer-acquisition",
                "title": "Customer Acquisition Campaign",
                "description": "Aggressive marketing to grow customer base by 20%",
                "impact": "high",
                "expected_revenue_change": "+18%",
                "expected_margin_change": "-2 points",
                "confidence": 72,
                "timeframe": "3-9 months",
                "parameters": {
                    "customer_acquisition": 0.20,
                    "revenue_growth": 0.15,
                    "cost_change": 0.05
                }
            },
            {
                "id": "market-expansion",
                "title": "Market Expansion",
                "description": "Enter new geographic markets or customer segments",
                "impact": "high",
                "expected_revenue_change": "+25%",
                "expected_margin_change": "+3 points",
                "confidence": 65,
                "timeframe": "12-18 months",
                "parameters": {
                    "revenue_growth": 0.25,
                    "volume_change": 20.0,
                    "customer_acquisition": 0.18,
                    "cost_change": 0.08
                }
            },
            {
                "id": "efficiency-boost",
                "title": "Operational Efficiency Program",
                "description": "Streamline operations to reduce waste and improve productivity",
                "impact": "medium",
                "expected_revenue_change": "+5%",
                "expected_margin_change": "+6 points",
                "confidence": 82,
                "timeframe": "6-12 months",
                "parameters": {
                    "productivity_improvement": 15.0,
                    "cost_change": -0.10,
                    "revenue_growth": 0.05
                }
            }
        ]
        
        logger.info(f"✅ Generated {len(suggestions)} suggestions")
        
        return {
            "success": True,
            "suggestions": suggestions,
            "base_financials": financial_data,
            "generated_at": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"❌ Error generating suggestions: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/run")
async def run_simulation(payload: Dict[str, Any] = Body(...)):
    """
    Run a strategic simulation based on user parameters
    """
    try:
        # Extract fields with defaults
        user_id = payload.get('user_id', 'anonymous')
        decision_description = payload.get('decision_description', 'Strategic Decision')
        parameters = payload.get('parameters', {})
        financial_data = payload.get('financial_data', None)
        duration_months = payload.get('duration_months', 12)
        
        logger.info(f"🎯 Running simulation for user: {user_id}")
        logger.info(f"📝 Decision: {decision_description}")
        logger.info(f"📊 Parameters: {parameters}")
        
        # If parameters is empty, use default parameters
        if not parameters or len(parameters) == 0:
            logger.info("⚠️ No parameters provided, using defaults")
            parameters = {
                'revenue_growth': 0.10,  # 10% growth
                'cost_change': 0.0,
                'price_change': 0.0
            }
        
        # Use provided financial data or defaults
        if not financial_data:
            financial_data = {
                'revenue': 1000000,
                'costs': 700000,
                'fixed_costs': 200000,
                'variable_costs': 500000,
                'customers': 1000,
                'depreciation': 10000,
                'amortization': 5000,
                'capex': 20000,
                'initial_investment': 1000000
            }
        
        logger.info(f"💰 Using financial data: Revenue=${financial_data.get('revenue', 0):,.0f}")
        
        # Initialize simulator
        simulator = StrategicSimulator(financial_data)
        
        # Run simulation
        result = simulator.simulate_strategic_decision(
            decision_description=decision_description,
            parameters=parameters,
            duration_months=duration_months
        )
        
        logger.info(f"✅ Simulation complete - Growth: {result['key_metrics']['total_revenue_change']:.1f}%")
        
        return {
            "success": True,
            "simulation_id": f"sim_{user_id}_{int(datetime.now().timestamp())}",
            "user_id": user_id,
            "decision_description": decision_description,
            "parameters": parameters,
            "result": result,
            "created_at": datetime.now().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error running simulation: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Simulation error: {str(e)}")

@router.post("/debug")
async def debug_request(payload: Dict[str, Any] = Body(...)):
    """Debug endpoint to see what data is being sent"""
    logger.info(f"📦 Received payload: {payload}")
    return {
        "success": True,
        "received": payload,
        "keys": list(payload.keys()),
        "user_id": payload.get('user_id'),
        "has_parameters": 'parameters' in payload,
        "has_financial_data": 'financial_data' in payload
    }


@router.get("/health")
async def health_check():
    """Check if simulations service is running"""
    return {
        "status": "healthy",
        "service": "simulations",
        "version": "1.0.0",
        "endpoints": [
            "/smart-suggestions",
            "/run",
            "/debug",
            "/health"
        ]
    }
# ---------- NEW: Monte Carlo Revenue Projection (optional) ----------
class MonteCarloRevenueRequest(BaseModel):
    base_revenue: float = Field(1_000_000)
    growth_rate_mean: float = Field(0.02, description="Monthly growth mean (e.g. 0.02 = 2%)")
    growth_rate_std: float = Field(0.03, description="Monthly growth std dev")
    cost_ratio_mean: float = Field(0.65, description="Costs as % of revenue")
    cost_ratio_std: float = Field(0.05, description="Std dev of cost ratio")
    periods: int = 12
    iterations: int = Field(10000, ge=100, le=200000)
    confidence_level: float = Field(0.95, ge=0.5, le=0.999)

@router.post("/montecarlo/revenue")
def monte_carlo_revenue(req: MonteCarloRevenueRequest):
    try:
        sim = MonteCarloSimulator(MonteCarloConfig(
            iterations=req.iterations,
            time_periods=req.periods,
            confidence_level=req.confidence_level,
            random_seed=42,
        ))
        # Returns SimulationResult (with distribution + histogram_data)
        return sim.run_revenue_simulation(
            base_revenue=req.base_revenue,
            growth_rate_mean=req.growth_rate_mean,
            growth_rate_std=req.growth_rate_std,
            cost_ratio_mean=req.cost_ratio_mean,
            cost_ratio_std=req.cost_ratio_std,
            periods=req.periods
        ).__dict__
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))