# backend/cash_flow_forecaster.py
"""
AI-Powered Cash Flow Forecasting Engine
The feature that prevents bankruptcy
"""

import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass
import logging

logger = logging.getLogger(__name__)

@dataclass
class CashFlowAlert:
    """Cash flow alert"""
    severity: str  # 'critical', 'warning', 'info'
    date: str
    message: str
    action: str
    impact: float  # Dollar amount

@dataclass
class CashFlowForecast:
    """Complete cash flow forecast"""
    daily_balances: List[Dict[str, Any]]
    alerts: List[CashFlowAlert]
    summary: Dict[str, Any]
    recommendations: List[str]

class CashFlowForecaster:
    """
    Predicts future cash flow with scary accuracy
    Prevents businesses from going bankrupt
    """
    
    def __init__(self, financial_data: Dict[str, Any]):
        """
        Initialize forecaster
        
        Args:
            financial_data: Current financial state including:
                - current_balance: Cash on hand now
                - monthly_revenue: Expected monthly revenue
                - monthly_expenses: Expected monthly expenses
                - receivables: Money owed to you
                - payables: Money you owe
                - historical_transactions: Past 90 days (optional)
        """
        self.current_balance = financial_data.get('current_balance', 50000)
        self.monthly_revenue = financial_data.get('monthly_revenue', 100000)
        self.monthly_expenses = financial_data.get('monthly_expenses', 80000)
        self.receivables = financial_data.get('receivables', [])
        self.payables = financial_data.get('payables', [])
        self.historical = financial_data.get('historical_transactions', [])
        
        logger.info(f"💰 Cash Flow Forecaster initialized - Current balance: ${self.current_balance:,.0f}")
    
    def forecast_next_90_days(self) -> CashFlowForecast:
        """
        Generate 90-day cash flow forecast
        
        Returns:
            Complete forecast with daily balances and alerts
        """
        logger.info("🔮 Generating 90-day cash flow forecast")
        
        # Generate daily projections
        daily_balances = self._project_daily_balances(90)
        
        # Detect critical issues
        alerts = self._detect_alerts(daily_balances)
        
        # Calculate summary metrics
        summary = self._calculate_summary(daily_balances, alerts)
        
        # Generate recommendations
        recommendations = self._generate_recommendations(daily_balances, alerts)
        
        forecast = CashFlowForecast(
            daily_balances=daily_balances,
            alerts=alerts,
            summary=summary,
            recommendations=recommendations
        )
        
        logger.info(f"✅ Forecast complete - Lowest balance: ${summary['lowest_balance']:,.0f} on {summary['lowest_balance_date']}")
        
        return forecast
    
    def _project_daily_balances(self, days: int) -> List[Dict[str, Any]]:
        """Project daily cash balances"""
        
        projections = []
        current_balance = self.current_balance
        
        # Daily averages
        daily_revenue = self.monthly_revenue / 30
        daily_expenses = self.monthly_expenses / 30
        
        # Add known receivables and payables
        scheduled_cash_flows = self._get_scheduled_cash_flows()
        
        for day in range(days):
            date = datetime.now() + timedelta(days=day)
            date_str = date.strftime('%Y-%m-%d')
            
            # Base daily flow
            daily_inflow = daily_revenue * (1 + np.random.normal(0, 0.1))  # 10% variance
            daily_outflow = daily_expenses * (1 + np.random.normal(0, 0.05))  # 5% variance
            
            # Add scheduled flows
            scheduled = scheduled_cash_flows.get(date_str, {'inflow': 0, 'outflow': 0})
            daily_inflow += scheduled['inflow']
            daily_outflow += scheduled['outflow']
            
            # Calculate balance
            net_flow = daily_inflow - daily_outflow
            current_balance += net_flow
            
            # Determine status
            if current_balance < 0:
                status = 'critical'
            elif current_balance < self.monthly_expenses * 0.25:
                status = 'warning'
            elif current_balance < self.monthly_expenses * 0.5:
                status = 'caution'
            else:
                status = 'healthy'
            
            projections.append({
                'date': date_str,
                'day_number': day + 1,
                'opening_balance': current_balance - net_flow,
                'inflow': daily_inflow,
                'outflow': daily_outflow,
                'net_flow': net_flow,
                'closing_balance': current_balance,
                'status': status,
                'day_of_week': date.strftime('%A'),
                'week_number': day // 7 + 1
            })
        
        return projections
    
    def _get_scheduled_cash_flows(self) -> Dict[str, Dict[str, float]]:
        """Get known future cash flows"""
        
        scheduled = {}
        
        # Process receivables (money coming in)
        for rec in self.receivables:
            date_str = rec.get('due_date', '')
            if date_str:
                if date_str not in scheduled:
                    scheduled[date_str] = {'inflow': 0, 'outflow': 0}
                scheduled[date_str]['inflow'] += rec.get('amount', 0)
        
        # Process payables (money going out)
        for pay in self.payables:
            date_str = pay.get('due_date', '')
            if date_str:
                if date_str not in scheduled:
                    scheduled[date_str] = {'inflow': 0, 'outflow': 0}
                scheduled[date_str]['outflow'] += pay.get('amount', 0)
        
        return scheduled
    
    def _detect_alerts(self, daily_balances: List[Dict]) -> List[CashFlowAlert]:
        """Detect critical cash flow issues"""
        
        alerts = []
        
        # Check for negative balance
        for day in daily_balances:
            if day['closing_balance'] < 0:
                alerts.append(CashFlowAlert(
                    severity='critical',
                    date=day['date'],
                    message=f"🚨 CASH CRISIS: Balance will be ${abs(day['closing_balance']):,.0f} negative",
                    action="URGENT: Secure emergency funding or delay payments immediately",
                    impact=abs(day['closing_balance'])
                ))
                break  # Only alert on first occurrence
        
        # Check for dangerously low balance
        low_balance_threshold = self.monthly_expenses * 0.25
        for day in daily_balances:
            if 0 < day['closing_balance'] < low_balance_threshold:
                alerts.append(CashFlowAlert(
                    severity='warning',
                    date=day['date'],
                    message=f"⚠️ LOW CASH: Balance will drop to ${day['closing_balance']:,.0f}",
                    action="Invoice customers early or negotiate payment terms with vendors",
                    impact=low_balance_threshold - day['closing_balance']
                ))
                break
        
        # Check for large upcoming payments
        for day in daily_balances:
            if day['outflow'] > self.monthly_expenses * 0.3:  # 30% of monthly expenses in one day
                alerts.append(CashFlowAlert(
                    severity='info',
                    date=day['date'],
                    message=f"💸 LARGE PAYMENT: ${day['outflow']:,.0f} due",
                    action="Ensure sufficient funds available",
                    impact=day['outflow']
                ))
        
        # Sort by severity
        severity_order = {'critical': 0, 'warning': 1, 'info': 2}
        alerts.sort(key=lambda x: severity_order[x.severity])
        
        return alerts[:10]  # Return top 10 alerts
    
    def _calculate_summary(self, daily_balances: List[Dict], alerts: List[CashFlowAlert]) -> Dict[str, Any]:
        """Calculate summary metrics"""
        
        balances = [d['closing_balance'] for d in daily_balances]
        
        lowest_balance = min(balances)
        lowest_balance_idx = balances.index(lowest_balance)
        lowest_balance_date = daily_balances[lowest_balance_idx]['date']
        
        highest_balance = max(balances)
        avg_balance = np.mean(balances)
        
        # Days until crisis
        days_until_zero = None
        for i, day in enumerate(daily_balances):
            if day['closing_balance'] <= 0:
                days_until_zero = i + 1
                break
        
        # Burn rate
        total_outflow = sum(d['outflow'] for d in daily_balances[:30])
        monthly_burn = total_outflow
        
        # Runway
        runway_months = self.current_balance / monthly_burn if monthly_burn > 0 else float('inf')
        
        return {
            'current_balance': self.current_balance,
            'lowest_balance': lowest_balance,
            'lowest_balance_date': lowest_balance_date,
            'highest_balance': highest_balance,
            'average_balance': avg_balance,
            'days_until_zero': days_until_zero,
            'monthly_burn_rate': monthly_burn,
            'runway_months': runway_months,
            'total_inflow_30days': sum(d['inflow'] for d in daily_balances[:30]),
            'total_outflow_30days': sum(d['outflow'] for d in daily_balances[:30]),
            'net_change_30days': sum(d['net_flow'] for d in daily_balances[:30]),
            'critical_alerts': len([a for a in alerts if a.severity == 'critical']),
            'warning_alerts': len([a for a in alerts if a.severity == 'warning']),
            'health_score': self._calculate_health_score(daily_balances, alerts)
        }
    
    def _calculate_health_score(self, daily_balances: List[Dict], alerts: List[CashFlowAlert]) -> int:
        """Calculate cash flow health score (0-100)"""
        
        score = 100
        
        # Deduct for low balances
        if any(d['closing_balance'] < 0 for d in daily_balances[:30]):
            score -= 50
        elif any(d['closing_balance'] < self.monthly_expenses * 0.25 for d in daily_balances[:30]):
            score -= 30
        elif any(d['closing_balance'] < self.monthly_expenses * 0.5 for d in daily_balances[:30]):
            score -= 15
        
        # Deduct for alerts
        score -= len([a for a in alerts if a.severity == 'critical']) * 10
        score -= len([a for a in alerts if a.severity == 'warning']) * 5
        
        # Bonus for healthy balance
        if self.current_balance > self.monthly_expenses * 2:
            score += 10
        
        return max(0, min(100, score))
    
    def _generate_recommendations(self, daily_balances: List[Dict], alerts: List[CashFlowAlert]) -> List[str]:
        """Generate actionable recommendations"""
        
        recommendations = []
        
        # Check for cash crisis
        if any(d['closing_balance'] < 0 for d in daily_balances[:30]):
            recommendations.append("🚨 CRITICAL: You will run out of cash within 30 days. Options:")
            recommendations.append("   • Accelerate invoice collection (offer 2% discount for immediate payment)")
            recommendations.append("   • Negotiate payment terms with vendors (request 30-day extension)")
            recommendations.append("   • Consider emergency line of credit")
            recommendations.append("   • Delay non-essential expenses")
        
        # Check for low runway
        summary = self._calculate_summary(daily_balances, alerts)
        if summary['runway_months'] < 3:
            recommendations.append(f"⚠️ WARNING: Only {summary['runway_months']:.1f} months of runway remaining")
            recommendations.append("   • Start fundraising conversations now")
            recommendations.append("   • Cut discretionary spending by 20%")
            recommendations.append("   • Focus on quick-win revenue opportunities")
        
        # Positive cash flow
        if summary['net_change_30days'] > 0:
            recommendations.append("✅ POSITIVE: Cash flow is positive - you're generating more than spending")
            recommendations.append(f"   • Excess cash this month: ${summary['net_change_30days']:,.0f}")
            recommendations.append("   • Consider: paying down debt or investing in growth")
        
        # Receivables optimization
        if self.receivables:
            total_receivables = sum(r.get('amount', 0) for r in self.receivables)
            recommendations.append(f"💰 OPPORTUNITY: ${total_receivables:,.0f} in outstanding invoices")
            recommendations.append("   • Implement automated invoice reminders")
            recommendations.append("   • Offer early payment incentives (2% discount)")
            recommendations.append("   • Review aging report - follow up on 30+ day invoices")
        
        # If no issues
        if len(recommendations) == 0:
            recommendations.append("✅ Cash flow looks healthy!")
            recommendations.append("   • Maintain current payment/collection practices")
            recommendations.append("   • Build cash reserves to 3-6 months of expenses")
        
        return recommendations


def quick_forecast(current_balance: float, monthly_revenue: float, monthly_expenses: float) -> Dict[str, Any]:
    """
    Quick forecast for API endpoint
    
    Simple function that takes 3 numbers and returns forecast
    """
    
    forecaster = CashFlowForecaster({
        'current_balance': current_balance,
        'monthly_revenue': monthly_revenue,
        'monthly_expenses': monthly_expenses,
        'receivables': [],
        'payables': []
    })
    
    forecast = forecaster.forecast_next_90_days()
    
    return {
        'success': True,
        'current_balance': current_balance,
        'daily_forecast': forecast.daily_balances,
        'alerts': [
            {
                'severity': alert.severity,
                'date': alert.date,
                'message': alert.message,
                'action': alert.action,
                'impact': alert.impact
            }
            for alert in forecast.alerts
        ],
        'summary': forecast.summary,
        'recommendations': forecast.recommendations
    }