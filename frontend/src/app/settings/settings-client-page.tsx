"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSettings } from '@/context/SettingsContext';
import { useAuth } from '@clerk/nextjs';
import { 
  Settings as SettingsIcon, 
  Building2, 
  Target, 
  TrendingUp, 
  Sparkles, 
  Info, 
  ArrowLeft,
  Save,
  Check,
  RefreshCw
} from 'lucide-react';

export const dynamic = 'force-dynamic';

interface ToggleSwitchProps {
    enabled: boolean;
    onChange: () => void;
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ enabled, onChange }) => (
    <button
        type="button"
        onClick={onChange}
        className={`relative inline-flex h-8 w-16 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
            enabled ? 'bg-indigo-600' : 'bg-gray-400'
        }`}
        role="switch"
        aria-checked={enabled}
    >
        <span className="sr-only">Toggle setting</span>
        <span
            aria-hidden="true"
            className={`pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                enabled ? 'translate-x-8' : 'translate-x-0'
            }`}
        />
    </button>
);

// Comprehensive Industry Configurations
const INDUSTRY_CONFIGS = {
  'saas': {
    label: 'SaaS',
    icon: '💻',
    subIndustries: [
      'B2B Enterprise Software',
      'SMB SaaS',
      'Developer Tools',
      'Vertical SaaS',
      'PLG (Product-Led Growth)',
      'Sales-Led Growth'
    ],
    keyMetrics: [
      'ARR Growth Rate',
      'Net Revenue Retention (NRR)',
      'Gross Revenue Retention (GRR)',
      'CAC Payback Period',
      'LTV:CAC Ratio',
      'Magic Number',
      'Rule of 40',
      'Gross Margin',
      'Net Dollar Retention',
      'Monthly Recurring Revenue (MRR)'
    ],
    benchmarks: {
      'ARR Growth Rate': { good: '100%+', average: '50-100%', poor: '<50%' },
      'Net Revenue Retention': { good: '120%+', average: '100-120%', poor: '<100%' },
      'Gross Margin': { good: '80%+', average: '70-80%', poor: '<70%' },
      'CAC Payback Period': { good: '<12 months', average: '12-18 months', poor: '>18 months' },
      'LTV:CAC Ratio': { good: '>3x', average: '2-3x', poor: '<2x' },
      'Rule of 40': { good: '>40%', average: '20-40%', poor: '<20%' }
    },
    description: 'Subscription-based software delivered over the internet'
  },
  'ecommerce': {
    label: 'E-Commerce',
    icon: '🛒',
    subIndustries: [
      'D2C Brands',
      'Marketplace',
      'Dropshipping',
      'B2B E-Commerce',
      'Subscription Commerce',
      'Fashion & Apparel'
    ],
    keyMetrics: [
      'Revenue Growth Rate',
      'Gross Margin',
      'Customer Acquisition Cost (CAC)',
      'Average Order Value (AOV)',
      'Conversion Rate',
      'Customer Lifetime Value (CLV)',
      'Repeat Purchase Rate',
      'Cart Abandonment Rate',
      'Inventory Turnover',
      'Return Rate'
    ],
    benchmarks: {
      'Gross Margin': { good: '50%+', average: '35-50%', poor: '<35%' },
      'Conversion Rate': { good: '3%+', average: '1-3%', poor: '<1%' },
      'Repeat Purchase Rate': { good: '30%+', average: '15-30%', poor: '<15%' },
      'Cart Abandonment Rate': { good: '<60%', average: '60-70%', poor: '>70%' },
      'Inventory Turnover': { good: '8+', average: '4-8', poor: '<4' },
      'Return Rate': { good: '<5%', average: '5-10%', poor: '>10%' }
    },
    description: 'Online retail and direct-to-consumer brands'
  },
  'fintech': {
    label: 'FinTech',
    icon: '💳',
    subIndustries: [
      'Payments',
      'Lending',
      'Wealth Management',
      'Banking as a Service',
      'InsurTech',
      'Crypto/Blockchain'
    ],
    keyMetrics: [
      'Transaction Volume',
      'Revenue Growth Rate',
      'Take Rate',
      'Customer Acquisition Cost',
      'Active Users',
      'Transaction Success Rate',
      'Compliance Score',
      'Net Interest Margin (NIM)',
      'Default Rate',
      'Payback Period'
    ],
    benchmarks: {
      'Take Rate': { good: '2.5%+', average: '1.5-2.5%', poor: '<1.5%' },
      'Transaction Success Rate': { good: '98%+', average: '95-98%', poor: '<95%' },
      'Default Rate': { good: '<2%', average: '2-5%', poor: '>5%' },
      'Net Interest Margin': { good: '4%+', average: '2-4%', poor: '<2%' }
    },
    description: 'Financial technology and digital financial services'
  },
  'healthcare': {
    label: 'Healthcare',
    icon: '🏥',
    subIndustries: [
      'Digital Health',
      'Telemedicine',
      'Medical Devices',
      'Health IT',
      'Clinical Services',
      'Biotech'
    ],
    keyMetrics: [
      'Revenue Growth Rate',
      'Patient Acquisition Cost',
      'Patient Lifetime Value',
      'Utilization Rate',
      'Clinical Outcomes',
      'Compliance Score',
      'Reimbursement Rate',
      'Operating Margin',
      'Revenue per Patient',
      'Net Promoter Score (NPS)'
    ],
    benchmarks: {
      'Operating Margin': { good: '15%+', average: '8-15%', poor: '<8%' },
      'Utilization Rate': { good: '80%+', average: '60-80%', poor: '<60%' },
      'Patient Satisfaction': { good: '90%+', average: '80-90%', poor: '<80%' },
      'Reimbursement Rate': { good: '95%+', average: '85-95%', poor: '<85%' },
      'Compliance Score': { good: '100%', average: '95-100%', poor: '<95%' }
    },
    description: 'Healthcare services, medical technology, and digital health'
  },
  'manufacturing': {
    label: 'Manufacturing',
    icon: '🏭',
    subIndustries: [
      'Industrial Manufacturing',
      'Consumer Goods',
      'Automotive',
      'Electronics',
      'Food & Beverage',
      'Chemicals'
    ],
    keyMetrics: [
      'Revenue Growth Rate',
      'Gross Margin',
      'Operating Margin',
      'EBITDA Margin',
      'Inventory Turnover',
      'Capacity Utilization',
      'Days Sales Outstanding (DSO)',
      'Days Inventory Outstanding (DIO)',
      'Working Capital Ratio',
      'Return on Assets (ROA)'
    ],
    benchmarks: {
      'Gross Margin': { good: '35%+', average: '25-35%', poor: '<25%' },
      'Operating Margin': { good: '15%+', average: '8-15%', poor: '<8%' },
      'Inventory Turnover': { good: '8+', average: '4-8', poor: '<4' },
      'Capacity Utilization': { good: '85%+', average: '75-85%', poor: '<75%' },
      'DSO': { good: '<45 days', average: '45-60 days', poor: '>60 days' }
    },
    description: 'Production and manufacturing operations'
  },
  'retail': {
    label: 'Retail',
    icon: '🏪',
    subIndustries: [
      'Fashion & Apparel',
      'Grocery & Food',
      'Electronics',
      'Home & Garden',
      'Specialty Retail',
      'Department Stores'
    ],
    keyMetrics: [
      'Same-Store Sales Growth',
      'Gross Margin',
      'Inventory Turnover',
      'Sales per Square Foot',
      'Customer Traffic',
      'Average Transaction Value',
      'Shrinkage Rate',
      'Operating Margin',
      'Employee Productivity',
      'Comparable Store Sales'
    ],
    benchmarks: {
      'Gross Margin': { good: '40%+', average: '30-40%', poor: '<30%' },
      'Inventory Turnover': { good: '6+', average: '3-6', poor: '<3' },
      'Sales per Sq Ft': { good: '$400+', average: '$250-400', poor: '<$250' },
      'Same-Store Growth': { good: '5%+', average: '2-5%', poor: '<2%' },
      'Shrinkage Rate': { good: '<1%', average: '1-2%', poor: '>2%' }
    },
    description: 'Brick-and-mortar and omnichannel retail operations'
  },
  'professional': {
    label: 'Professional Services',
    icon: '💼',
    subIndustries: [
      'Consulting',
      'Accounting',
      'Legal Services',
      'Marketing Agencies',
      'IT Services',
      'Design & Creative'
    ],
    keyMetrics: [
      'Revenue per Employee',
      'Utilization Rate',
      'Gross Margin',
      'Operating Margin',
      'Client Retention Rate',
      'Revenue Growth Rate',
      'Average Project Size',
      'Billable Hours Percentage',
      'Realization Rate',
      'Collection Rate'
    ],
    benchmarks: {
      'Utilization Rate': { good: '80%+', average: '70-80%', poor: '<70%' },
      'Gross Margin': { good: '50%+', average: '40-50%', poor: '<40%' },
      'Client Retention': { good: '90%+', average: '80-90%', poor: '<80%' },
      'Realization Rate': { good: '95%+', average: '85-95%', poor: '<85%' },
      'Revenue per Employee': { good: '$200K+', average: '$150-200K', poor: '<$150K' }
    },
    description: 'Knowledge-based and professional service firms'
  }
};

