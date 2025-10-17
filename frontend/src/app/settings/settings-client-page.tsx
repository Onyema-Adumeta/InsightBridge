"use client";

import React, { useState } from 'react';
import { useSettings } from '@/context/SettingsContext';
import { Settings as SettingsIcon, Building2, Target, TrendingUp, Sparkles, Info, ChevronDown, ChevronRight } from 'lucide-react';

export const dynamic = 'force-dynamic';

const ToggleSwitch = ({ enabled, onChange }) => (
    <button
        onClick={onChange}
        className={`${enabled ? 'bg-indigo-600' : 'bg-slate-400'} relative inline-flex h-6 w-11 items-center rounded-full transition-colors`}
    >
        <span
            className={`${enabled ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
        />
    </button>
);

export default function SettingsPage() {
    const { settings, setSettings, isLoading } = useSettings();
    const [expandedSections, setExpandedSections] = useState({
        company: true,
        benchmarks: false,
        analysisPrefs: false
    });

    // Company context state
    const [companyContext, setCompanyContext] = useState({
        companyName: '',
        industry: 'SaaS',
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
        preferredMetrics: ['Revenue Growth', 'Gross Margin', 'CAC Payback'],
        autoEnrich: true,
        smartSuggestions: true
    });

    const updateSetting = (key, value) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    };

    const updateCompanyContext = (key, value) => {
        setCompanyContext(prev => ({ ...prev, [key]: value }));
    };

    const toggleSection = (section) => {
        setExpandedSections(prev => ({...prev, [section]: !prev[section]}));
    };

    const saveCompanyContext = async () => {
        try {
            const response = await fetch('/api/company-context', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(companyContext)
            });
            if (response.ok) {
                // Show success toast/notification
                alert('Company context saved successfully!');
            }
        } catch (error) {
            console.error('Failed to save company context:', error);
        }
    };

    const industries = [
        { value: 'SaaS', label: 'SaaS' },
        { value: 'ecommerce', label: 'E-Commerce' },
        { value: 'fintech', label: 'FinTech' },
        { value: 'healthcare', label: 'Healthcare' },
        { value: 'manufacturing', label: 'Manufacturing' },
        { value: 'retail', label: 'Retail' },
        { value: 'professional', label: 'Professional Services' }
    ];

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

    const keyMetrics = [
        'Revenue Growth', 'Gross Margin', 'Operating Margin', 'EBITDA Margin',
        'CAC', 'LTV', 'CAC Payback', 'Net Revenue Retention',
        'Gross Dollar Retention', 'Magic Number', 'Rule of 40'
    ];

    if (isLoading) {
        return (
            <div className="ml-64 min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="text-center text-slate-400">Loading settings...</div>
            </div>
        );
    }

    return (
        <div className="ml-64 min-h-screen bg-slate-50">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-6 py-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center">
                            <SettingsIcon className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
                            <p className="text-sm text-slate-600">Manage your account and application preferences</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
                
                {/* NEW: Company Context Section */}
                <section className="bg-gradient-to-br from-indigo-50 via-blue-50 to-slate-50 rounded-xl border-2 border-indigo-200 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-indigo-200 bg-white/50 backdrop-blur">
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-lg flex items-center justify-center">
                                    <Sparkles className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold text-slate-900">Company Context & Benchmarking</h2>
                                    <p className="text-sm text-slate-600 mt-1">Configure your profile for intelligent, contextualized analysis</p>
                                </div>
                            </div>
                        </div>
                        <div className="mt-4 bg-indigo-50 border border-indigo-200 rounded-lg p-3 flex items-start gap-2">
                            <Info className="w-4 h-4 text-indigo-600 mt-0.5 flex-shrink-0" />
                            <p className="text-xs text-indigo-900">
                                Your profile enables industry-specific benchmarks and tailored insights
                            </p>
                        </div>
                    </div>

                    {/* Company Profile Collapsible */}
                    <div className="border-b border-slate-200 bg-white">
                        <button
                            onClick={() => toggleSection('company')}
                            className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <Building2 className="w-5 h-5 text-indigo-600" />
                                <span className="font-medium text-slate-900">Company Profile</span>
                            </div>
                            {expandedSections.company ? 
                                <ChevronDown className="w-5 h-5 text-slate-400" /> : 
                                <ChevronRight className="w-5 h-5 text-slate-400" />
                            }
                        </button>
                        
                        {expandedSections.company && (
                            <div className="px-6 pb-6 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">Company Name</label>
                                        <input
                                            type="text"
                                            value={companyContext.companyName}
                                            onChange={(e) => updateCompanyContext('companyName', e.target.value)}
                                            placeholder="Your Company"
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                                        />
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">Fiscal Year End</label>
                                        <select
                                            value={companyContext.fiscalYearEnd}
                                            onChange={(e) => updateCompanyContext('fiscalYearEnd', e.target.value)}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                                        >
                                            <option>January</option>
                                            <option>February</option>
                                            <option>March</option>
                                            <option>June</option>
                                            <option>December</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">Industry</label>
                                        <select
                                            value={companyContext.industry}
                                            onChange={(e) => updateCompanyContext('industry', e.target.value)}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                                        >
                                            {industries.map(ind => (
                                                <option key={ind.value} value={ind.value}>{ind.label}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">Sub-Industry</label>
                                        <input
                                            type="text"
                                            value={companyContext.subIndustry}
                                            onChange={(e) => updateCompanyContext('subIndustry', e.target.value)}
                                            placeholder="e.g., B2B Enterprise Software"
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">Company Size</label>
                                        <select
                                            value={companyContext.companySize}
                                            onChange={(e) => updateCompanyContext('companySize', e.target.value)}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                                        >
                                            {companySizes.map(size => (
                                                <option key={size.value} value={size.value}>{size.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">Annual Revenue</label>
                                        <select
                                            value={companyContext.revenue}
                                            onChange={(e) => updateCompanyContext('revenue', e.target.value)}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                                        >
                                            {revenueRanges.map(range => (
                                                <option key={range.value} value={range.value}>{range.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-3">Growth Stage</label>
                                    <div className="grid grid-cols-5 gap-2">
                                        {stages.map(stage => (
                                            <button
                                                key={stage.value}
                                                onClick={() => updateCompanyContext('stage', stage.value)}
                                                className={`p-3 rounded-lg border-2 transition-all text-center ${
                                                    companyContext.stage === stage.value
                                                        ? 'border-indigo-500 bg-indigo-50'
                                                        : 'border-slate-200 hover:border-slate-300'
                                                }`}
                                            >
                                                <div className="text-xl mb-1">{stage.icon}</div>
                                                <div className="text-xs font-medium text-slate-700">{stage.label}</div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Benchmarks Collapsible */}
                    <div className="border-b border-slate-200 bg-white">
                        <button
                            onClick={() => toggleSection('benchmarks')}
                            className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <Target className="w-5 h-5 text-indigo-600" />
                                <span className="font-medium text-slate-900">Comparison & Benchmarks</span>
                            </div>
                            {expandedSections.benchmarks ? 
                                <ChevronDown className="w-5 h-5 text-slate-400" /> : 
                                <ChevronRight className="w-5 h-5 text-slate-400" />
                            }
                        </button>
                        
                        {expandedSections.benchmarks && (
                            <div className="px-6 pb-6 space-y-3">
                                {[
                                    { key: 'compareToIndustry', label: 'Industry Benchmarks', desc: `Compare to ${companyContext.industry} industry averages` },
                                    { key: 'compareToSize', label: 'Company Size Cohort', desc: `Compare to companies with ${companyContext.companySize} employees` },
                                    { key: 'compareToStage', label: 'Growth Stage Peers', desc: `Compare to other ${companyContext.stage} stage companies` },
                                    { key: 'compareToRegion', label: 'Regional Context', desc: `Include ${companyContext.geography} specific benchmarks` }
                                ].map(item => (
                                    <div key={item.key} className="flex items-center justify-between p-3 border border-slate-200 rounded-lg hover:bg-slate-50">
                                        <div className="flex-1">
                                            <div className="text-sm font-medium text-slate-900">{item.label}</div>
                                            <div className="text-xs text-slate-600 mt-0.5">{item.desc}</div>
                                        </div>
                                        <ToggleSwitch 
                                            enabled={companyContext[item.key]} 
                                            onChange={() => updateCompanyContext(item.key, !companyContext[item.key])} 
                                        />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Analysis Preferences Collapsible */}
                    <div className="bg-white">
                        <button
                            onClick={() => toggleSection('analysisPrefs')}
                            className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <TrendingUp className="w-5 h-5 text-indigo-600" />
                                <span className="font-medium text-slate-900">Analysis Preferences</span>
                            </div>
                            {expandedSections.analysisPrefs ? 
                                <ChevronDown className="w-5 h-5 text-slate-400" /> : 
                                <ChevronRight className="w-5 h-5 text-slate-400" />
                            }
                        </button>
                        
                        {expandedSections.analysisPrefs && (
                            <div className="px-6 pb-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-3">Key Metrics to Track</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {keyMetrics.map(metric => (
                                            <label key={metric} className="flex items-center gap-2 p-2 hover:bg-slate-50 rounded cursor-pointer">
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
                                                    className="w-4 h-4 text-indigo-600 rounded"
                                                />
                                                <span className="text-sm text-slate-700">{metric}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-2 pt-4 border-t border-slate-200">
                                    {[
                                        { key: 'autoEnrich', label: 'Auto-Enrich Data', desc: 'Automatically fetch industry benchmarks and market context' },
                                        { key: 'smartSuggestions', label: 'Smart Suggestions', desc: 'Get AI-powered insights based on your profile' }
                                    ].map(item => (
                                        <div key={item.key} className="flex items-center justify-between p-3 bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 rounded-lg">
                                            <div className="flex items-start gap-2 flex-1">
                                                <Sparkles className="w-4 h-4 text-indigo-600 mt-0.5 flex-shrink-0" />
                                                <div>
                                                    <div className="text-sm font-medium text-slate-900">{item.label}</div>
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
                            </div>
                        )}
                    </div>

                    {/* Save Button */}
                    <div className="px-6 py-4 bg-slate-50 border-t border-slate-200">
                        <button 
                            onClick={saveCompanyContext}
                            className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 text-white py-3 rounded-lg font-semibold hover:from-indigo-700 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl"
                        >
                            Save Company Context
                        </button>
                    </div>
                </section>

                {/* Existing Appearance Section */}
                <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-slate-200">
                        <h2 className="text-lg font-semibold text-slate-900">Appearance</h2>
                        <p className="text-sm text-slate-600 mt-1">Customize how InsightBridge looks on your device</p>
                    </div>
                    <div className="p-6 space-y-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <label className="text-sm font-medium text-slate-900">Theme</label>
                                <p className="text-xs text-slate-500 mt-0.5">Choose between light and dark mode</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className={`text-sm ${settings.theme === 'light' ? 'text-slate-900 font-medium' : 'text-slate-500'}`}>Light</span>
                                <ToggleSwitch 
                                    enabled={settings.theme === 'dark'} 
                                    onChange={() => updateSetting('theme', settings.theme === 'dark' ? 'light' : 'dark')} 
                                />
                                <span className={`text-sm ${settings.theme === 'dark' ? 'text-slate-900 font-medium' : 'text-slate-500'}`}>Dark</span>
                            </div>
                        </div>

                        <div className="flex items-center justify-between">
                            <div>
                                <label htmlFor="font-family" className="text-sm font-medium text-slate-900">Font Family</label>
                                <p className="text-xs text-slate-500 mt-0.5">Select your preferred font</p>
                            </div>
                            <select
                                id="font-family"
                                value={settings.fontFamily}
                                onChange={(e) => updateSetting('fontFamily', e.target.value)}
                                className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            >
                                <option value="Inter">Inter</option>
                                <option value="Roboto">Roboto</option>
                                <option value="system-ui">System Default</option>
                            </select>
                        </div>
                    </div>
                </section>

                {/* Existing Notifications Section */}
                <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-slate-200">
                        <h2 className="text-lg font-semibold text-slate-900">Notifications</h2>
                        <p className="text-sm text-slate-600 mt-1">Manage how you receive updates and alerts</p>
                    </div>
                    <div className="p-6 space-y-6">
                        <div className="flex items-center justify-between">
                            <div className="flex-1">
                                <label className="text-sm font-medium text-slate-900">Email Summaries</label>
                                <p className="text-xs text-slate-500 mt-0.5">Receive weekly summaries of your financial data</p>
                            </div>
                            <ToggleSwitch 
                                enabled={settings.emailNotifications} 
                                onChange={() => updateSetting('emailNotifications', !settings.emailNotifications)} 
                            />
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="flex-1">
                                <label className="text-sm font-medium text-slate-900">New Report Alerts</label>
                                <p className="text-xs text-slate-500 mt-0.5">Get notified when a new report is generated</p>
                            </div>
                            <ToggleSwitch 
                                enabled={settings.reportAlerts} 
                                onChange={() => updateSetting('reportAlerts', !settings.reportAlerts)} 
                            />
                        </div>
                    </div>
                </section>

                {/* Existing Account Section */}
                <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-slate-200">
                        <h2 className="text-lg font-semibold text-slate-900">Account</h2>
                        <p className="text-sm text-slate-600 mt-1">Manage your account settings and security</p>
                    </div>
                    <div className="p-6 space-y-3">
                        <button className="w-full text-left px-4 py-3 bg-slate-50 hover:bg-slate-100 text-slate-900 rounded-lg transition-colors flex items-center justify-between group">
                            <span className="text-sm font-medium">Change Password</span>
                            <svg className="w-4 h-4 text-slate-400 group-hover:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </button>
                        <button className="w-full text-left px-4 py-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors flex items-center justify-between group">
                            <span className="text-sm font-medium">Delete Account</span>
                            <svg className="w-4 h-4 text-red-400 group-hover:text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </button>
                    </div>
                </section>

                {/* Save Notice */}
                <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                    <p className="text-sm text-indigo-900">
                        <span className="font-medium">💡 Auto-save enabled:</span> Your settings are automatically saved as you make changes.
                    </p>
                </div>
            </div>
        </div>
    );
}