"use client";

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

// Lazy load Plotly to avoid SSR issues
const Plot = dynamic(() => import('react-plotly.js'), { 
    ssr: false,
    loading: () => (
        <div className="flex flex-col justify-center items-center h-full min-h-[300px] bg-slate-50 rounded-lg border border-slate-200">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
            <p className="text-slate-600 font-medium">Loading Cash Flow River...</p>
            <p className="text-sm text-slate-500 mt-2">Analyzing transaction flows</p>
        </div>
    )
});

const CashflowSankey = ({ userId }) => {
    const [sankeyData, setSankeyData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Build URL with user_id if provided
                const baseUrl = 'http://localhost:8000/api/v1/main/financial-flow';
                const url = userId ? `${baseUrl}?user_id=${userId}` : baseUrl;
                
                console.log('[CashflowSankey] Fetching data from:', url);
                
                const response = await fetch(url);
                
                if (!response.ok) {
                    throw new Error(`Network response was not ok (Status: ${response.status})`);
                }
                
                const data = await response.json();
                console.log('[CashflowSankey] Data received:', data);

                if (!data || !data.nodes || !data.links) {
                    throw new Error('Data from API is not in the expected format.');
                }

                // Check if we have actual data
                if (data.nodes.length === 0 || data.links.length === 0) {
                    console.warn('[CashflowSankey] No transaction data available');
                    setSankeyData(null);
                    setLoading(false);
                    return;
                }

                // Format data for Plotly Sankey diagram
                const formattedData = {
                    type: 'sankey',
                    orientation: 'h',
                    node: {
                        pad: 15,
                        thickness: 20,
                        line: {
                            color: '#334155',
                            width: 0.5
                        },
                        label: data.nodes.map(node => node.name),
                        color: data.nodes.map((node, idx) => {
                            // Color nodes based on their type or position
                            if (node.name.toLowerCase().includes('revenue') || 
                                node.name.toLowerCase().includes('income')) {
                                return '#10b981'; // Green for income sources
                            } else if (node.name.toLowerCase().includes('expense') || 
                                       node.name.toLowerCase().includes('cost')) {
                                return '#ef4444'; // Red for expenses
                            } else if (node.name.toLowerCase().includes('cash') || 
                                       node.name.toLowerCase().includes('bank')) {
                                return '#3b82f6'; // Blue for cash/bank
                            }
                            return '#60a5fa'; // Default blue
                        })
                    },
                    link: {
                        source: data.links.map(link => link.source),
                        target: data.links.map(link => link.target),
                        value: data.links.map(link => link.value),
                        color: data.links.map((link, idx) => {
                            // Make links semi-transparent
                            return 'rgba(148, 163, 184, 0.4)'; // slate-400 with opacity
                        })
                    }
                };
                
                setSankeyData([formattedData]);
                console.log('[CashflowSankey] Sankey data formatted successfully');
            } catch (error) {
                console.error("[CashflowSankey] Failed to fetch Sankey data:", error);
                setError(error.message);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [userId]); // Re-fetch when userId changes

    if (loading) {
        return (
            <div className="flex flex-col justify-center items-center h-full min-h-[300px] bg-slate-50 rounded-lg border border-slate-200">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
                <p className="text-slate-600 font-medium">Loading Cash Flow River...</p>
                <p className="text-sm text-slate-500 mt-2">Analyzing transaction flows</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col justify-center items-center h-full min-h-[300px] bg-red-50 rounded-lg border border-red-200 p-6">
                <div className="flex items-center gap-3 mb-3">
                    <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-red-900 font-semibold">Error Loading Chart</p>
                </div>
                <p className="text-red-700 text-sm text-center">{error}</p>
                <p className="text-red-600 text-xs mt-2">Please check your network connection and API endpoint</p>
            </div>
        );
    }

    if (!sankeyData || sankeyData[0].node.label.length === 0) {
        return (
            <div className="flex flex-col justify-center items-center h-full min-h-[300px] bg-slate-50 rounded-lg border border-slate-200 p-8">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                </div>
                <p className="text-slate-700 font-semibold mb-2">No Transaction Data Available</p>
                <p className="text-sm text-slate-600 text-center max-w-md">
                    Upload financial statements with transaction details to visualize cash flow movements
                </p>
            </div>
        );
    }

    return (
        <div className="w-full h-full">
            <Plot
                data={sankeyData}
                layout={{
                    font: {
                        size: 12,
                        color: '#475569', // slate-600
                        family: 'system-ui, -apple-system, sans-serif'
                    },
                    paper_bgcolor: 'rgba(0,0,0,0)',
                    plot_bgcolor: 'rgba(0,0,0,0)',
                    margin: { l: 20, r: 20, b: 20, t: 20, pad: 4 },
                    hoverlabel: {
                        bgcolor: '#1e293b', // slate-800
                        bordercolor: '#334155', // slate-700
                        font: {
                            color: '#ffffff',
                            family: 'system-ui, -apple-system, sans-serif',
                            size: 13
                        }
                    }
                }}
                config={{
                    displayModeBar: true,
                    displaylogo: false,
                    modeBarButtonsToRemove: ['lasso2d', 'select2d'],
                    toImageButtonOptions: {
                        format: 'png',
                        filename: 'cash_flow_sankey',
                        height: 800,
                        width: 1200,
                        scale: 2
                    }
                }}
                style={{ width: '100%', height: '500px' }}
                useResizeHandler={true}
                className="rounded-lg"
            />
            
            {/* Legend */}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-xs">
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-green-500"></div>
                    <span className="text-slate-600">Income Sources</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-red-500"></div>
                    <span className="text-slate-600">Expenses</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-blue-500"></div>
                    <span className="text-slate-600">Cash/Bank Accounts</span>
                </div>
            </div>
        </div>
    );
};

export default CashflowSankey;