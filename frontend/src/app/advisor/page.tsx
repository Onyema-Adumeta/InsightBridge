"use client";

export const dynamic = 'force-dynamic';

import React, { useState, useEffect, useMemo } from 'react';
import { useAnalysis } from '../../context/AnalysisContext';
import SimulationChart from '../../components/SimulationChart';

// Type for the Q&A strategy plan
interface StrategyPoint {
    title: string;
    action: string;
    justification: string;
}

// src/app/advisor/page.tsx

export default function AdvisorPage() {
    // === STATE FOR BOTH FEATURES ===
    const { analysisData, isLoading: isAnalysisLoading } = useAnalysis();
    
    // State for Simulation Display
    const [simulationResult, setSimulationResult] = useState(null);
    
    // State for Q&A Advisor
    const [question, setQuestion] = useState("");
    const [plan, setPlan] = useState<StrategyPoint[]>([]);
    const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // ✅ 1. CHECK FOR SIMULATION RESULTS ON PAGE LOAD
    useEffect(() => {
        const storedSimResult = sessionStorage.getItem('simulationResult');
        if (storedSimResult) {
            try {
                setSimulationResult(JSON.parse(storedSimResult));
                // Do not remove from session storage, so it persists on refresh
            } catch (e) {
                console.error("Failed to parse simulation result:", e);
            }
        }
    }, []);
    
    // ✅ 2. PROCESS DATA FOR THE SIMULATION CHART
    const chartData = useMemo(() => {
        if (!analysisData?.kpiChartData) return [];
        
        let data = analysisData.kpiChartData.map(item => ({
             ...item,
             timestamp: new Date(item.period_end_date).getTime(),
             forecastRevenue: item.predicted ? item.revenue : null,
             forecastNetIncome: item.predicted ? item.net_income : null,
             revenue: item.predicted ? null : item.revenue,
             net_income: item.predicted ? null : item.net_income
        }));

        if (simulationResult?.simulated_forecast_data) {
            data = data.map(point => {
                const simPoint = simulationResult.simulated_forecast_data.find(s => s.period_end_date === point.period_end_date);
                return simPoint ? {
                    ...point,
                    simulatedRevenue: simPoint.revenue,
                    simulatedNetIncome: simPoint.net_income
                } : point;
            });
        }
        
        return data;
    }, [analysisData?.kpiChartData, simulationResult]);

    // ✅ UPDATE THE USEEFFECT HOOK
    useEffect(() => {
        // Check for a pre-filled prompt first
        const prefilledPrompt = sessionStorage.getItem('advisorPrompt');
        if (prefilledPrompt) {
            setQuestion(prefilledPrompt); // Pre-fill the input box
            sessionStorage.removeItem('advisorPrompt'); // Clear it so it's not used again
            return; // Stop here
        }

        // If no prompt, check for simulation results for the chart
        const storedSimResult = sessionStorage.getItem('simulationResult');
        if (storedSimResult) {
            try {
                setSimulationResult(JSON.parse(storedSimResult));
            } catch (e) {
                console.error("Failed to parse simulation result:", e);
            }
        }
    }, []);

    // Handler for the Q&A form
    const handleQuestionSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!question.trim()) return;
        setIsGeneratingPlan(true);
        setError(null);
        setPlan([]);
        try {
            const response = await fetch('/api/advisor', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ question }),
            });
            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.detail || "Failed to get a response.");
            }
            const data = await response.json();
            setPlan(data.strategy_plan || []);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsGeneratingPlan(false);
        }
    };
    
    // Function to clear simulation and show Q&A
    const clearSimulation = () => {
        sessionStorage.removeItem('simulationResult');
        setSimulationResult(null);
    }

    return (
        <div className="p-4 md:p-8">
            {/* ✅ 3. RENDER UI BASED ON WHETHER A SIMULATION RESULT EXISTS */}
            {simulationResult ? (
                // --- SIMULATION RESULT VIEW ---
                <div className="animate-fade-in">
                    <header className="flex justify-between items-center mb-8">
                        <div>
                            <h1 className="text-3xl font-bold">🧠 Strategic Advisor</h1>
                            <p className="text-gray-400 mt-1">Review the strategic impact of your simulated decision.</p>
                        </div>
                        <button onClick={clearSimulation} className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg">
                            Ask a New Question
                        </button>
                    </header>
                    <div className="space-y-8">
                        <div className="bg-gray-800 p-6 rounded-xl shadow-lg">
                            <h2 className="text-xl font-bold mb-4 text-indigo-400">{simulationResult.summary}</h2>
                            <h3 className="font-semibold text-gray-200">Key Impacts:</h3>
                            <ul className="list-disc list-inside space-y-1 text-gray-400 mb-4">
                                {simulationResult.impacts?.map((impact, index) => <li key={index}>{impact}</li>)}
                            </ul>
                            <h3 className="font-semibold text-gray-200">Recommendation:</h3>
                            <p className="text-gray-400">{simulationResult.recommendation}</p>
                        </div>
                        <div className="bg-gray-800 p-6 rounded-xl shadow-lg">
                            <h2 className="text-xl font-bold mb-4 text-indigo-400">Projected Visual Impact</h2>
                            {isAnalysisLoading ? <p>Loading chart data...</p> : <SimulationChart chartData={chartData} />}
                        </div>
                    </div>
                </div>
            ) : (
                // --- Q&A ADVISOR VIEW ---
                <div className="max-w-4xl mx-auto animate-fade-in">
                    <div className="text-center mb-12">
                        <h1 className="text-4xl font-bold mb-2">Strategic Advisor</h1>
                        <p className="text-lg text-gray-400">What strategic question can I help with today?</p>
                    </div>
                    <form onSubmit={handleQuestionSubmit} className="mb-8">
                        <textarea
                            value={question}
                            onChange={(e) => setQuestion(e.target.value)}
                            className="w-full p-4 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="e.g., Draft a plan to increase our operating margin by 5%..."
                            rows={3}
                            disabled={isGeneratingPlan}
                        />
                        <button
                            type="submit"
                            disabled={isGeneratingPlan}
                            className="w-full mt-4 bg-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-500"
                        >
                            {isGeneratingPlan ? 'Thinking...' : 'Generate Plan'}
                        </button>
                    </form>
                    {error && <div className="text-red-500 text-center p-4 bg-red-900/50 rounded-lg">{error}</div>}
                    {plan.length > 0 && (
                        <div className="space-y-6">
                            {plan.map((point, index) => (
                                <div key={index} className="bg-gray-700 border border-gray-600 p-6 rounded-lg">
                                    <h3 className="text-xl font-bold text-blue-400 mb-2">{point.title}</h3>
                                    <p className="text-lg mb-3"><strong>Action:</strong> {point.action}</p>
                                    <p className="text-sm text-gray-400"><strong>Justification:</strong> {point.justification}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}