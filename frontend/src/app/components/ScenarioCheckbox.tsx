"use client";

import React from 'react';

const ScenarioCheckbox = ({ label, isChecked, onChange }) => (
    <div 
        onClick={onChange}
        className={`p-3 border rounded-lg cursor-pointer transition-all ${isChecked ? 'bg-indigo-600 border-indigo-500 shadow-lg' : 'bg-gray-700 border-gray-600 hover:border-gray-500'}`}
    >
        <div className="flex items-center">
            <div className={`w-5 h-5 rounded flex-shrink-0 mr-3 flex items-center justify-center ${isChecked ? 'bg-white' : 'bg-gray-800 border-2 border-gray-500'}`}>
                {isChecked && <svg className="w-4 h-4 text-indigo-600" fill="currentColor" viewBox="0 0 20 20"><path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"></path></svg>}
            </div>
            <span className="text-sm">{label}</span>
        </div>
    </div>
);

export default ScenarioCheckbox;