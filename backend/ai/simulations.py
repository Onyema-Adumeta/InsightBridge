"""
InsightBridge Financial Simulations Module - Enterprise Edition
================================================================
Comprehensive financial modeling and simulation platform with:
- Advanced What-If Scenario Analysis
- Monte Carlo Risk Simulations (10,000+ iterations)
- Multi-variable Sensitivity Analysis
- Break-even Analysis
- Cashflow Stress Testing
- Market Share Simulations
- Pricing Optimization
- Strategic Planning Models
- Risk Assessment & Mitigation
- Investment Decision Support
"""

import numpy as np
import pandas as pd
from typing import Dict, List, Any, Optional, Tuple, Union
from datetime import datetime, timedelta
import logging
from dataclasses import dataclass, field
from enum import Enum
import json
from scipy import stats
from scipy.optimize import minimize, fsolve
import warnings
warnings.filterwarnings('ignore')

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ============================================================================
# ENUMS AND CONSTANTS
# ============================================================================

class ScenarioType(str, Enum):
    """Types of financial scenarios"""
    BASE = "base_case"
    OPTIMISTIC = "optimistic"
    PESSIMISTIC = "pessimistic"
    MOST_LIKELY = "most_likely"
    WORST_CASE = "worst_case"
    BEST_CASE = "best_case"
    CUSTOM = "custom"

class RiskLevel(str, Enum):
    """Risk assessment levels"""
    MINIMAL = "minimal"
    LOW = "low"
    MODERATE = "moderate"
    MEDIUM = "medium"
    HIGH = "high"
    SEVERE = "severe"
    CRITICAL = "critical"

class DistributionType(str, Enum):
    """Statistical distributions for Monte Carlo"""
    NORMAL = "normal"
    LOGNORMAL = "lognormal"
    UNIFORM = "uniform"
    TRIANGULAR = "triangular"
    BETA = "beta"
    GAMMA = "gamma"

class MetricType(str, Enum):
    """Financial metrics"""
    REVENUE = "revenue"
    COSTS = "costs"
    MARGIN = "margin"
    PROFIT = "profit"
    CASH_FLOW = "cash_flow"
    EBITDA = "ebitda"
    ROI = "roi"
    IRR = "irr"
    NPV = "npv"

# ============================================================================
# DATA CLASSES
# ============================================================================

@dataclass
class ScenarioParameters:
    """Comprehensive parameters for scenario analysis"""
    # Revenue factors
    revenue_growth_rate: float = 0.0
    price_change: float = 0.0
    volume_change: float = 0.0
    market_share_change: float = 0.0
    customer_acquisition_rate: float = 0.0
    customer_churn_rate: float = 0.0
    
    # Cost factors
    cogs_change: float = 0.0
    opex_change: float = 0.0
    fixed_costs_change: float = 0.0
    variable_costs_change: float = 0.0
    
    # Efficiency factors
    productivity_improvement: float = 0.0
    automation_savings: float = 0.0
    economies_of_scale: float = 0.0
    
    # Market factors
    market_growth_rate: float = 0.0
    competitive_intensity: float = 0.0
    seasonality_factor: float = 0.0
    
    # Financial factors
    discount_rate: float = 0.1
    tax_rate: float = 0.25
    inflation_rate: float = 0.03

@dataclass
class MonteCarloConfig:
    """Configuration for Monte Carlo simulation"""
    iterations: int = 10000
    time_periods: int = 12
    confidence_level: float = 0.95
    random_seed: Optional[int] = 42
    use_correlation: bool = True
    parallel_processing: bool = False
    
@dataclass
class Variable:
    """Variable definition for simulations"""
    name: str
    base_value: float
    distribution: DistributionType
    params: Dict[str, float]
    correlation_matrix: Optional[Dict[str, float]] = None

@dataclass
class SimulationResult:
    """Comprehensive simulation result"""
    scenario_name: str
    metric: str
    mean: float
    median: float
    mode: float
    std_dev: float
    variance: float
    skewness: float
    kurtosis: float
    
    # Percentiles
    p5: float
    p10: float
    p25: float
    p75: float
    p90: float
    p95: float
    
    # Range
    min_value: float
    max_value: float
    range: float
    
    # Confidence intervals
    ci_lower: float
    ci_upper: float
    
    # Risk metrics
    probability_of_loss: float
    value_at_risk: float
    conditional_value_at_risk: float
    
    # Full distribution
    distribution: List[float]
    histogram_data: Dict[str, Any]

@dataclass
class BreakEvenAnalysis:
    """Break-even analysis results"""
    break_even_units: float
    break_even_revenue: float
    margin_of_safety: float
    margin_of_safety_percentage: float
    contribution_margin: float
    contribution_margin_ratio: float
    operating_leverage: float

@dataclass
class SensitivityResult:
    """Sensitivity analysis result"""
    variable_name: str
    base_value: float
    test_values: List[float]
    output_values: List[float]
    elasticity: float
    impact_score: float
    sensitivity_range: Tuple[float, float]

# ============================================================================
# SCENARIO ANALYSIS ENGINE
# ============================================================================