export default function SettingsClientPage() { 
    const { settings, setSettings, isLoading } = useSettings();
    const router = useRouter(); 
    const { getToken } = useAuth();
    const [saving, setSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);

    const [companyContext, setCompanyContext] = useState({
        companyName: '',
        industry: 'saas',
        subIndustry: '',
        companySize: '50-200',
        revenue: '$5M-$25M',
        stage: 'growth',
        geography: 'North America',
        fiscalYearEnd: 'December',
        compareToIndustry: true,
        compareToSize: true,
        compareToStage: true,
        compareToRegion: false,
        preferredMetrics: [],
        autoEnrich: true,
        smartSuggestions: true
    });

    const currentIndustry = INDUSTRY_CONFIGS[companyContext.industry] || INDUSTRY_CONFIGS.saas;

    // Auto-select default metrics when industry changes
    React.useEffect(() => {
        setCompanyContext(prev => ({
            ...prev,
            preferredMetrics: currentIndustry.keyMetrics.slice(0, 5),
            subIndustry: '' // Reset sub-industry when main industry changes
        }));
    }, [companyContext.industry]);

    const updateCompanyContext = (key, value) => {
        setCompanyContext(prev => ({ ...prev, [key]: value }));
    };

    const saveCompanyContext = async () => {
        setSaving(true);
        setSaveSuccess(false);
        
        try {
            const token = await getToken();

            const response = await fetch('/api/company-context', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(companyContext)
            });
            
            if (response.ok) {
                setSaveSuccess(true);
                setTimeout(() => {
                    router.push('/dashboard');
                }, 1500);
            } else {
                const errorText = await response.text();
                alert(`Error saving profile: ${errorText}`);
            }
        } catch (error: any) { 
            console.error('Failed to save company context:', error);
            alert(`A connection error occurred: ${error.message}`);
        } finally {
            setSaving(false);
        }
    };

    const companySizes = [
        { value: '1-10', label: '1-10 employees (Startup)' },
        { value: '11-50', label: '11-50 employees (Small)' },
        { value: '50-200', label: '50-200 employees (Growth)' },
        { value: '200-1000', label: '200-1,000 employees (Mid-Market)' },
        { value: '1000+', label: '1,000+ employees (Enterprise)' }
    ];

    const revenueRanges = [
        { value: '<$1M', label: 'Under $1M' },
        { value: '$1M-$5M', label: '$1M - $5M' },
        { value: '$5M-$25M', label: '$5M - $25M' },
        { value: '$25M-$100M', label: '$25M - $100M' },
        { value: '$100M+', label: '$100M+' }
    ];

    const stages = [
        { value: 'pre-revenue', label: 'Pre-Revenue', icon: '🌱' },
        { value: 'early', label: 'Early Stage', icon: '🚀' },
        { value: 'growth', label: 'Growth Stage', icon: '📈' },
        { value: 'scale', label: 'Scale Stage', icon: '⚡' },
        { value: 'mature', label: 'Mature', icon: '🏆' }
    ];

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center text-slate-400">Loading settings...</div>
            </div>
        );
    }

    return (
        <div className="lg:ml-64 min-h-screen bg-slate-50">
            {/* Fixed Header with Back Button */}
            <div className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
                <div className="max-w-7xl mx-auto px-6 py-4">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => router.push('/dashboard')}
                            className="p-2 hover:bg-slate-100 rounded-lg transition-colors group"
                            suppressHydrationWarning
                        >
                            <ArrowLeft className="w-5 h-5 text-slate-600 group-hover:text-slate-900" />
                        </button>
                        <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center">
                            <SettingsIcon className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1">
                            <h1 className="text-2xl font-bold text-slate-900">Company Settings</h1>
                            <p className="text-sm text-slate-600">Configure your profile for intelligent, industry-specific analysis</p>
                        </div>
                        {saveSuccess && (
                            <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-lg">
                                <Check className="w-4 h-4 text-emerald-600" />
                                <span className="text-sm font-medium text-emerald-900">Saved!</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
                
                {/* Hero Section */}
                <div className="bg-gradient-to-br from-indigo-600 via-blue-600 to-purple-600 rounded-2xl p-8 text-white shadow-xl">
                    <div className="flex items-start justify-between">
                        <div>
                            <h2 className="text-2xl font-bold mb-2">Set Up Your Company Profile</h2>
                            <p className="text-indigo-100 text-lg mb-4">
                                Your profile enables industry-specific benchmarks, peer comparisons, and tailored insights
                            </p>
                            <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2 w-fit">
                                <Sparkles className="w-4 h-4" />
                                <span className="text-sm font-medium">AI-powered analysis based on your industry</span>
                            </div>
                        </div>
                        <div className="text-6xl opacity-20">
                            {currentIndustry.icon}
                        </div>
                    </div>
                </div>

                {/* Industry & Profile */}
                <section className="bg-white rounded-2xl border-2 border-indigo-200 shadow-lg overflow-hidden">
                    <div className="p-6 bg-gradient-to-r from-indigo-50 to-blue-50 border-b-2 border-indigo-200">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center">
                                <Building2 className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-slate-900">Industry & Profile</h2>
                                <p className="text-sm text-slate-600">Choose your industry to unlock relevant metrics and benchmarks</p>
                            </div>
                        </div>
                    </div>

                    <div className="p-6 space-y-6">
                        {/* Industry Dropdown */}
                        <div>
                            <label className="block text-sm font-bold text-slate-900 mb-2">Industry *</label>
                            <select
                                value={companyContext.industry}
                                onChange={(e) => updateCompanyContext('industry', e.target.value)}
                                className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 font-semibold text-base bg-white"
                                suppressHydrationWarning
                            >
                                {Object.entries(INDUSTRY_CONFIGS).map(([key, config]) => (
                                    <option key={key} value={key} className="text-slate-900 font-medium">
                                        {config.icon} {config.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Current Industry Info */}
                        <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-xl p-6 border-2 border-indigo-200">
                            <div className="flex items-start gap-4">
                                <div className="text-5xl">{currentIndustry.icon}</div>
                                <div className="flex-1">
                                    <h3 className="text-lg font-bold text-slate-900 mb-1">
                                        {currentIndustry.label} Industry
                                    </h3>
                                    <p className="text-sm text-slate-700 mb-4">{currentIndustry.description}</p>
                                    
                                    <div className="bg-white rounded-lg p-4 border border-indigo-200">
                                        <div className="text-xs font-bold text-slate-700 mb-2">KEY METRICS FOR THIS INDUSTRY:</div>
                                        <div className="flex flex-wrap gap-2">
                                            {currentIndustry.keyMetrics.slice(0, 6).map(metric => (
                                                <span key={metric} className="px-3 py-1 bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-full">
                                                    {metric}
                                                </span>
                                            ))}
                                            {currentIndustry.keyMetrics.length > 6 && (
                                                <span className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-semibold rounded-full">
                                                    +{currentIndustry.keyMetrics.length - 6} more
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Company Details */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-900 mb-2">Company Name *</label>
                                <input
                                    type="text"
                                    value={companyContext.companyName}
                                    onChange={(e) => updateCompanyContext('companyName', e.target.value)}
                                    placeholder="Acme Corporation"
                                    className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 font-medium"
                                    suppressHydrationWarning
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-semibold text-slate-900 mb-2">Sub-Industry</label>
                                <select
                                    value={companyContext.subIndustry}
                                    onChange={(e) => updateCompanyContext('subIndustry', e.target.value)}
                                    className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 font-medium bg-white"
                                    suppressHydrationWarning
                                >
                                    <option value="" className="text-slate-900">Select sub-industry...</option>
                                    {currentIndustry.subIndustries.map(sub => (
                                        <option key={sub} value={sub} className="text-slate-900">{sub}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-900 mb-2">Company Size *</label>
                                <select
                                    value={companyContext.companySize}
                                    onChange={(e) => updateCompanyContext('companySize', e.target.value)}
                                    className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-slate-900 font-medium bg-white"
                                    suppressHydrationWarning
                                >
                                    {companySizes.map(size => (
                                        <option key={size.value} value={size.value} className="text-slate-900">{size.label}</option>
                                    ))}
                                </select>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-semibold text-slate-900 mb-2">Annual Revenue *</label>
                                <select
                                    value={companyContext.revenue}
                                    onChange={(e) => updateCompanyContext('revenue', e.target.value)}
                                    className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-slate-900 font-medium bg-white"
                                    suppressHydrationWarning
                                >
                                    {revenueRanges.map(range => (
                                        <option key={range.value} value={range.value} className="text-slate-900">{range.label}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-900 mb-2">Fiscal Year End</label>
                                <select
                                    value={companyContext.fiscalYearEnd}
                                    onChange={(e) => updateCompanyContext('fiscalYearEnd', e.target.value)}
                                    className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-slate-900 font-medium bg-white"
                                    suppressHydrationWarning
                                >
                                    <option className="text-slate-900">January</option>
                                    <option className="text-slate-900">February</option>
                                    <option className="text-slate-900">March</option>
                                    <option className="text-slate-900">June</option>
                                    <option className="text-slate-900">December</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-900 mb-3">Growth Stage *</label>
                            <div className="grid grid-cols-5 gap-3">
                                {stages.map(stage => (
                                    <button
                                        key={stage.value}
                                        onClick={() => updateCompanyContext('stage', stage.value)}
                                        className={`p-4 rounded-xl border-2 transition-all text-center hover:scale-105 ${
                                            companyContext.stage === stage.value
                                                ? 'border-indigo-500 bg-indigo-50 shadow-md'
                                                : 'border-slate-200 hover:border-slate-300'
                                        }`}
                                        suppressHydrationWarning
                                    >
                                        <div className="text-2xl mb-2">{stage.icon}</div>
                                        <div className="text-xs font-bold text-slate-900">{stage.label}</div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                {/* Metrics Selection */}
                <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-slate-200 bg-slate-50">
                        <div className="flex items-center gap-3">
                            <Target className="w-6 h-6 text-indigo-600" />
                            <div>
                                <h2 className="text-lg font-bold text-slate-900">Key Metrics to Track</h2>
                                <p className="text-sm text-slate-600">Select the metrics most important for your {currentIndustry.label} business</p>
                            </div>
                        </div>
                    </div>

                    <div className="p-6">
                        <div className="grid grid-cols-2 gap-3">
                            {currentIndustry.keyMetrics.map(metric => {
                                const benchmark = currentIndustry.benchmarks[metric];
                                return (
                                    <label 
                                        key={metric} 
                                        className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all hover:scale-[1.02] ${
                                            companyContext.preferredMetrics.includes(metric)
                                                ? 'border-indigo-500 bg-indigo-50 shadow-sm'
                                                : 'border-slate-200 hover:border-slate-300 bg-white'
                                        }`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={companyContext.preferredMetrics.includes(metric)}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    updateCompanyContext('preferredMetrics', [...companyContext.preferredMetrics, metric]);
                                                } else {
                                                    updateCompanyContext('preferredMetrics', companyContext.preferredMetrics.filter(m => m !== metric));
                                                }
                                            }}
                                            className="w-5 h-5 text-indigo-600 rounded mt-0.5"
                                            suppressHydrationWarning
                                        />
                                        <div className="flex-1">
                                            <div className="font-semibold text-slate-900 text-sm mb-1">{metric}</div>
                                            {benchmark && (
                                                <div className="text-xs text-slate-600">
                                                    <span className="font-medium">Good:</span> {benchmark.good}
                                                    <span className="mx-2">•</span>
                                                    <span className="font-medium">Avg:</span> {benchmark.average}
                                                </div>
                                            )}
                                        </div>
                                    </label>
                                );
                            })}
                        </div>
                    </div>
                </section>

                {/* Benchmarking Options */}
                <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-slate-200 bg-slate-50">
                        <div className="flex items-center gap-3">
                            <TrendingUp className="w-6 h-6 text-indigo-600" />
                            <div>
                                <h2 className="text-lg font-bold text-slate-900">Comparison & Benchmarks</h2>
                                <p className="text-sm text-slate-600">Choose how to compare your performance</p>
                            </div>
                        </div>
                    </div>

                    <div className="p-6 space-y-3">
                        {[
                            { 
                                key: 'compareToIndustry', 
                                label: 'Industry Benchmarks', 
                                desc: `Compare to ${currentIndustry.label} industry averages`,
                                icon: '📊'
                            },
                            { 
                                key: 'compareToSize', 
                                label: 'Company Size Cohort', 
                                desc: `Compare to companies with ${companyContext.companySize} employees`,
                                icon: '👥'
                            },
                            { 
                                key: 'compareToStage', 
                                label: 'Growth Stage Peers', 
                                desc: `Compare to other ${companyContext.stage} stage companies`,
                                icon: '🚀'
                            },
                            { 
                                key: 'compareToRegion', 
                                label: 'Regional Context', 
                                desc: `Include ${companyContext.geography} specific benchmarks`,
                                icon: '🌍'
                            }
                        ].map(item => (
                            <div key={item.key} className="flex items-center justify-between p-4 border-2 border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
                                <div className="flex items-center gap-3 flex-1">
                                    <span className="text-2xl">{item.icon}</span>
                                    <div>
                                        <div className="text-sm font-bold text-slate-900">{item.label}</div>
                                        <div className="text-xs text-slate-600 mt-0.5">{item.desc}</div>
                                    </div>
                                </div>
                                <ToggleSwitch 
                                    enabled={companyContext[item.key]} 
                                    onChange={() => updateCompanyContext(item.key, !companyContext[item.key])} 
                                />
                            </div>
                        ))}
                    </div>
                </section>

                {/* AI Features */}
                <section className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl border-2 border-purple-200 shadow-sm overflow-hidden">
                    <div className="p-6 border-b-2 border-purple-200 bg-white/80">
                        <div className="flex items-center gap-3">
                            <Sparkles className="w-6 h-6 text-purple-600" />
                            <div>
                                <h2 className="text-lg font-bold text-slate-900">AI-Powered Features</h2>
                                <p className="text-sm text-slate-600">Enhance your analysis with intelligent automation</p>
                            </div>
                        </div>
                    </div>

                    <div className="p-6 space-y-3">
                        {[
                            { 
                                key: 'autoEnrich', 
                                label: 'Auto-Enrich Data', 
                                desc: 'Automatically fetch industry benchmarks and market context',
                                badge: 'RECOMMENDED'
                            },
                            { 
                                key: 'smartSuggestions', 
                                label: 'Smart Suggestions', 
                                desc: `Get AI-powered insights tailored to ${currentIndustry.label}`,
                                badge: 'POPULAR'
                            }
                        ].map(item => (
                            <div key={item.key} className="flex items-center justify-between p-4 bg-white border-2 border-purple-200 rounded-xl">
                                <div className="flex items-start gap-3 flex-1">
                                    <Sparkles className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <div className="text-sm font-bold text-slate-900">{item.label}</div>
                                            <span className="px-2 py-0.5 bg-purple-600 text-white text-xs font-bold rounded">
                                                {item.badge}
                                            </span>
                                        </div>
                                        <div className="text-xs text-slate-600">{item.desc}</div>
                                    </div>
                                </div>
                                <ToggleSwitch 
                                    enabled={companyContext[item.key]} 
                                    onChange={() => updateCompanyContext(item.key, !companyContext[item.key])} 
                                />
                            </div>
                        ))}
                    </div>
                </section>

                {/* Save Button - Sticky Bottom */}
                <div className="sticky bottom-0 bg-white border-t-2 border-slate-200 p-6 rounded-xl shadow-xl">
                    <div className="max-w-2xl mx-auto flex items-center gap-4">
                        <button 
                            onClick={() => router.push('/dashboard')}
                            className="px-6 py-3 border-2 border-slate-300 text-slate-700 rounded-xl font-bold hover:bg-slate-50 transition-all"
                            suppressHydrationWarning
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={saveCompanyContext}
                            disabled={saving || !companyContext.companyName}
                            className="flex-1 bg-gradient-to-r from-indigo-600 to-blue-600 text-white py-4 rounded-xl font-bold hover:from-indigo-700 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            suppressHydrationWarning
                        >
                            {saving ? (
                                <>
                                    <RefreshCw className="w-5 h-5 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="w-5 h-5" />
                                    Save Company Profile & Continue to Dashboard
                                </>
                            )}
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
}