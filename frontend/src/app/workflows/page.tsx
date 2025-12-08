"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { 
    Zap, 
    Plus, 
    ArrowRight, 
    Power,
    PowerOff,
    Trash2,
    AlertCircle,
    CheckCircle,
    X,
    DollarSign,
    Mail,
    MessageSquare,
    TrendingUp as TrendingUpIcon,
    TrendingDown
} from 'lucide-react';

// --- TypeScript Interfaces ---
interface Trigger {
    metric: string;
    condition: string;
    value: number | string;
}

interface Action {
    type: string;
    target: string;
}

interface Workflow {
    id: string;
    name: string;
    trigger: Trigger;
    action: Action;
    is_active: boolean;
}

interface NewWorkflowState {
    name: string;
    trigger_metric: string;
    trigger_condition: string;
    trigger_value: string;
    action_type: string;
    action_target: string;
}

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
}

// --- Modal Component (Mobile Responsive) ---
const Modal = ({ isOpen, onClose, title, children }: ModalProps) => {
    if (!isOpen) return null;
    
    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-[9999] p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl border border-slate-200 max-h-[90vh] overflow-y-auto relative z-[10000]">
                <div className="flex justify-between items-center p-4 sm:p-6 border-b border-slate-200 sticky top-0 bg-white z-[10001]">
                    <h2 className="text-lg sm:text-xl font-bold text-slate-900">{title}</h2>
                    <button 
                        onClick={onClose} 
                        className="text-slate-400 hover:text-slate-600 transition-colors p-1 hover:bg-slate-100 rounded touch-target"
                        suppressHydrationWarning
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="p-4 sm:p-6">
                    {children}
                </div>
            </div>
        </div>
    );
};