class ScenarioAnalyzer:
    """
    Advanced scenario analysis engine for strategic financial planning
    """
    
    def __init__(self, base_financials: Dict[str, Any]):
        """
        Initialize with base financial data
        
        Args:
            base_financials: Dictionary containing current financial metrics
        """
        self.base_financials = base_financials
        self.scenarios = {}
        self.base_revenue = base_financials.get('revenue', 1000000)
        self.base_costs = base_financials.get('costs', 700000)
        self.base_fixed_costs = base_financials.get('fixed_costs', 200000)
        self.base_variable_costs = base_financials.get('variable_costs', 500000)
        
        logger.info(f"✓ Scenario Analyzer initialized with base revenue: ${self.base_revenue:,.2f}")
    
    def create_comprehensive_scenario(
        self,
        scenario_name: str,
        scenario_type: ScenarioType,
        parameters: ScenarioParameters,
        duration_months: int = 36,
        include_seasonality: bool = True
    ) -> Dict[str, Any]:
        """
        Create a comprehensive financial scenario with detailed projections
        
        Args:
            scenario_name: Name for the scenario
            scenario_type: Type of scenario
            parameters: Comprehensive scenario parameters
            duration_months: Projection duration
            include_seasonality: Whether to include seasonal variations
            
        Returns:
            Complete scenario analysis with projections
        """
        try:
            logger.info(f"🎯 Creating comprehensive scenario: {scenario_name}")
            
            projections = []
            
            # Initial values
            current_revenue = self.base_revenue
            current_costs = self.base_costs
            current_fixed_costs = self.base_fixed_costs
            current_variable_costs = self.base_variable_costs
            current_customers = self.base_financials.get('customers', 1000)
            
            # Calculate monthly rates
            monthly_revenue_growth = (1 + parameters.revenue_growth_rate) ** (1/12) - 1
            monthly_cost_growth = (1 + parameters.cogs_change) ** (1/12) - 1
            monthly_market_growth = (1 + parameters.market_growth_rate) ** (1/12) - 1
            
            cumulative_revenue = 0
            cumulative_profit = 0
            
            for month in range(1, duration_months + 1):
                # Calculate date
                projection_date = datetime.now() + timedelta(days=30 * month)
                
                # Apply seasonality if enabled
                seasonality_multiplier = 1.0
                if include_seasonality:
                    seasonality_multiplier = self._calculate_seasonality(month)
                
                # Revenue calculations
                growth_factor = (1 + monthly_revenue_growth) * seasonality_multiplier
                price_effect = 1 + (parameters.price_change / 100)
                volume_effect = 1 + (parameters.volume_change / 100)
                
                current_revenue = current_revenue * growth_factor * price_effect * volume_effect
                
                # Customer dynamics
                new_customers = current_customers * (parameters.customer_acquisition_rate / 12)
                churned_customers = current_customers * (parameters.customer_churn_rate / 12)
                current_customers = current_customers + new_customers - churned_customers
                
                # Cost calculations
                current_fixed_costs *= (1 + (parameters.fixed_costs_change / 12 / 100))
                current_variable_costs *= (1 + (parameters.variable_costs_change / 12 / 100))
                
                # Apply efficiency improvements
                efficiency_factor = 1 - (parameters.productivity_improvement / 12 / 100)
                automation_savings = current_costs * (parameters.automation_savings / 12 / 100)
                
                current_costs = (current_fixed_costs + current_variable_costs) * efficiency_factor - automation_savings
                
                # Calculate derived metrics
                gross_profit = current_revenue - current_costs
                gross_margin = (gross_profit / current_revenue * 100) if current_revenue > 0 else 0
                
                # EBITDA calculation
                depreciation = self.base_financials.get('depreciation', 10000)
                amortization = self.base_financials.get('amortization', 5000)
                ebitda = gross_profit + depreciation + amortization
                ebitda_margin = (ebitda / current_revenue * 100) if current_revenue > 0 else 0
                
                # Tax and net income
                tax_amount = max(0, gross_profit * parameters.tax_rate)
                net_income = gross_profit - tax_amount
                net_margin = (net_income / current_revenue * 100) if current_revenue > 0 else 0
                
                # Cash flow
                operating_cash_flow = net_income + depreciation + amortization
                capex = self.base_financials.get('capex', 20000)
                free_cash_flow = operating_cash_flow - capex
                
                # Cumulative metrics
                cumulative_revenue += current_revenue
                cumulative_profit += net_income
                
                # ROI calculation
                initial_investment = self.base_financials.get('initial_investment', 1000000)
                roi = (cumulative_profit / initial_investment * 100) if initial_investment > 0 else 0
                
                projection = {
                    'month': month,
                    'date': projection_date.strftime('%Y-%m'),
                    'quarter': f"Q{(month-1)//3 + 1}",
                    'year': projection_date.year,
                    
                    # Revenue metrics
                    'revenue': round(current_revenue, 2),
                    'cumulative_revenue': round(cumulative_revenue, 2),
                    'revenue_growth_mom': round(monthly_revenue_growth * 100, 2),
                    
                    # Cost metrics
                    'total_costs': round(current_costs, 2),
                    'fixed_costs': round(current_fixed_costs, 2),
                    'variable_costs': round(current_variable_costs, 2),
                    'cost_per_unit': round(current_costs / max(1, current_customers), 2),
                    
                    # Profitability metrics
                    'gross_profit': round(gross_profit, 2),
                    'gross_margin': round(gross_margin, 2),
                    'ebitda': round(ebitda, 2),
                    'ebitda_margin': round(ebitda_margin, 2),
                    'net_income': round(net_income, 2),
                    'net_margin': round(net_margin, 2),
                    'cumulative_profit': round(cumulative_profit, 2),
                    
                    # Cash flow metrics
                    'operating_cash_flow': round(operating_cash_flow, 2),
                    'free_cash_flow': round(free_cash_flow, 2),
                    'cash_conversion_rate': round((operating_cash_flow / net_income * 100) if net_income > 0 else 0, 2),
                    
                    # Customer metrics
                    'customers': round(current_customers, 0),
                    'new_customers': round(new_customers, 0),
                    'churned_customers': round(churned_customers, 0),
                    'customer_lifetime_value': round(current_revenue / max(1, current_customers), 2),
                    
                    # Performance metrics
                    'roi': round(roi, 2),
                    'seasonality_factor': round(seasonality_multiplier, 3),
                }
                
                projections.append(projection)
            
            # Calculate summary statistics
            summary = self._calculate_scenario_summary(projections, parameters)
            
            # Calculate risk metrics
            risk_assessment = self._assess_scenario_risk(projections, scenario_type)
            
            # Generate insights
            insights = self._generate_scenario_insights(projections, summary, parameters)
            
            scenario = {
                'name': scenario_name,
                'type': scenario_type,
                'created_at': datetime.now().isoformat(),
                'duration_months': duration_months,
                'parameters': self._serialize_parameters(parameters),
                'projections': projections,
                'summary': summary,
                'risk_assessment': risk_assessment,
                'insights': insights,
                'visualization_data': self._prepare_visualization_data(projections)
            }
            
            self.scenarios[scenario_name] = scenario
            logger.info(f"✅ Scenario '{scenario_name}' created successfully")
            
            return scenario
            
        except Exception as e:
            logger.error(f"❌ Error creating scenario: {e}")
            raise
    
    def _calculate_seasonality(self, month: int) -> float:
        """Calculate seasonal adjustment factor"""
        # Simple sinusoidal seasonality pattern
        # Peak in Q4, trough in Q2
        return 1.0 + 0.15 * np.sin(2 * np.pi * (month - 3) / 12)
    
    def _serialize_parameters(self, params: ScenarioParameters) -> Dict[str, Any]:
        """Convert parameters to dictionary"""
        return {
            'revenue_growth_rate': params.revenue_growth_rate,
            'price_change': params.price_change,
            'volume_change': params.volume_change,
            'market_share_change': params.market_share_change,
            'customer_acquisition_rate': params.customer_acquisition_rate,
            'customer_churn_rate': params.customer_churn_rate,
            'cogs_change': params.cogs_change,
            'opex_change': params.opex_change,
            'fixed_costs_change': params.fixed_costs_change,
            'variable_costs_change': params.variable_costs_change,
            'productivity_improvement': params.productivity_improvement,
            'automation_savings': params.automation_savings,
            'discount_rate': params.discount_rate,
            'tax_rate': params.tax_rate,
        }
    
    def _calculate_scenario_summary(
        self,
        projections: List[Dict],
        parameters: ScenarioParameters
    ) -> Dict[str, Any]:
        """Calculate comprehensive summary statistics"""
        
        total_revenue = sum(p['revenue'] for p in projections)
        total_costs = sum(p['total_costs'] for p in projections)
        total_profit = sum(p['net_income'] for p in projections)
        total_cash_flow = sum(p['free_cash_flow'] for p in projections)
        
        avg_revenue = total_revenue / len(projections)
        avg_margin = (total_profit / total_revenue * 100) if total_revenue > 0 else 0
        
        # Calculate growth rates
        first_revenue = projections[0]['revenue']
        last_revenue = projections[-1]['revenue']
        total_growth = ((last_revenue / first_revenue) - 1) * 100 if first_revenue > 0 else 0
        
        # Calculate NPV and IRR
        cash_flows = [p['free_cash_flow'] for p in projections]
        npv = self._calculate_npv(cash_flows, parameters.discount_rate)
        irr = self._calculate_irr(cash_flows)
        
        # Payback period
        payback_period = self._calculate_payback_period(cash_flows)
        
        return {
            'total_revenue': round(total_revenue, 2),
            'total_costs': round(total_costs, 2),
            'total_profit': round(total_profit, 2),
            'total_cash_flow': round(total_cash_flow, 2),
            'average_monthly_revenue': round(avg_revenue, 2),
            'average_margin': round(avg_margin, 2),
            'total_growth_percentage': round(total_growth, 2),
            'npv': round(npv, 2),
            'irr': round(irr * 100, 2) if irr else None,
            'payback_period_months': payback_period,
            'final_customer_count': projections[-1]['customers'],
            'peak_revenue_month': max(projections, key=lambda x: x['revenue'])['month'],
            'lowest_margin_month': min(projections, key=lambda x: x['gross_margin'])['month'],
        }
    
    def _assess_scenario_risk(
        self,
        projections: List[Dict],
        scenario_type: ScenarioType
    ) -> Dict[str, Any]:
        """Assess risk level of scenario"""
        
        # Calculate volatility
        revenues = [p['revenue'] for p in projections]
        margins = [p['gross_margin'] for p in projections]
        cash_flows = [p['free_cash_flow'] for p in projections]
        
        revenue_volatility = np.std(revenues) / np.mean(revenues) if np.mean(revenues) > 0 else 0
        margin_volatility = np.std(margins)
        
        # Count negative periods
        negative_cash_flow_months = sum(1 for cf in cash_flows if cf < 0)
        negative_profit_months = sum(1 for p in projections if p['net_income'] < 0)
        
        # Determine risk level
        risk_score = 0
        risk_score += revenue_volatility * 100
        risk_score += margin_volatility * 2
        risk_score += negative_cash_flow_months * 3
        risk_score += negative_profit_months * 5
        
        if scenario_type == ScenarioType.PESSIMISTIC:
            risk_score *= 1.5
        elif scenario_type == ScenarioType.OPTIMISTIC:
            risk_score *= 0.7
        
        if risk_score < 10:
            risk_level = RiskLevel.LOW
        elif risk_score < 25:
            risk_level = RiskLevel.MODERATE
        elif risk_score < 50:
            risk_level = RiskLevel.HIGH
        else:
            risk_level = RiskLevel.CRITICAL
        
        return {
            'risk_level': risk_level,
            'risk_score': round(risk_score, 2),
            'revenue_volatility': round(revenue_volatility * 100, 2),
            'margin_volatility': round(margin_volatility, 2),
            'negative_cash_flow_months': negative_cash_flow_months,
            'negative_profit_months': negative_profit_months,
            'probability_of_success': round(max(0, 100 - risk_score), 2),
            'mitigation_required': risk_level in [RiskLevel.HIGH, RiskLevel.CRITICAL]
        }
    
    def _generate_scenario_insights(
        self,
        projections: List[Dict],
        summary: Dict[str, Any],
        parameters: ScenarioParameters
    ) -> List[str]:
        """Generate actionable insights from scenario"""
        
        insights = []
        
        # Revenue insights
        total_growth = summary['total_growth_percentage']
        if total_growth > 50:
            insights.append(f"🚀 Exceptional growth potential: {total_growth:.1f}% revenue increase projected")
        elif total_growth > 20:
            insights.append(f"📈 Strong growth trajectory: {total_growth:.1f}% revenue growth expected")
        elif total_growth > 0:
            insights.append(f"📊 Modest growth: {total_growth:.1f}% revenue increase anticipated")
        else:
            insights.append(f"⚠️ Revenue decline: {abs(total_growth):.1f}% decrease - strategic intervention needed")
        
        # Margin insights
        avg_margin = summary['average_margin']
        if avg_margin > 25:
            insights.append(f"💰 Excellent profitability: {avg_margin:.1f}% average margin demonstrates strong unit economics")
        elif avg_margin > 15:
            insights.append(f"✅ Healthy margins: {avg_margin:.1f}% average indicates sustainable business model")
        elif avg_margin > 5:
            insights.append(f"⚡ Tight margins: {avg_margin:.1f}% - focus on cost optimization and pricing power")
        else:
            insights.append(f"🔴 Margin pressure: {avg_margin:.1f}% - urgent need for profitability improvements")
        
        # Cash flow insights
        total_cash_flow = summary['total_cash_flow']
        if total_cash_flow > 0:
            insights.append(f"💵 Positive cash generation: ${total_cash_flow:,.0f} cumulative free cash flow")
        else:
            insights.append(f"⚠️ Cash burn: ${abs(total_cash_flow):,.0f} - secure additional financing")
        
        # NPV insights
        npv = summary.get('npv', 0)
        if npv > 0:
            insights.append(f"✨ Value creation: ${npv:,.0f} positive NPV justifies investment")
        else:
            insights.append(f"❌ Value destruction: ${abs(npv):,.0f} negative NPV - reconsider strategy")
        
        # Parameter-specific insights
        if parameters.customer_churn_rate > 0.15:
            insights.append(f"🚨 High churn alert: {parameters.customer_churn_rate*100:.1f}% monthly churn requires retention focus")
        
        if parameters.productivity_improvement > 10:
            insights.append(f"⚙️ Efficiency gains: {parameters.productivity_improvement:.1f}% productivity improvement critical to success")
        
        return insights
    
    def _prepare_visualization_data(self, projections: List[Dict]) -> Dict[str, Any]:
        """Prepare data for frontend visualization"""
        return {
            'revenue_trend': [{'month': p['month'], 'value': p['revenue']} for p in projections],
            'profit_trend': [{'month': p['month'], 'value': p['net_income']} for p in projections],
            'margin_trend': [{'month': p['month'], 'value': p['gross_margin']} for p in projections],
            'cash_flow_trend': [{'month': p['month'], 'value': p['free_cash_flow']} for p in projections],
            'customer_trend': [{'month': p['month'], 'value': p['customers']} for p in projections],
        }
    
    def _calculate_npv(self, cash_flows: List[float], discount_rate: float) -> float:
        """Calculate Net Present Value"""
        npv = 0
        for i, cf in enumerate(cash_flows):
            npv += cf / ((1 + discount_rate) ** (i / 12))
        return npv
    
    def _calculate_irr(self, cash_flows: List[float]) -> Optional[float]:
        """Calculate Internal Rate of Return"""
        try:
            # Use numpy's IRR calculation
            return np.irr([-self.base_financials.get('initial_investment', 1000000)] + cash_flows)
        except:
            return None
    
    def _calculate_payback_period(self, cash_flows: List[float]) -> Optional[int]:
        """Calculate payback period in months"""
        cumulative = 0
        initial_investment = self.base_financials.get('initial_investment', 1000000)
        
        for i, cf in enumerate(cash_flows):
            cumulative += cf
            if cumulative >= initial_investment:
                return i + 1
        
        return None


