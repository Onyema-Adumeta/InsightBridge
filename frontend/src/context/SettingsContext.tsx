"use client";

import React, { 
    createContext, 
    useContext, 
    useState, 
    useEffect, 
    ReactNode 
} from 'react';

// UI Preferences (theme, appearance)
interface UserSettings {
    theme: 'light' | 'dark';
    fontFamily: string;
    fontSize: 'small' | 'medium' | 'large';
    emailNotifications: boolean;
    reportAlerts: boolean;
}

// Company Context (business profile for analysis)
interface CompanyContext {
    companyName: string;
    industry: string;
    subIndustry: string;
    companySize: string;
    revenue: string;
    stage: string;
    geography: string;
    fiscalYearEnd: string;
    compareToIndustry: boolean;
    compareToSize: boolean;
    compareToStage: boolean;
    compareToRegion: boolean;
    preferredMetrics: string[];
    autoEnrich: boolean;
    smartSuggestions: boolean;
}

interface SettingsContextType {
    // UI Settings
    settings: UserSettings;
    setSettings: React.Dispatch<React.SetStateAction<UserSettings>>;
    
    // Company Context
    companyContext: CompanyContext | null;
    setCompanyContext: React.Dispatch<React.SetStateAction<CompanyContext | null>>;
    
    // Loading states
    isLoading: boolean;
    isCompanyContextLoaded: boolean;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
    // UI Settings
    const initialSettings: UserSettings = {
        theme: 'dark',
        fontFamily: 'Inter',
        fontSize: 'medium',
        emailNotifications: true,
        reportAlerts: true,
    };
    
    const [settings, setSettings] = useState<UserSettings>(initialSettings);
    const [isLoading, setIsLoading] = useState(true);

    // Company Context
    const [companyContext, setCompanyContext] = useState<CompanyContext | null>(null);
    const [isCompanyContextLoaded, setIsCompanyContextLoaded] = useState(false);

    // Load UI settings from localStorage
    useEffect(() => {
        try {
            const storedSettings = localStorage.getItem('userSettings');
            if (storedSettings) {
                setSettings(JSON.parse(storedSettings));
            }
        } catch (error) {
            console.error("Failed to parse settings from localStorage", error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Save UI settings to localStorage
    useEffect(() => {
        if (!isLoading) {
            try {
                localStorage.setItem('userSettings', JSON.stringify(settings));
            } catch (error) {
                console.error("Failed to save settings to localStorage", error);
            }
        }
    }, [settings, isLoading]);

    // Load company context from localStorage
    useEffect(() => {
        try {
            const storedContext = localStorage.getItem('companyContext');
            if (storedContext) {
                setCompanyContext(JSON.parse(storedContext));
            }
        } catch (error) {
            console.error("Failed to parse company context from localStorage", error);
        } finally {
            setIsCompanyContextLoaded(true);
        }
    }, []);

    // Save company context to localStorage
    useEffect(() => {
        if (isCompanyContextLoaded && companyContext) {
            try {
                localStorage.setItem('companyContext', JSON.stringify(companyContext));
            } catch (error) {
                console.error("Failed to save company context to localStorage", error);
            }
        }
    }, [companyContext, isCompanyContextLoaded]);

    return (
        <SettingsContext.Provider value={{ 
            settings, 
            setSettings, 
            companyContext,
            setCompanyContext,
            isLoading,
            isCompanyContextLoaded
        }}>
            {children}
        </SettingsContext.Provider>
    );
};

export const useSettings = () => {
    const context = useContext(SettingsContext);
    
    if (context === undefined) {
        throw new Error('useSettings must be used within a SettingsProvider');
    }
    
    return context;
};

// Helper hook to get just the company context
export const useCompanyContext = () => {
    const { companyContext, setCompanyContext, isCompanyContextLoaded } = useSettings();
    return { companyContext, setCompanyContext, isCompanyContextLoaded };
};