// --- Main Component ---
export default function WorkflowsPage() {
    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    const [workflows, setWorkflows] = useState<Workflow[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    // Modal and Form State
    const [isWorkflowModalOpen, setWorkflowModalOpen] = useState(false);
    const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
    const [workflowToDelete, setWorkflowToDelete] = useState<string | null>(null);
    
    const initialFormState: NewWorkflowState = {
        name: '',
        trigger_metric: 'monthly_revenue',
        trigger_condition: 'drops_by_percent',
        trigger_value: '10',
        action_type: 'email_notification',
        action_target: ''
    };
    
    const [newWorkflow, setNewWorkflow] = useState<NewWorkflowState>(initialFormState);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formError, setFormError] = useState('');

    // Fetch workflows
    const fetchWorkflows = useCallback(async () => {
        setIsLoading(true);
        setError('');
        try {
            const response = await fetch(`${apiBase}/api/workflows`);
            if (!response.ok) throw new Error('Failed to fetch workflows');
            const data: Workflow[] = await response.json();
            setWorkflows(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred');
        } finally {
            setIsLoading(false);
        }
    }, [apiBase]);

    useEffect(() => {
        fetchWorkflows();
    }, [fetchWorkflows]);

    // Auto-dismiss messages
    useEffect(() => {
        if (successMessage) {
            const timer = setTimeout(() => setSuccessMessage(''), 5000);
            return () => clearTimeout(timer);
        }
    }, [successMessage]);

    // Modal handlers
    const handleOpenWorkflowModal = () => {
        setFormError('');
        setNewWorkflow(initialFormState);
        setWorkflowModalOpen(true);
    };

    const handleWorkflowFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setNewWorkflow(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleCreateWorkflow = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSubmitting(true);
        setFormError('');

        const payload = {
            name: newWorkflow.name,
            trigger: {
                metric: newWorkflow.trigger_metric,
                condition: newWorkflow.trigger_condition,
                value: parseFloat(newWorkflow.trigger_value) || 0,
            },
            action: {
                type: newWorkflow.action_type,
                target: newWorkflow.action_target,
            },
            is_active: true,
        };

        try {
            const response = await fetch(`${apiBase}/api/workflows`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Failed to create workflow');
            }

            const createdWorkflow: Workflow = await response.json();
            setWorkflows(prev => [...prev, createdWorkflow]);
            setWorkflowModalOpen(false);
            setSuccessMessage('Workflow created successfully!');

        } catch (err) {
            setFormError(err instanceof Error ? err.message : 'An unknown error occurred');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleToggleWorkflow = async (workflowId: string, currentStatus: boolean) => {
        setWorkflows(prev => prev.map(wf => 
            wf.id === workflowId ? { ...wf, is_active: !currentStatus } : wf
        ));

        try {
            const response = await fetch(`${apiBase}/api/workflows/${workflowId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ is_active: !currentStatus }),
            });

            if (!response.ok) throw new Error('Failed to update workflow status');
            
            setSuccessMessage(`Workflow ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
        } catch (err) {
            setWorkflows(prev => prev.map(wf => 
                wf.id === workflowId ? { ...wf, is_active: currentStatus } : wf
            ));
            setError(err instanceof Error ? err.message : 'Failed to update');
        }
    };

    const handleDeleteWorkflow = async () => {
        if (!workflowToDelete) return;

        try {
            const response = await fetch(`${apiBase}/api/workflows/${workflowToDelete}`, {
                method: 'DELETE',
            });

            if (!response.ok) throw new Error('Failed to delete workflow');

            setWorkflows(prev => prev.filter(wf => wf.id !== workflowToDelete));
            setDeleteModalOpen(false);
            setWorkflowToDelete(null);
            setSuccessMessage('Workflow deleted successfully');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete workflow');
        }
    };

    // Helper functions
    const getMetricIcon = (metric: string) => {
        if (metric.includes('revenue')) return <DollarSign className="w-4 h-4 sm:w-5 sm:h-5" />;
        if (metric.includes('cash')) return <DollarSign className="w-4 h-4 sm:w-5 sm:h-5" />;
        if (metric.includes('burn')) return <TrendingDown className="w-4 h-4 sm:w-5 sm:h-5" />;
        return <TrendingUpIcon className="w-4 h-4 sm:w-5 sm:h-5" />;
    };

    const getActionIcon = (actionType: string) => {
        if (actionType.includes('email')) return <Mail className="w-4 h-4" />;
        if (actionType.includes('slack')) return <MessageSquare className="w-4 h-4" />;
        return <AlertCircle className="w-4 h-4" />;
    };

    const renderTriggerText = (trigger: Trigger): string => {
        return `When ${trigger.metric.replace(/_/g, ' ')} ${trigger.condition.replace(/_/g, ' ')} ${
            trigger.metric.includes('percent') ? `${trigger.value}%` : `$${Number(trigger.value).toLocaleString()}`
        }`;
    };

    const renderActionText = (action: Action): string => {
        return `${action.type.replace(/_/g, ' ')} to ${action.target}`;
    };

    // Loading state
    if (isLoading && workflows.length === 0) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                    <p className="text-slate-600">Loading workflows...</p>
                </div>
            </div>
        );
    }

    return (
        <main className="lg:ml-64 min-h-screen min-w-0 overflow-x-hidden bg-slate-50">
            {/* Header - Mobile Responsive */}
            <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
                    <div className="flex items-center gap-2 sm:gap-3">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <h1 className="text-lg sm:text-2xl font-bold text-slate-900">Automated Workflows</h1>
                            <p className="text-xs sm:text-sm text-slate-600 hidden sm:block">Set up triggers and actions to automate your financial monitoring</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content - Mobile Responsive Padding */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-8 space-y-4 sm:space-y-6">
                {/* Messages */}
                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 sm:p-4 flex items-start gap-2 sm:gap-3">
                        <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                            <p className="font-semibold text-red-900 text-sm sm:text-base">Error</p>
                            <p className="text-red-700 text-xs sm:text-sm">{error}</p>
                        </div>
                        <button onClick={() => setError('')} className="text-red-400 hover:text-red-600 flex-shrink-0 touch-target" suppressHydrationWarning>
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                )}

                {successMessage && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 sm:p-4 flex items-start gap-2 sm:gap-3">
                        <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <p className="text-green-900 text-xs sm:text-sm">{successMessage}</p>
                    </div>
                )}

                {/* Header with Create Button - Mobile Responsive */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                    <div>
                        <h2 className="text-lg sm:text-xl font-bold text-slate-900">Your Workflows</h2>
                        <p className="text-xs sm:text-sm text-slate-600 mt-1">
                            Automate actions when specific conditions are met
                        </p>
                    </div>
                    <button 
                        onClick={handleOpenWorkflowModal}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors shadow-sm touch-target w-full sm:w-auto"
                        disabled={isSubmitting}
                        suppressHydrationWarning
                    >
                        <Plus className="w-4 h-4" />
                        Create Workflow
                    </button>
                </div>

                {/* Workflows List - Mobile Responsive */}
                {workflows.length === 0 ? (
                    <div className="bg-white rounded-xl border border-slate-200 p-8 sm:p-12 text-center">
                        <div className="w-12 h-12 sm:w-16 sm:h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Zap className="w-6 h-6 sm:w-8 sm:h-8 text-indigo-600" />
                        </div>
                        <h3 className="text-base sm:text-lg font-semibold text-slate-900 mb-2">No workflows yet</h3>
                        <p className="text-sm sm:text-base text-slate-600 mb-6">
                            Create your first workflow to start automating your financial monitoring
                        </p>
                        <button 
                            onClick={handleOpenWorkflowModal}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg inline-flex items-center gap-2 transition-colors touch-target"
                            suppressHydrationWarning
                        >
                            <Plus className="w-4 h-4" />
                            Create Workflow
                        </button>
                    </div>
                ) : (
                    <div className="space-y-3 sm:space-y-4">
                        {workflows.map((workflow) => (
                            <div 
                                key={workflow.id}
                                className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6 shadow-sm hover:shadow-md transition-shadow"
                            >
                                <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 sm:gap-3 mb-3">
                                            <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                                workflow.is_active ? 'bg-green-100' : 'bg-slate-100'
                                            }`}>
                                                {getMetricIcon(workflow.trigger.metric)}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <h3 className="text-base sm:text-lg font-semibold text-slate-900 truncate">{workflow.name}</h3>
                                                <span className={`text-xs font-medium ${
                                                    workflow.is_active ? 'text-green-600' : 'text-slate-500'
                                                }`}>
                                                    {workflow.is_active ? 'Active' : 'Inactive'}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Mobile: Stack, Desktop: Row */}
                                        <div className="flex flex-col sm:flex-row sm:items-center gap-3 text-sm">
                                            <div className="flex-1 bg-slate-50 rounded-lg p-3">
                                                <p className="text-slate-600 font-medium mb-1 text-xs sm:text-sm">Trigger</p>
                                                <p className="text-slate-900 text-xs sm:text-sm">{renderTriggerText(workflow.trigger)}</p>
                                            </div>
                                            <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400 flex-shrink-0 hidden sm:block" />
                                            <div className="flex-1 bg-slate-50 rounded-lg p-3">
                                                <p className="text-slate-600 font-medium mb-1 flex items-center gap-1 text-xs sm:text-sm">
                                                    {getActionIcon(workflow.action.type)}
                                                    Action
                                                </p>
                                                <p className="text-slate-900 text-xs sm:text-sm">{renderActionText(workflow.action)}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex sm:flex-col items-center justify-end sm:justify-start gap-2 sm:ml-4">
                                        <button
                                            onClick={() => handleToggleWorkflow(workflow.id, workflow.is_active)}
                                            className={`p-2 rounded-lg transition-colors touch-target ${
                                                workflow.is_active
                                                    ? 'text-green-600 hover:bg-green-50'
                                                    : 'text-slate-400 hover:bg-slate-100'
                                            }`}
                                            title={workflow.is_active ? 'Deactivate' : 'Activate'}
                                            suppressHydrationWarning
                                        >
                                            {workflow.is_active ? (
                                                <Power className="w-5 h-5" />
                                            ) : (
                                                <PowerOff className="w-5 h-5" />
                                            )}
                                        </button>
                                        <button
                                            onClick={() => {
                                                setWorkflowToDelete(workflow.id);
                                                setDeleteModalOpen(true);
                                            }}
                                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors touch-target"
                                            title="Delete"
                                            suppressHydrationWarning
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Create Workflow Modal - Mobile Responsive */}
            <Modal isOpen={isWorkflowModalOpen} onClose={() => setWorkflowModalOpen(false)} title="Create New Workflow">
                <form onSubmit={handleCreateWorkflow} className="space-y-4 sm:space-y-6">
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-2">
                            Workflow Name *
                        </label>
                        <input
                            type="text"
                            name="name"
                            id="name"
                            required
                            value={newWorkflow.name}
                            onChange={handleWorkflowFormChange}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-base text-slate-900"
                            placeholder="e.g., Low Cash Flow Alert"
                            suppressHydrationWarning
                        />
                    </div>

                    <div className="border border-slate-200 rounded-lg p-3 sm:p-4">
                        <h3 className="font-semibold text-indigo-600 mb-3 sm:mb-4 text-sm sm:text-base">When...</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
                            <div>
                                <label htmlFor="trigger_metric" className="block text-sm font-medium text-slate-700 mb-2">
                                    Metric
                                </label>
                                <select
                                    name="trigger_metric"
                                    id="trigger_metric"
                                    value={newWorkflow.trigger_metric}
                                    onChange={handleWorkflowFormChange}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-base text-slate-900"
                                    suppressHydrationWarning
                                >
                                    <option value="monthly_revenue" className="text-slate-900">Monthly Revenue</option>
                                    <option value="cash_on_hand" className="text-slate-900">Cash on Hand</option>
                                    <option value="burn_rate" className="text-slate-900">Burn Rate</option>
                                </select>
                            </div>
                            <div>
                                <label htmlFor="trigger_condition" className="block text-sm font-medium text-slate-700 mb-2">
                                    Condition
                                </label>
                                <select
                                    name="trigger_condition"
                                    id="trigger_condition"
                                    value={newWorkflow.trigger_condition}
                                    onChange={handleWorkflowFormChange}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-base text-slate-900"
                                    suppressHydrationWarning
                                >
                                    <option value="drops_by_percent" className="text-slate-900">Drops by %</option>
                                    <option value="falls_below" className="text-slate-900">Falls Below</option>
                                    <option value="exceeds" className="text-slate-900">Exceeds</option>
                                </select>
                            </div>
                            <div>
                                <label htmlFor="trigger_value" className="block text-sm font-medium text-slate-700 mb-2">
                                    Value
                                </label>
                                <input
                                    type="number"
                                    name="trigger_value"
                                    id="trigger_value"
                                    required
                                    value={newWorkflow.trigger_value}
                                    onChange={handleWorkflowFormChange}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-base text-slate-900"
                                    suppressHydrationWarning
                                />
                            </div>
                        </div>
                    </div>

                    <div className="border border-slate-200 rounded-lg p-3 sm:p-4">
                        <h3 className="font-semibold text-indigo-600 mb-3 sm:mb-4 text-sm sm:text-base">Then...</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                            <div>
                                <label htmlFor="action_type" className="block text-sm font-medium text-slate-700 mb-2">
                                    Action
                                </label>
                                <select
                                    name="action_type"
                                    id="action_type"
                                    value={newWorkflow.action_type}
                                    onChange={handleWorkflowFormChange}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-base text-slate-900"
                                    suppressHydrationWarning
                                >
                                    <option value="email_notification" className="text-slate-900">Send Email</option>
                                    <option value="slack_alert" className="text-slate-900">Send Slack Alert</option>
                                </select>
                            </div>
                            <div>
                                <label htmlFor="action_target" className="block text-sm font-medium text-slate-700 mb-2">
                                    To (Email or Slack #channel)
                                </label>
                                <input
                                    type="text"
                                    name="action_target"
                                    id="action_target"
                                    required
                                    value={newWorkflow.action_target}
                                    onChange={handleWorkflowFormChange}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-base text-slate-900"
                                    placeholder="#general or team@example.com"
                                    suppressHydrationWarning
                                />
                            </div>
                        </div>
                    </div>

                    {formError && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
                            {formError}
                        </div>
                    )}

                    <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4 border-t border-slate-200">
                        <button
                            type="button"
                            onClick={() => setWorkflowModalOpen(false)}
                            className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors touch-target"
                            suppressHydrationWarning
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors touch-target"
                            suppressHydrationWarning
                        >
                            {isSubmitting ? 'Creating...' : 'Create Workflow'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Delete Confirmation Modal - Mobile Responsive */}
            <Modal isOpen={isDeleteModalOpen} onClose={() => setDeleteModalOpen(false)} title="Delete Workflow">
                <div className="space-y-4">
                    <p className="text-slate-700 text-sm sm:text-base">
                        Are you sure you want to delete this workflow? This action cannot be undone.
                    </p>
                    
                    <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4 border-t border-slate-200">
                        <button
                            onClick={() => setDeleteModalOpen(false)}
                            className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors touch-target"
                            suppressHydrationWarning
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleDeleteWorkflow}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors touch-target"
                            suppressHydrationWarning
                        >
                            Delete Workflow
                        </button>
                    </div>
                </div>
            </Modal>
        </main>
    );
}