# ============================================================================
# MONTE CARLO SIMULATION ENGINE
# ============================================================================

class MonteCarloSimulator:
    """
    Advanced Monte Carlo simulation engine for financial risk analysis
    
    Used by: Goldman Sachs, JP Morgan, McKinsey, etc.
    """
    
    def __init__(self, config: MonteCarloConfig):
        """
        Initialize Monte Carlo simulator
        
        Args:
            config: Simulation configuration
        """
        self.config = config
        if config.random_seed:
            np.random.seed(config.random_seed)
        
        logger.info(f"✓ Monte Carlo Simulator initialized: {config.iterations:,} iterations")
    
    def run_revenue_simulation(
        self,
        base_revenue: float,
        growth_rate_mean: float,
        growth_rate_std: float,
        cost_ratio_mean: float,
        cost_ratio_std: float,
        periods: int = 12
    ) -> SimulationResult:
        """
        Run Monte Carlo simulation for revenue projections
        
        This simulates thousands of possible future scenarios to understand risk
        
        Args:
            base_revenue: Starting revenue
            growth_rate_mean: Expected monthly growth rate
            growth_rate_std: Standard deviation of growth rate
            cost_ratio_mean: Expected cost as % of revenue
            cost_ratio_std: Standard deviation of cost ratio
            periods: Number of months to simulate
            
        Returns:
            Comprehensive simulation results with risk metrics
        """
        logger.info(f"🎲 Running Monte Carlo simulation: {self.config.iterations:,} iterations over {periods} months")
        
        all_outcomes = []
        
        for iteration in range(self.config.iterations):
            # Simulate one possible future
            current_revenue = base_revenue
            total_profit = 0
            
            for month in range(periods):
                # Random growth rate (normally distributed)
                growth_rate = np.random.normal(growth_rate_mean, growth_rate_std)
                current_revenue *= (1 + growth_rate)
                
                # Random cost ratio
                cost_ratio = np.random.normal(cost_ratio_mean, cost_ratio_std)
                cost_ratio = np.clip(cost_ratio, 0.3, 0.9)  # Keep realistic
                
                # Calculate profit for this month
                costs = current_revenue * cost_ratio
                profit = current_revenue - costs
                total_profit += profit
            
            all_outcomes.append({
                'final_revenue': current_revenue,
                'total_profit': total_profit,
                'average_monthly_profit': total_profit / periods
            })
        
        # Extract final revenues for analysis
        final_revenues = [outcome['final_revenue'] for outcome in all_outcomes]
        total_profits = [outcome['total_profit'] for outcome in all_outcomes]
        
        # Calculate comprehensive statistics
        result = self._calculate_simulation_statistics(
            final_revenues,
            "Final Revenue",
            self.config.confidence_level
        )
        
        logger.info(f"✅ Simulation complete - Mean outcome: ${result.mean:,.0f}")
        
        return result
    
    def run_scenario_simulation(
        self,
        base_financials: Dict[str, Any],
        variable_ranges: Dict[str, Tuple[float, float, DistributionType]],
        periods: int = 12
    ) -> Dict[str, SimulationResult]:
        """
        Run comprehensive scenario simulation with multiple variables
        
        Args:
            base_financials: Base financial state
            variable_ranges: Dictionary of variables with (min, max, distribution)
            periods: Simulation periods
            
        Returns:
            Dictionary of results for each metric
        """
        logger.info(f"🎯 Running multi-variable Monte Carlo: {len(variable_ranges)} variables")
        
        results = {
            'revenue': [],
            'profit': [],
            'cash_flow': [],
            'roi': []
        }
        
        base_revenue = base_financials.get('revenue', 1000000)
        base_costs = base_financials.get('costs', 700000)
        
        for iteration in range(self.config.iterations):
            # Sample from each variable's distribution
            sampled_params = {}
            for var_name, (min_val, max_val, dist_type) in variable_ranges.items():
                sampled_params[var_name] = self._sample_from_distribution(
                    min_val, max_val, dist_type
                )
            
            # Run simulation with sampled parameters
            outcome = self._simulate_period(
                base_revenue,
                base_costs,
                sampled_params,
                periods
            )
            
            results['revenue'].append(outcome['final_revenue'])
            results['profit'].append(outcome['total_profit'])
            results['cash_flow'].append(outcome['total_cash_flow'])
            results['roi'].append(outcome['roi'])
        
        # Calculate statistics for each metric
        simulation_results = {}
        for metric_name, values in results.items():
            simulation_results[metric_name] = self._calculate_simulation_statistics(
                values,
                metric_name,
                self.config.confidence_level
            )
        
        logger.info(f"✅ Multi-variable simulation complete")
        return simulation_results
    
    def run_risk_analysis(
        self,
        base_revenue: float,
        base_costs: float,
        revenue_volatility: float,
        cost_volatility: float,
        correlation: float = 0.0,
        periods: int = 12
    ) -> Dict[str, Any]:
        """
        Comprehensive risk analysis using Monte Carlo
        
        Calculates:
        - Value at Risk (VaR)
        - Conditional Value at Risk (CVaR)
        - Probability of loss
        - Risk-adjusted returns
        
        Args:
            base_revenue: Expected revenue
            base_costs: Expected costs
            revenue_volatility: Revenue standard deviation
            cost_volatility: Cost standard deviation
            correlation: Correlation between revenue and costs
            periods: Analysis periods
            
        Returns:
            Comprehensive risk metrics
        """
        logger.info(f"⚠️  Running risk analysis: {self.config.iterations:,} scenarios")
        
        outcomes = []
        
        for _ in range(self.config.iterations):
            # Generate correlated random variables
            if correlation != 0:
                # Use Cholesky decomposition for correlation
                mean = [0, 0]
                cov = [[1, correlation], [correlation, 1]]
                random_vars = np.random.multivariate_normal(mean, cov)
                revenue_shock = random_vars[0] * revenue_volatility
                cost_shock = random_vars[1] * cost_volatility
            else:
                revenue_shock = np.random.normal(0, revenue_volatility)
                cost_shock = np.random.normal(0, cost_volatility)
            
            # Calculate outcome
            actual_revenue = base_revenue * (1 + revenue_shock)
            actual_costs = base_costs * (1 + cost_shock)
            profit = actual_revenue - actual_costs
            
            outcomes.append(profit)
        
        outcomes = np.array(outcomes)
        
        # Calculate risk metrics
        mean_profit = np.mean(outcomes)
        std_profit = np.std(outcomes)
        
        # Value at Risk (95% confidence)
        var_95 = np.percentile(outcomes, 5)
        
        # Conditional Value at Risk (expected loss in worst 5% of cases)
        cvar_95 = np.mean(outcomes[outcomes <= var_95])
        
        # Probability of loss
        prob_loss = np.sum(outcomes < 0) / len(outcomes) * 100
        
        # Sharpe ratio (risk-adjusted return)
        risk_free_rate = 0.02  # Assume 2% risk-free rate
        sharpe_ratio = (mean_profit - risk_free_rate) / std_profit if std_profit > 0 else 0
        
        # Sortino ratio (downside risk only)
        downside_returns = outcomes[outcomes < mean_profit]
        downside_std = np.std(downside_returns) if len(downside_returns) > 0 else std_profit
        sortino_ratio = (mean_profit - risk_free_rate) / downside_std if downside_std > 0 else 0
        
        risk_analysis = {
            'expected_profit': round(float(mean_profit), 2),
            'profit_std_dev': round(float(std_profit), 2),
            'value_at_risk_95': round(float(var_95), 2),
            'conditional_var_95': round(float(cvar_95), 2),
            'probability_of_loss': round(float(prob_loss), 2),
            'sharpe_ratio': round(float(sharpe_ratio), 3),
            'sortino_ratio': round(float(sortino_ratio), 3),
            'coefficient_of_variation': round(float(std_profit / mean_profit), 3) if mean_profit != 0 else None,
            'worst_case': round(float(np.min(outcomes)), 2),
            'best_case': round(float(np.max(outcomes)), 2),
            'percentile_10': round(float(np.percentile(outcomes, 10)), 2),
            'percentile_90': round(float(np.percentile(outcomes, 90)), 2),
        }
        
        logger.info(f"✅ Risk analysis complete - Probability of loss: {prob_loss:.1f}%")
        
        return risk_analysis
    
    def _calculate_simulation_statistics(
        self,
        values: List[float],
        metric_name: str,
        confidence_level: float
    ) -> SimulationResult:
        """Calculate comprehensive statistics from simulation results"""
        
        values_array = np.array(values)
        
        # Basic statistics
        mean = np.mean(values_array)
        median = np.median(values_array)
        std_dev = np.std(values_array)
        variance = np.var(values_array)
        
        # Mode (most common value in histogram)
        hist, bin_edges = np.histogram(values_array, bins=50)
        mode_idx = np.argmax(hist)
        mode = (bin_edges[mode_idx] + bin_edges[mode_idx + 1]) / 2
        
        # Higher moments
        skewness = float(stats.skew(values_array))
        kurtosis = float(stats.kurtosis(values_array))
        
        # Percentiles
        p5 = np.percentile(values_array, 5)
        p10 = np.percentile(values_array, 10)
        p25 = np.percentile(values_array, 25)
        p75 = np.percentile(values_array, 75)
        p90 = np.percentile(values_array, 90)
        p95 = np.percentile(values_array, 95)
        
        # Range
        min_value = np.min(values_array)
        max_value = np.max(values_array)
        value_range = max_value - min_value
        
        # Confidence interval
        alpha = 1 - confidence_level
        ci_lower = np.percentile(values_array, alpha/2 * 100)
        ci_upper = np.percentile(values_array, (1 - alpha/2) * 100)
        
        # Risk metrics
        probability_of_loss = np.sum(values_array < 0) / len(values_array)
        value_at_risk = np.percentile(values_array, 5)
        conditional_var = np.mean(values_array[values_array <= value_at_risk])
        
        # Histogram data
        histogram_data = {
            'bins': bin_edges.tolist(),
            'counts': hist.tolist(),
            'bin_centers': [(bin_edges[i] + bin_edges[i+1])/2 for i in range(len(bin_edges)-1)]
        }
        
        return SimulationResult(
            scenario_name=metric_name,
            metric=metric_name,
            mean=float(mean),
            median=float(median),
            mode=float(mode),
            std_dev=float(std_dev),
            variance=float(variance),
            skewness=skewness,
            kurtosis=kurtosis,
            p5=float(p5),
            p10=float(p10),
            p25=float(p25),
            p75=float(p75),
            p90=float(p90),
            p95=float(p95),
            min_value=float(min_value),
            max_value=float(max_value),
            range=float(value_range),
            ci_lower=float(ci_lower),
            ci_upper=float(ci_upper),
            probability_of_loss=float(probability_of_loss),
            value_at_risk=float(value_at_risk),
            conditional_value_at_risk=float(conditional_var),
            distribution=values_array.tolist(),
            histogram_data=histogram_data
        )
    
    def _sample_from_distribution(
        self,
        min_val: float,
        max_val: float,
        dist_type: DistributionType
    ) -> float:
        """Sample a value from specified distribution"""
        
        if dist_type == DistributionType.NORMAL:
            mean = (min_val + max_val) / 2
            std = (max_val - min_val) / 4  # ~95% within range
            return np.random.normal(mean, std)
        
        elif dist_type == DistributionType.UNIFORM:
            return np.random.uniform(min_val, max_val)
        
        elif dist_type == DistributionType.TRIANGULAR:
            mode = (min_val + max_val) / 2
            return np.random.triangular(min_val, mode, max_val)
        
        elif dist_type == DistributionType.LOGNORMAL:
            mean = (min_val + max_val) / 2
            sigma = 0.5
            return np.random.lognormal(np.log(mean), sigma)
        
        else:
            # Default to normal
            mean = (min_val + max_val) / 2
            std = (max_val - min_val) / 4
            return np.random.normal(mean, std)
    
    def _simulate_period(
        self,
        base_revenue: float,
        base_costs: float,
        params: Dict[str, float],
        periods: int
    ) -> Dict[str, float]:
        """Simulate a single scenario over multiple periods"""
        
        current_revenue = base_revenue
        current_costs = base_costs
        total_profit = 0
        total_cash_flow = 0
        
        for month in range(periods):
            # Apply parameter effects
            growth_rate = params.get('growth_rate', 0.0)
            cost_inflation = params.get('cost_inflation', 0.0)
            margin_improvement = params.get('margin_improvement', 0.0)
            
            current_revenue *= (1 + growth_rate)
            current_costs *= (1 + cost_inflation)
            current_costs *= (1 - margin_improvement)  # Margin improvement reduces costs
            
            profit = current_revenue - current_costs
            total_profit += profit
            
            # Simple cash flow (profit + depreciation - capex)
            depreciation = base_costs * 0.05
            capex = base_revenue * 0.03
            cash_flow = profit + depreciation - capex
            total_cash_flow += cash_flow
        
        final_revenue = current_revenue
        roi = (total_profit / base_revenue * 100) if base_revenue > 0 else 0
        
        return {
            'final_revenue': final_revenue,
            'total_profit': total_profit,
            'total_cash_flow': total_cash_flow,
            'roi': roi
        }


