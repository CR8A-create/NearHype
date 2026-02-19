"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useUser } from "@clerk/nextjs";

// Presets de colores de acento
export const ACCENT_PRESETS = [
    { name: "Índigo", color: "#6366f1", hover: "#4f46e5" },
    { name: "Rojo", color: "#ef4444", hover: "#dc2626" },
    { name: "Verde", color: "#22c55e", hover: "#16a34a" },
    { name: "Naranja", color: "#f97316", hover: "#ea580c" },
    { name: "Rosa", color: "#ec4899", hover: "#db2777" },
    { name: "Cian", color: "#06b6d4", hover: "#0891b2" },
    { name: "Dorado", color: "#eab308", hover: "#ca8a04" },
    { name: "Violeta", color: "#8b5cf6", hover: "#7c3aed" },
];

export type ThemePreferences = {
    accentColor: string;
    accentHover: string;
    chatBackground: string;
    fontSize: "small" | "normal" | "large";
};

const DEFAULT_THEME: ThemePreferences = {
    accentColor: "#6366f1",
    accentHover: "#4f46e5",
    chatBackground: "",
    fontSize: "normal",
};

type ThemeContextType = {
    theme: ThemePreferences;
    updateTheme: (updates: Partial<ThemePreferences>) => void;
    saveTheme: () => Promise<void>;
    isSaving: boolean;
};

const ThemeContext = createContext<ThemeContextType>({
    theme: DEFAULT_THEME,
    updateTheme: () => { },
    saveTheme: async () => { },
    isSaving: false,
});

export function useTheme() {
    return useContext(ThemeContext);
}

// Generate a darker shade for hover from a hex color
function darkenHex(hex: string, amount: number = 20): string {
    const num = parseInt(hex.replace("#", ""), 16);
    const r = Math.max(0, (num >> 16) - amount);
    const g = Math.max(0, ((num >> 8) & 0x00ff) - amount);
    const b = Math.max(0, (num & 0x0000ff) - amount);
    return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, "0")}`;
}

function applyThemeToDOM(theme: ThemePreferences) {
    const root = document.documentElement;
    root.style.setProperty("--accent", theme.accentColor);
    root.style.setProperty("--accent-hover", theme.accentHover);

    if (theme.chatBackground) {
        root.style.setProperty("--chat-bg", theme.chatBackground);
    } else {
        root.style.removeProperty("--chat-bg");
    }

    // Font size
    const sizeMap = { small: "14px", normal: "16px", large: "18px" };
    root.style.setProperty("--font-size-base", sizeMap[theme.fontSize]);
}

export default function ThemeProvider({ children }: { children: ReactNode }) {
    const { user } = useUser();
    const [theme, setTheme] = useState<ThemePreferences>(DEFAULT_THEME);
    const [isSaving, setIsSaving] = useState(false);
    const [loaded, setLoaded] = useState(false);

    // 1. Load from localStorage immediately (instant)
    useEffect(() => {
        const saved = localStorage.getItem("nearhype-theme");
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                const merged = { ...DEFAULT_THEME, ...parsed };
                setTheme(merged);
                applyThemeToDOM(merged);
            } catch (e) {
                console.error("Error parsing saved theme:", e);
            }
        } else {
            applyThemeToDOM(DEFAULT_THEME);
        }
        setLoaded(true);
    }, []);

    // 2. Sync from DB when user loads (override localStorage if DB has data)
    useEffect(() => {
        if (!user || !loaded) return;

        fetch("/api/user/preferences")
            .then(res => res.json())
            .then(data => {
                if (data.theme) {
                    const dbTheme = { ...DEFAULT_THEME, ...data.theme };
                    setTheme(dbTheme);
                    applyThemeToDOM(dbTheme);
                    localStorage.setItem("nearhype-theme", JSON.stringify(dbTheme));
                }
            })
            .catch(e => console.error("Error loading theme from DB:", e));
    }, [user, loaded]);

    const updateTheme = (updates: Partial<ThemePreferences>) => {
        // If accentColor changes but no explicit hover, auto-generate it
        if (updates.accentColor && !updates.accentHover) {
            updates.accentHover = darkenHex(updates.accentColor);
        }

        setTheme(prev => {
            const newTheme = { ...prev, ...updates };
            applyThemeToDOM(newTheme);
            localStorage.setItem("nearhype-theme", JSON.stringify(newTheme));
            return newTheme;
        });
    };

    const saveTheme = async () => {
        setIsSaving(true);
        try {
            await fetch("/api/user/preferences", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ theme }),
            });
        } catch (e) {
            console.error("Error saving theme:", e);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <ThemeContext.Provider value={{ theme, updateTheme, saveTheme, isSaving }}>
            {children}
        </ThemeContext.Provider>
    );
}
