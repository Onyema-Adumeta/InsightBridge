"use client";

import React, { 
    createContext, 
    useContext, 
    useState, 
    useEffect, 
    ReactNode 
} from 'react';

interface UserSettings {
    theme: 'light' | 'dark';
    fontFamily: string;
    fontSize: 'small' | 'medium' | 'large';
    emailNotifications: boolean;
    reportAlerts: boolean;
}

interface SettingsContextType {
    settings: UserSettings;
    setSettings: React.Dispatch<React.SetStateAction<UserSettings>>;
    isLoading: boolean;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
    const initialSettings: UserSettings = {
        theme: 'dark',
        fontFamily: 'Inter',
        fontSize: 'medium',
        emailNotifications: true,
        reportAlerts: true,
    };
    
    const [settings, setSettings] = useState<UserSettings>(initialSettings);
    const [isLoading, setIsLoading] = useState(true);

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

    useEffect(() => {
        if (!isLoading) {
            try {
                localStorage.setItem('userSettings', JSON.stringify(settings));
            } catch (error) {
                console.error("Failed to save settings to localStorage", error);
            }
        }
    }, [settings, isLoading]);

    return (
        <SettingsContext.Provider value={{ settings, setSettings, isLoading }}>
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