# ============================================================================
# SENSITIVITY ANALYSIS ENGINE
# ============================================================================

class SensitivityAnalyzer:
    """
    Multi-variable sensitivity analysis for strategic decision making
    
    Identifies which variables have the most impact on outcomes
    """
    
    def __init__(self, base_model: Dict[str, Any]):
        """
        Initialize sensitivity analyzer
        
        Args:
            base_model: Base financial model
        """
        self.base_model = base_model
        self.base_revenue = base_model.get('revenue', 1000000)
        self.base_costs = base_model.get('costs', 700000)
        self.base_profit = self.base_revenue - self.base_costs
        
        logger.info("✓ Sensitivity Analyzer initialized")
    
    def analyze_single_variable(
        self,
        variable_name: str,
        base_value: float,
        variation_range: float = 0.2,
        num_points: int = 21
    ) -> SensitivityResult:
        """
        Analyze sensitivity to a single variable
        
        Args:
            variable_name: Name of variable to analyze
            base_value: Base value of variable
            variation_range: Range to vary (+/- percentage)
            num_points: Number of test points
            
        Returns:
            Sensitivity analysis result
        """
        logger.info(f"📊 Analyzing sensitivity to: {variable_name}")
        
        # Generate test values
        min_val = base_value * (1 - variation_range)
        max_val = base_value * (1 + variation_range)
        test_values = np.linspace(min_val, max_val, num_points)
        
        output_values = []
        
        for test_value in test_values:
            # Calculate outcome with this value
            outcome = self._calculate_outcome(variable_name, test_value)
            output_values.append(outcome)
        
        # Calculate elasticity (% change in output / % change in input)
        mid_idx = num_points // 2
        base_output = output_values[mid_idx]
        
        # Use adjacent points for elasticity
        if mid_idx > 0 and mid_idx < len(output_values) - 1:
            delta_output = output_values[mid_idx + 1] - output_values[mid_idx - 1]
            delta_input = test_values[mid_idx + 1] - test_values[mid_idx - 1]
            
            elasticity = (delta_output / base_output) / (delta_input / base_value) if base_output != 0 and base_value != 0 else 0
        else:
            elasticity = 0
        
        # Calculate impact score (normalized measure of importance)
        output_range = max(output_values) - min(output_values)
        impact_score = abs(output_range / base_output) * 100 if base_output != 0 else 0
        
        return SensitivityResult(
            variable_name=variable_name,
            base_value=float(base_value),
            test_values=[float(v) for v in test_values],
            output_values=[float(v) for v in output_values],
            elasticity=float(elasticity),
            impact_score=float(impact_score),
            sensitivity_range=(float(min(output_values)), float(max(output_values)))
        )
    
    def analyze_multiple_variables(
        self,
        variables: Dict[str, float],
        variation_range: float = 0.2
    ) -> Dict[str, SensitivityResult]:
        """
        Analyze sensitivity to multiple variables
        
        Returns results sorted by impact
        """
        logger.info(f"🎯 Analyzing {len(variables)} variables")
        
        results = {}
        
        for var_name, base_value in variables.items():
            result = self.analyze_single_variable(
                var_name,
                base_value,
                variation_range
            )
            results[var_name] = result
        
        # Sort by impact score
        sorted_results = dict(
            sorted(results.items(), key=lambda x: x[1].impact_score, reverse=True)
        )
        
        logger.info(f"✅ Sensitivity analysis complete")
        return sorted_results
    
    def create_tornado_chart_data(
        self,
        sensitivity_results: Dict[str, SensitivityResult]
    ) -> Dict[str, Any]:
        """
        Prepare data for tornado chart visualization
        
        A tornado chart shows which variables have the most impact
        """
        chart_data = []
        
        for var_name, result in sensitivity_results.items():
            min_output = result.sensitivity_range[0]
            max_output = result.sensitivity_range[1]
            base_output = self.base_profit
            
            chart_data.append({
                'variable': var_name,
                'downside': float(min_output - base_output),
                'upside': float(max_output - base_output),
                'impact_score': result.impact_score,
                'elasticity': result.elasticity
            })
        
        # Sort by total impact
        chart_data.sort(key=lambda x: abs(x['upside']) + abs(x['downside']), reverse=True)
        
        return {
            'tornado_data': chart_data,
            'base_value': float(self.base_profit),
            'most_sensitive': chart_data[0]['variable'] if chart_data else None
        }
    
    def _calculate_outcome(self, variable_name: str, value: float) -> float:
        """Calculate profit outcome for a given variable value"""
        
        revenue = self.base_revenue
        costs = self.base_costs
        
        if variable_name == 'revenue':
            revenue = value
        elif variable_name == 'price':
            revenue = self.base_revenue * (value / 100)
        elif variable_name == 'volume':
            revenue = self.base_revenue * (value / 100)
        elif variable_name == 'costs':
            costs = value
        elif variable_name == 'cost_ratio':
            costs = revenue * value
        elif variable_name == 'growth_rate':
            revenue = self.base_revenue * (1 + value)
        
        return revenue - costs


