"use client";

import { useState, useEffect } from "react";
import { X, Plus, MapPin, Loader2, Sparkles, User, Settings as SettingsIcon, Save, Palette, Check, Type } from "lucide-react";
import ImageUpload from "./ImageUpload";
import { useUser } from "@clerk/nextjs";
import { useTheme, ACCENT_PRESETS } from "./ThemeProvider";

type UserProfile = {
    settings: {
        preferredLanguage: string;
        distanceUnit: "km" | "mi";
    };
    // Profile Fields
    username: string; // From table, not just clerk
    bio?: string;
    avatarUrl?: string;
    // Discovery Fields
    interests: Array<{ id: string; topic: string }>;
    location: {
        city: string;
        latitude: number;
        longitude: number;
        radiusKm: number;
    } | null;
};

export default function SettingsModal({ onClose }: { onClose: () => void }) {
    const { user } = useUser();
    const [activeTab, setActiveTab] = useState<'general' | 'public' | 'appearance'>('general');
    const { theme, updateTheme, saveTheme, isSaving: isSavingTheme } = useTheme();
    const [customColor, setCustomColor] = useState(theme.accentColor);
    const [chatBgInput, setChatBgInput] = useState(theme.chatBackground);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Form States
    const [newInterest, setNewInterest] = useState("");
    const [city, setCity] = useState("");
    const [radius, setRadius] = useState(20);
    const [bio, setBio] = useState("");
    const [avatarKey, setAvatarKey] = useState(""); // For uploadthing
    const [previewAvatar, setPreviewAvatar] = useState<string | null>(null);

    useEffect(() => {
        loadProfile();
    }, []);

    const loadProfile = async () => {
        try {
            const res = await fetch("/api/user/profile");
            const data = await res.json();
            setProfile(data);

            // Init form values
            if (data) {
                setCity(data.location?.city || "");
                setRadius(data.location?.radiusKm || 20);
                setBio(data.bio || "");
                setPreviewAvatar(data.avatarUrl || user?.imageUrl);
            }
        } catch (error) {
            console.error("Error loading profile:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddInterest = () => {
        if (!newInterest.trim() || !profile) return;
        const updated = {
            ...profile,
            interests: [...profile.interests, { id: `temp-${Date.now()}`, topic: newInterest.trim() }],
        };
        setProfile(updated);
        setNewInterest("");
    };

    const handleRemoveInterest = (id: string) => {
        if (!profile) return;
        setProfile({
            ...profile,
            interests: profile.interests.filter((i) => i.id !== id),
        });
    };

    const handleSave = async () => {
        if (!profile) return;
        setIsSaving(true);
        try {
            // Prepare payload
            const payload = {
                interests: profile.interests.map(i => i.topic), // Only needed if changed
                city: city !== profile.location?.city ? city : undefined,
                radiusKm: radius,
                bio: bio,
                avatarUrl: avatarKey ? `https://utfs.io/f/${avatarKey}` : undefined, // Simple url construction or handle in backend
            };

            const res = await fetch("/api/user/profile", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (res.ok) {
                onClose();
                window.location.reload();
            } else {
                alert("Error al guardar cambios.");
            }
        } catch (error) {
            console.error("Error saving:", error);
            alert("Error al guardar.");
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
            </div>
        );
    }

    if (!profile) return null;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-gray-900 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col md:flex-row border border-white/10">

                {/* Sidebar Navigation */}
                <div className="w-full md:w-64 bg-gray-800/50 p-6 border-b md:border-b-0 md:border-r border-white/10 flex flex-col gap-2">
                    <h2 className="text-xl font-bold text-white mb-6 hidden md:block">Configuración</h2>

                    <button
                        onClick={() => setActiveTab('general')}
                        className={`text-left px-4 py-3 rounded-lg flex items-center gap-3 transition ${activeTab === 'general' ? 'bg-accent text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'
                            }`}
                    >
                        <SettingsIcon className="w-5 h-5" />
                        <span>General & Cuenta</span>
                    </button>

                    <button
                        onClick={() => setActiveTab('public')}
                        className={`text-left px-4 py-3 rounded-lg flex items-center gap-3 transition ${activeTab === 'public' ? 'bg-accent text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'
                            }`}
                    >
                        <User className="w-5 h-5" />
                        <span>Perfil Público</span>
                    </button>

                    <button
                        onClick={() => setActiveTab('appearance')}
                        className={`text-left px-4 py-3 rounded-lg flex items-center gap-3 transition ${activeTab === 'appearance' ? 'bg-accent text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'
                            }`}
                    >
                        <Palette className="w-5 h-5" />
                        <span>Apariencia</span>
                    </button>
                </div>

                {/* Main Content */}
                <div className="flex-1 flex flex-col h-full overflow-hidden">
                    {/* Header Mobile Only (Close button is global usually) */}
                    <div className="p-4 flex justify-end md:absolute md:top-4 md:right-4 z-10">
                        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition text-gray-400 hover:text-white">
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8">

                        {/* GENERAL TAB */}
                        {activeTab === 'general' && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                                <div>
                                    <h3 className="text-2xl font-bold text-white mb-1">Preferencias de Discovery</h3>
                                    <p className="text-gray-400 text-sm">Ajusta cómo encuentras a otros y cómo te encuentran.</p>
                                </div>

                                {/* Location */}
                                <section className="bg-white/5 rounded-xl p-6 border border-white/10">
                                    <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                        <MapPin className="w-5 h-5 text-indigo-400" />
                                        Ubicación
                                    </h4>

                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-300 mb-2">Ciudad Actual</label>
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    value={city}
                                                    onChange={(e) => setCity(e.target.value)}
                                                    placeholder="Ej: Badajoz, España"
                                                    className="flex-1 px-4 py-3 bg-black/20 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                />
                                            </div>
                                            <p className="text-xs text-gray-500 mt-2">
                                                Si escribes manualmente, asegúrate de ser específico (Ej: &quot;Badajoz, ES&quot;). O usa el GPS de tu dispositivo en el Feed.
                                            </p>
                                        </div>

                                        <div>
                                            <div className="flex justify-between mb-2">
                                                <label className="text-sm font-medium text-gray-300">Radio de búsqueda</label>
                                                <span className="text-indigo-400 font-bold">{radius} km</span>
                                            </div>
                                            <input
                                                type="range"
                                                min="5"
                                                max="200"
                                                step="5"
                                                value={radius}
                                                onChange={(e) => setRadius(Number(e.target.value))}
                                                className="w-full accent-indigo-500 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                                            />
                                        </div>
                                    </div>
                                </section>

                                {/* Interests */}
                                <section className="bg-white/5 rounded-xl p-6 border border-white/10">
                                    <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                        <Sparkles className="w-5 h-5 text-indigo-400" />
                                        Intereses
                                    </h4>

                                    <div className="flex gap-2 mb-4">
                                        <input
                                            type="text"
                                            value={newInterest}
                                            onChange={(e) => setNewInterest(e.target.value)}
                                            onKeyPress={(e) => e.key === "Enter" && handleAddInterest()}
                                            placeholder="Agregar interés (Ej: Valorant)..."
                                            className="flex-1 px-4 py-3 bg-black/20 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        />
                                        <button onClick={handleAddInterest} className="px-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition">
                                            <Plus className="w-5 h-5" />
                                        </button>
                                    </div>

                                    <div className="flex flex-wrap gap-2">
                                        {profile.interests.map((interest) => (
                                            <span key={interest.id} className="px-3 py-1 bg-indigo-900/40 border border-indigo-500/30 rounded-full text-indigo-200 text-sm flex items-center gap-2">
                                                {interest.topic}
                                                <button onClick={() => handleRemoveInterest(interest.id)} className="hover:text-white transition">
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                </section>
                            </div>
                        )}

                        {/* PUBLIC PROFILE TAB */}
                        {activeTab === 'public' && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                                <div>
                                    <h3 className="text-2xl font-bold text-white mb-1">Perfil Público</h3>
                                    <p className="text-gray-400 text-sm">Así es como te ven otros usuarios en NearHype.</p>
                                </div>

                                <div className="bg-white/5 rounded-xl p-6 border border-white/10 space-y-6">
                                    {/* Avatar Upload */}
                                    <div className="flex items-center gap-6">
                                        <div className="relative group">
                                            <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-indigo-600/20">
                                                <img
                                                    src={previewAvatar || "/placeholder-avatar.png"}
                                                    alt="Avatar"
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                        </div>
                                        <div className="flex-1">
                                            <label className="block text-sm font-medium text-gray-300 mb-2">Foto de Perfil</label>
                                            <div className="w-full max-w-xs">
                                                <ImageUpload
                                                    endpoint="userAvatar"
                                                    onUploadComplete={(url) => {
                                                        if (url) {
                                                            setPreviewAvatar(url);
                                                            const key = url.split('/').pop();
                                                            if (key) setAvatarKey(key);
                                                        }
                                                    }}
                                                />
                                            </div>
                                            <p className="text-xs text-gray-500 mt-2">Recomendado: 400x400px, Max 4MB</p>
                                        </div>
                                    </div>

                                    {/* Username (Read Only for now) */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-2">Nombre de Usuario</label>
                                        <input
                                            type="text"
                                            value={profile.username}
                                            disabled
                                            className="w-full px-4 py-3 bg-black/40 border border-white/5 rounded-lg text-gray-400 cursor-not-allowed"
                                        />
                                        <p className="text-xs text-gray-600 mt-1">El nombre de usuario no se puede cambiar por ahora.</p>
                                    </div>

                                    {/* Bio */}
                                    <div>
                                        <div className="flex justify-between mb-2">
                                            <label className="text-sm font-medium text-gray-300">Biografía</label>
                                            <span className={`text-xs ${bio.length > 300 ? 'text-red-400' : 'text-gray-500'}`}>
                                                {bio.length}/300
                                            </span>
                                        </div>
                                        <textarea
                                            value={bio}
                                            onChange={(e) => setBio(e.target.value)}
                                            rows={4}
                                            placeholder="Cuéntanos un poco sobre ti..."
                                            className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                                        />
                                        {bio.length > 300 && (
                                            <p className="text-red-400 text-xs mt-1">La biografía no puede exceder los 300 caracteres.</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* APPEARANCE TAB */}
                        {activeTab === 'appearance' && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                                <div>
                                    <h3 className="text-2xl font-bold text-white mb-1">Apariencia</h3>
                                    <p className="text-gray-400 text-sm">Personaliza los colores y el estilo de tu app.</p>
                                </div>

                                {/* Accent Color */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-300 mb-3">Color de Acento</label>
                                    <div className="grid grid-cols-4 sm:grid-cols-8 gap-3 mb-4">
                                        {ACCENT_PRESETS.map((preset) => (
                                            <button
                                                key={preset.name}
                                                onClick={() => {
                                                    updateTheme({ accentColor: preset.color, accentHover: preset.hover });
                                                    setCustomColor(preset.color);
                                                }}
                                                className="group relative"
                                                title={preset.name}
                                            >
                                                <div
                                                    className={`w-10 h-10 rounded-full border-2 transition-all ${theme.accentColor === preset.color
                                                        ? 'border-white scale-110 shadow-lg'
                                                        : 'border-transparent hover:border-white/30 hover:scale-105'
                                                        }`}
                                                    style={{ backgroundColor: preset.color }}
                                                >
                                                    {theme.accentColor === preset.color && (
                                                        <Check className="w-5 h-5 text-white absolute inset-0 m-auto" />
                                                    )}
                                                </div>
                                                <span className="text-[10px] text-gray-500 block text-center mt-1 truncate">{preset.name}</span>
                                            </button>
                                        ))}
                                    </div>

                                    {/* Custom color picker */}
                                    <div className="flex items-center gap-3 p-3 bg-black/20 rounded-lg border border-white/10">
                                        <input
                                            type="color"
                                            value={customColor}
                                            onChange={(e) => {
                                                setCustomColor(e.target.value);
                                                updateTheme({ accentColor: e.target.value });
                                            }}
                                            className="w-10 h-10 rounded-lg cursor-pointer border-0 bg-transparent"
                                        />
                                        <div>
                                            <p className="text-white text-sm font-medium">Color personalizado</p>
                                            <p className="text-gray-500 text-xs">Elige cualquier color que quieras</p>
                                        </div>
                                        <span className="ml-auto text-gray-400 text-sm font-mono">{customColor.toUpperCase()}</span>
                                    </div>
                                </div>

                                {/* Chat Background */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-300 mb-3">Fondo de Chat</label>
                                    <div className="space-y-3">
                                        <div className="grid grid-cols-5 gap-2 mb-3">
                                            {['', '#1a1a2e', '#16213e', '#0f3460', '#1b1b2f'].map((bg, i) => (
                                                <button
                                                    key={i}
                                                    onClick={() => {
                                                        updateTheme({ chatBackground: bg });
                                                        setChatBgInput(bg);
                                                    }}
                                                    className={`h-12 rounded-lg border-2 transition-all ${theme.chatBackground === bg
                                                        ? 'border-white scale-105'
                                                        : 'border-white/10 hover:border-white/30'
                                                        }`}
                                                    style={{ backgroundColor: bg || '#111827' }}
                                                    title={bg || 'Por defecto'}
                                                >
                                                    {!bg && <span className="text-gray-500 text-xs">Default</span>}
                                                </button>
                                            ))}
                                        </div>
                                        <input
                                            type="text"
                                            value={chatBgInput}
                                            onChange={(e) => {
                                                setChatBgInput(e.target.value);
                                                updateTheme({ chatBackground: e.target.value });
                                            }}
                                            placeholder="Color hex (#1a1a2e), gradiente, o URL de imagen..."
                                            className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 ring-accent text-sm"
                                        />
                                    </div>
                                </div>

                                {/* Font Size */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                                        <Type className="w-4 h-4" />
                                        Tamaño de Texto
                                    </label>
                                    <div className="grid grid-cols-3 gap-3">
                                        {(["small", "normal", "large"] as const).map((size) => (
                                            <button
                                                key={size}
                                                onClick={() => updateTheme({ fontSize: size })}
                                                className={`px-4 py-3 rounded-lg border-2 transition-all text-center ${theme.fontSize === size
                                                    ? 'border-white bg-white/10 text-white'
                                                    : 'border-white/10 text-gray-400 hover:border-white/30 hover:text-white'
                                                    }`}
                                            >
                                                <span className={size === 'small' ? 'text-sm' : size === 'large' ? 'text-lg' : 'text-base'}>
                                                    {size === 'small' ? 'Pequeño' : size === 'normal' ? 'Normal' : 'Grande'}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Live Preview */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-300 mb-3">Vista previa</label>
                                    <div className="rounded-lg border border-white/10 overflow-hidden">
                                        <div className="p-3 border-b border-white/10" style={{ backgroundColor: 'var(--accent)' }}>
                                            <span className="text-white font-semibold text-sm">Chat con @usuario</span>
                                        </div>
                                        <div className="p-4 space-y-3" style={{
                                            backgroundColor: theme.chatBackground || '#111827',
                                            background: theme.chatBackground?.startsWith('http')
                                                ? `url(${theme.chatBackground}) center/cover`
                                                : theme.chatBackground || '#111827'
                                        }}>
                                            <div className="flex justify-start">
                                                <div className="bg-gray-700/80 backdrop-blur rounded-lg px-3 py-2 max-w-[70%]">
                                                    <p className="text-white text-sm">¡Hola! ¿Qué tal?</p>
                                                </div>
                                            </div>
                                            <div className="flex justify-end">
                                                <div className="rounded-lg px-3 py-2 max-w-[70%]" style={{ backgroundColor: 'var(--accent)' }}>
                                                    <p className="text-white text-sm">¡Todo bien! Me encanta este color 🎨</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer Actions */}
                    <div className="p-6 bg-gray-800/50 border-t border-white/10 flex justify-end gap-3">
                        <button
                            onClick={onClose}
                            className="px-6 py-2.5 rounded-lg text-gray-300 hover:text-white hover:bg-white/10 transition font-medium"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={async () => {
                                await handleSave();
                                await saveTheme();
                            }}
                            disabled={isSaving || isSavingTheme || bio.length > 300}
                            className="px-6 py-2.5 bg-accent text-white rounded-lg bg-accent-hover transition font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {(isSaving || isSavingTheme) ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                            Guardar Cambios
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
