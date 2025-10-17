// src/app/context/SettingsContext.tsx
"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface UserSettings { /* ...your settings interface... */ }
interface SettingsContextType { /* ...your context type... */ }
const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
    const [settings, setSettings] = useState<UserSettings>({
        theme: 'dark',
        fontFamily: 'Inter',
        fontSize: 'medium',
        emailNotifications: true,
        reportAlerts: true,
    });

    // The automatic save effect is disabled to prevent loops.
    // You can add a "Save" button in your UI to trigger this logic instead.

    return (
        <SettingsContext.Provider value={{ settings, setSettings }}>
            {children}
        </SettingsContext.Provider>
    );
};

export const useSettings = () => { /* ...your useSettings hook... */ };