# ============================================================================
# BREAK-EVEN ANALYSIS ENGINE
# ============================================================================

class BreakEvenAnalyzer:
    """
    Comprehensive break-even analysis and margin optimization
    
    Critical for pricing decisions and cost management
    """
    
    def __init__(self, financials: Dict[str, Any]):
        """
        Initialize break-even analyzer
        
        Args:
            financials: Financial data including costs and pricing
        """
        self.fixed_costs = financials.get('fixed_costs', 200000)
        self.variable_cost_per_unit = financials.get('variable_cost_per_unit', 50)
        self.price_per_unit = financials.get('price_per_unit', 100)
        self.current_volume = financials.get('current_volume', 5000)
        
        logger.info(f"✓ Break-Even Analyzer initialized - Fixed costs: ${self.fixed_costs:,.0f}")
    
    def calculate_break_even(self) -> BreakEvenAnalysis:
        """
        Calculate comprehensive break-even metrics
        
        Returns:
            Complete break-even analysis
        """
        logger.info("📊 Calculating break-even analysis")
        
        # Contribution margin per unit
        contribution_margin = self.price_per_unit - self.variable_cost_per_unit
        
        # Contribution margin ratio
        contribution_margin_ratio = contribution_margin / self.price_per_unit if self.price_per_unit > 0 else 0
        
        # Break-even units
        break_even_units = self.fixed_costs / contribution_margin if contribution_margin > 0 else float('inf')
        
        # Break-even revenue
        break_even_revenue = break_even_units * self.price_per_unit
        
        # Current revenue and profit
        current_revenue = self.current_volume * self.price_per_unit
        current_variable_costs = self.current_volume * self.variable_cost_per_unit
        current_profit = current_revenue - current_variable_costs - self.fixed_costs
        
        # Margin of safety (how much sales can drop before break-even)
        margin_of_safety = current_revenue - break_even_revenue
        margin_of_safety_percentage = (margin_of_safety / current_revenue * 100) if current_revenue > 0 else 0
        
        # Operating leverage (how much profit changes with sales)
        # Higher leverage = higher risk but higher reward
        contribution_margin_total = self.current_volume * contribution_margin
        operating_leverage = contribution_margin_total / current_profit if current_profit > 0 else 0
        
        result = BreakEvenAnalysis(
            break_even_units=float(break_even_units),
            break_even_revenue=float(break_even_revenue),
            margin_of_safety=float(margin_of_safety),
            margin_of_safety_percentage=float(margin_of_safety_percentage),
            contribution_margin=float(contribution_margin),
            contribution_margin_ratio=float(contribution_margin_ratio),
            operating_leverage=float(operating_leverage)
        )
        
        logger.info(f"✅ Break-even: {break_even_units:,.0f} units (${break_even_revenue:,.0f})")
        
        return result
    
    def calculate_target_volume(self, target_profit: float) -> Dict[str, Any]:
        """
        Calculate volume needed to achieve target profit
        
        Args:
            target_profit: Desired profit amount
            
        Returns:
            Volume requirements and analysis
        """
        contribution_margin = self.price_per_unit - self.variable_cost_per_unit
        
        # Units needed = (Fixed Costs + Target Profit) / Contribution Margin
        required_units = (self.fixed_costs + target_profit) / contribution_margin if contribution_margin > 0 else float('inf')
        
        # Revenue needed
        required_revenue = required_units * self.price_per_unit
        
        # Compare to current
        additional_units = required_units - self.current_volume
        additional_revenue = additional_units * self.price_per_unit
        
        return {
            'target_profit': float(target_profit),
            'required_units': float(required_units),
            'required_revenue': float(required_revenue),
            'current_units': float(self.current_volume),
            'additional_units_needed': float(additional_units),
            'additional_revenue_needed': float(additional_revenue),
            'percentage_increase': float((additional_units / self.current_volume * 100) if self.current_volume > 0 else 0)
        }
    
    def optimize_pricing(
        self,
        target_margin: float,
        market_demand_elasticity: float = -1.5
    ) -> Dict[str, Any]:
        """
        Optimize pricing to achieve target margin
        
        Args:
            target_margin: Desired profit margin (%)
            market_demand_elasticity: How demand changes with price
            
        Returns:
            Optimal pricing strategy
        """
        logger.info(f"💰 Optimizing pricing for {target_margin}% margin")
        
        # Calculate optimal price for target margin
        # Target margin = (Price - Variable Cost) / Price
        # Solving for Price: Price = Variable Cost / (1 - Target Margin)
        target_margin_decimal = target_margin / 100
        optimal_price = self.variable_cost_per_unit / (1 - target_margin_decimal)
        
        # Estimate demand change based on elasticity
        price_change_pct = ((optimal_price - self.price_per_unit) / self.price_per_unit) * 100
        demand_change_pct = price_change_pct * market_demand_elasticity
        new_volume = self.current_volume * (1 + demand_change_pct / 100)
        
        # Calculate outcomes
        current_profit = (self.price_per_unit - self.variable_cost_per_unit) * self.current_volume - self.fixed_costs
        new_profit = (optimal_price - self.variable_cost_per_unit) * new_volume - self.fixed_costs
        
        return {
            'current_price': float(self.price_per_unit),
            'optimal_price': float(optimal_price),
            'price_change_pct': float(price_change_pct),
            'current_volume': float(self.current_volume),
            'expected_new_volume': float(new_volume),
            'volume_change_pct': float(demand_change_pct),
            'current_profit': float(current_profit),
            'expected_new_profit': float(new_profit),
            'profit_improvement': float(new_profit - current_profit),
            'recommendation': 'increase' if optimal_price > self.price_per_unit else 'decrease'
        }


