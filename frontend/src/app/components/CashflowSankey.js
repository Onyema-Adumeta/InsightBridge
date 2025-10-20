import React, { useState, useEffect } from 'react';
// We can use a standard import here now
import Plot from 'react-plotly.js'; 

const CashflowSankey = () => {
    const [sankeyData, setSankeyData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await fetch('http://localhost:8000/financial-flow');
                
                if (!response.ok) {
                    throw new Error(`Network response was not ok (Status: ${response.status})`);
                }
                const data = await response.json();

                if (!data || !data.nodes || !data.links) {
                    throw new Error('Data from API is not in the expected format.');
                }

                const formattedData = {
                    type: 'sankey',
                    orientation: 'h',
                    node: {
                        pad: 15,
                        thickness: 20,
                        line: {
                            color: 'black',
                            width: 0.5
                        },
                        label: data.nodes.map(node => node.name),
                        color: "#60a5fa" // Using a blue color for nodes
                    },
                    link: {
                        source: data.links.map(link => link.source),
                        target: data.links.map(link => link.target),
                        value: data.links.map(link => link.value),
                    }
                };
                setSankeyData([formattedData]);
            } catch (error) {
                console.error("Failed to fetch Sankey data:", error);
                setError(error.message);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    if (loading) {
        return <div className="flex justify-center items-center h-full min-h-[300px]">Loading Cash Flow River...</div>;
    }

    if (error) {
        return <div className="text-red-400">Error loading chart: {error}</div>;
    }

    if (!sankeyData || sankeyData[0].node.label.length === 0) {
        return <div>No transaction data available to display the chart.</div>;
    }

    return (
        <div style={{ width: '100%', height: '100%' }}>
            <Plot
                data={sankeyData}
                layout={{
                    // title: 'Interactive Cash Flow', // Title is already in the parent div
                    font: {
                        size: 12,
                        color: 'white'
                    },
                    paper_bgcolor: 'rgba(0,0,0,0)',
                    plot_bgcolor: 'rgba(0,0,0,0)',
                    margin: { l: 10, r: 10, b: 10, t: 10, pad: 4 } // Adjust margins
                }}
                style={{ width: '100%', height: '500px' }}
                useResizeHandler={true}
            />
        </div>
    );
};

export default CashflowSankey;