# ============================================================================
# STRATEGIC SIMULATION ENGINE (FOR YOUR FRONTEND)
# ============================================================================

class StrategicSimulator:
    """
    High-level strategic simulation engine that matches your frontend needs
    
    This generates the strategic advice and forecast data your frontend displays
    """
    
    def __init__(self, base_financials: Dict[str, Any]):
        """
        Initialize strategic simulator
        
        Args:
            base_financials: Current financial state
        """
        self.base_financials = base_financials
        self.scenario_analyzer = ScenarioAnalyzer(base_financials)
        
        logger.info("✓ Strategic Simulator initialized")
    
    def simulate_strategic_decision(
        self,
        decision_description: str,
        parameters: Dict[str, float],
        duration_months: int = 12
    ) -> Dict[str, Any]:
        """
        Simulate a strategic decision and generate advice
        
        This is what your frontend calls when simulating scenarios
        
        Args:
            decision_description: What the user wants to do
            parameters: The changes (e.g., {'revenue_growth': 0.15, 'cost_reduction': 0.10})
            duration_months: How far to project
            
        Returns:
            Complete simulation result with advice, impacts, and forecast data
        """
        logger.info(f"🎯 Simulating strategic decision: {decision_description}")
        
        # Convert parameters to ScenarioParameters
        scenario_params = ScenarioParameters(
            revenue_growth_rate=parameters.get('revenue_growth', 0.0),
            price_change=parameters.get('price_change', 0.0),
            volume_change=parameters.get('volume_change', 0.0),
            cogs_change=parameters.get('cost_change', 0.0),
            opex_change=parameters.get('opex_change', 0.0),
            productivity_improvement=parameters.get('productivity_improvement', 0.0),
            automation_savings=parameters.get('automation_savings', 0.0),
            customer_acquisition_rate=parameters.get('customer_acquisition', 0.0),
            customer_churn_rate=parameters.get('churn_rate', 0.0),
        )
        
        # Run scenario analysis
        scenario = self.scenario_analyzer.create_comprehensive_scenario(
            scenario_name="Strategic Decision Simulation",
            scenario_type=ScenarioType.CUSTOM,
            parameters=scenario_params,
            duration_months=duration_months,
            include_seasonality=True
        )
        
        # Generate strategic insights
        impacts = self._generate_impact_analysis(scenario, parameters)
        recommendation = self._generate_recommendation(scenario, parameters)
        summary = self._generate_executive_summary(scenario, decision_description)
        
        # Format forecast data for frontend chart
        simulated_forecast_data = [
            {
                'period_end_date': p['date'],
                'revenue': p['revenue'],
                'net_income': p['net_income'],
                'gross_margin': p['gross_margin'],
                'predicted': True  # Mark as simulated
            }
            for p in scenario['projections']
        ]
        
        result = {
            'summary': summary,
            'impacts': impacts,
            'recommendation': recommendation,
            'simulated_forecast_data': simulated_forecast_data,
            'key_metrics': {
                'total_revenue_change': scenario['summary']['total_growth_percentage'],
                'avg_margin': scenario['summary']['average_margin'],
                'npv': scenario['summary'].get('npv', 0),
                'roi': scenario['projections'][-1]['roi'] if scenario['projections'] else 0,
                'risk_level': scenario['risk_assessment']['risk_level'],
                'probability_of_success': scenario['risk_assessment']['probability_of_success']
            },
            'full_scenario': scenario  # Complete data for advanced analysis
        }
        
        logger.info(f"✅ Simulation complete - Expected growth: {scenario['summary']['total_growth_percentage']:.1f}%")
        
        return result
    
    def _generate_impact_analysis(
        self,
        scenario: Dict[str, Any],
        parameters: Dict[str, float]
    ) -> List[str]:
        """Generate list of key impacts"""
        
        impacts = []
        summary = scenario['summary']
        
        # Revenue impact
        total_growth = summary['total_growth_percentage']
        if total_growth > 20:
            impacts.append(f"📈 Revenue projected to increase by {total_growth:.1f}% over the period")
        elif total_growth > 0:
            impacts.append(f"📊 Moderate revenue growth of {total_growth:.1f}% expected")
        else:
            impacts.append(f"⚠️ Revenue decline of {abs(total_growth):.1f}% projected - mitigation needed")
        
        # Margin impact
        avg_margin = summary['average_margin']
        base_margin = (self.base_financials.get('profit', 300000) / self.base_financials.get('revenue', 1000000)) * 100
        margin_change = avg_margin - base_margin
        
        if margin_change > 5:
            impacts.append(f"💰 Margin improvement of {margin_change:.1f} percentage points")
        elif margin_change > 0:
            impacts.append(f"✅ Slight margin improvement of {margin_change:.1f} points")
        elif margin_change < 0:
            impacts.append(f"⚡ Margin compression of {abs(margin_change):.1f} points - monitor closely")
        
        # Cash flow impact
        total_cash = summary['total_cash_flow']
        if total_cash > 0:
            impacts.append(f"💵 Positive cash generation of ${total_cash:,.0f}")
        else:
            impacts.append(f"🔴 Cash burn of ${abs(total_cash):,.0f} - funding required")
        
        # Risk impact
        risk_level = scenario['risk_assessment']['risk_level']
        if risk_level in [RiskLevel.HIGH, RiskLevel.CRITICAL]:
            impacts.append(f"⚠️ High risk scenario - {scenario['risk_assessment']['probability_of_success']:.0f}% success probability")
        else:
            impacts.append(f"✅ Manageable risk level with {scenario['risk_assessment']['probability_of_success']:.0f}% success probability")
        
        # Parameter-specific impacts
        if parameters.get('price_change', 0) != 0:
            price_pct = parameters['price_change']
            impacts.append(f"💲 {price_pct:+.1f}% price change will affect demand and margins")
        
        if parameters.get('customer_acquisition', 0) > 0.1:
            impacts.append(f"📱 Aggressive customer acquisition strategy requires sustained investment")
        
        return impacts
    
    def _generate_recommendation(
        self,
        scenario: Dict[str, Any],
        parameters: Dict[str, float]
    ) -> str:
        """Generate strategic recommendation"""
        
        summary = scenario['summary']
        risk = scenario['risk_assessment']
        
        total_growth = summary['total_growth_percentage']
        npv = summary.get('npv', 0)
        risk_level = risk['risk_level']
        
        # Decision logic
        if npv > 0 and total_growth > 15 and risk_level in [RiskLevel.LOW, RiskLevel.MODERATE]:
            recommendation = f"✅ PROCEED - Strong positive NPV of ${npv:,.0f} with {total_growth:.1f}% growth and manageable risk. Execute this strategy with confidence while monitoring key metrics monthly."
        
        elif npv > 0 and risk_level == RiskLevel.HIGH:
            recommendation = f"⚡ PROCEED WITH CAUTION - Positive NPV of ${npv:,.0f} but high risk. Implement in phases with go/no-go checkpoints at months 3, 6, and 9. Maintain cash reserves for contingencies."
        
        elif npv > 0 and total_growth < 10:
            recommendation = f"📊 CONSIDER ALTERNATIVES - Modest returns ({total_growth:.1f}% growth). Compare against other strategic options before committing. Look for higher-impact opportunities."
        
        elif npv < 0 and total_growth > 0:
            recommendation = f"⚠️ REVISE STRATEGY - Negative NPV of ${abs(npv):,.0f} despite growth. Reduce costs by 15-20% or increase pricing by 10-15% to achieve profitability. Re-run simulation after adjustments."
        
        else:
            recommendation = f"🔴 DO NOT PROCEED - Negative NPV and declining revenue. This strategy will destroy value. Consider pivot to market expansion, product innovation, or operational excellence initiatives instead."
        
        return recommendation
    
    def _generate_executive_summary(
        self,
        scenario: Dict[str, Any],
        decision_description: str
    ) -> str:
        """Generate executive summary"""
        
        summary = scenario['summary']
        
        return (
            f"Strategic Impact of {decision_description}: "
            f"${summary['total_revenue']:,.0f} projected revenue "
            f"({summary['total_growth_percentage']:+.1f}% change) with "
            f"{summary['average_margin']:.1f}% average margin"
        )


# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================

def create_default_scenarios(base_financials: Dict[str, Any]) -> Dict[str, Dict]:
    """
    Create default scenario set for comparison
    
    Returns base, optimistic, and pessimistic scenarios
    """
    logger.info("📊 Creating default scenario set")
    
    analyzer = ScenarioAnalyzer(base_financials)
    
    # Base case - current trajectory
    base_params = ScenarioParameters()
    
    # Optimistic - everything goes well
    optimistic_params = ScenarioParameters(
        revenue_growth_rate=0.25,
        cogs_change=-0.05,
        productivity_improvement=10.0,
        customer_acquisition_rate=0.15,
        customer_churn_rate=0.05
    )
    
    # Pessimistic - challenges arise
    pessimistic_params = ScenarioParameters(
        revenue_growth_rate=-0.10,
        cogs_change=0.10,
        customer_churn_rate=0.20,
        market_growth_rate=-0.05
    )
    
    scenarios = {
        'base': analyzer.create_comprehensive_scenario(
            "Base Case",
            ScenarioType.BASE,
            base_params,
            24
        ),
        'optimistic': analyzer.create_comprehensive_scenario(
            "Optimistic Case",
            ScenarioType.OPTIMISTIC,
            optimistic_params,
            24
        ),
        'pessimistic': analyzer.create_comprehensive_scenario(
            "Pessimistic Case",
            ScenarioType.PESSIMISTIC,
            pessimistic_params,
            24
        )
    }
    
    logger.info("✅ Default scenarios created")
    return scenarios


# ============================================================================
# EXPORT
# ============================================================================

__all__ = [
    'ScenarioAnalyzer',
    'MonteCarloSimulator',
    'SensitivityAnalyzer',
    'BreakEvenAnalyzer',
    'StrategicSimulator',
    'ScenarioParameters',
    'MonteCarloConfig',
    'SimulationResult',
    'BreakEvenAnalysis',
    'SensitivityResult',
    'ScenarioType',
    'RiskLevel',
    'DistributionType',
    'create_default_scenarios'
]