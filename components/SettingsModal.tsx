"use client";

import { useState, useEffect } from "react";
import { X, Plus, Trash2, MapPin, Loader2 } from "lucide-react";

type UserProfile = {
    interests: Array<{ id: string; topic: string }>;
    location: {
        city: string;
        latitude: number;
        longitude: number;
        radiusKm: number;
    } | null;
    settings: {
        preferredLanguage: string;
        distanceUnit: "km" | "mi";
    };
};

export default function SettingsModal({ onClose }: { onClose: () => void }) {
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [newInterest, setNewInterest] = useState("");
    const [newCity, setNewCity] = useState("");
    const [radius, setRadius] = useState(20);

    useEffect(() => {
        loadProfile();
    }, []);

    const loadProfile = async () => {
        try {
            const res = await fetch("/api/user/profile");
            const data = await res.json();
            setProfile(data);
            if (data.location) {
                setNewCity(data.location.city || "");
                setRadius(data.location.radiusKm || 20);
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
            const res = await fetch("/api/user/profile", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    interests: profile.interests.map((i) => i.topic),
                    city: newCity,
                    radiusKm: radius,
                }),
            });

            if (res.ok) {
                onClose();
                window.location.reload(); // Recargar para actualizar feed
            } else {
                alert("Error al guardar. Intenta de nuevo.");
            }
        } catch (error) {
            console.error("Error saving profile:", error);
            alert("Error al guardar. Intenta de nuevo.");
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-gray-900 rounded-2xl p-8 max-w-2xl w-full">
                    <div className="flex items-center justify-center">
                        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                    </div>
                </div>
            </div>
        );
    }

    if (!profile) {
        return null;
    }

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-gray-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-gray-900 border-b border-white/10 p-6 flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-white">Configuración</h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-lg transition"
                    >
                        <X className="w-6 h-6 text-gray-400" />
                    </button>
                </div>

                <div className="p-6 space-y-8">
                    {/* Intereses */}
                    <section>
                        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-indigo-400" />
                            Mis Intereses
                        </h3>
                        <p className="text-sm text-gray-400 mb-4">
                            Agrega tus intereses para personalizar tu feed (videojuegos, bandas, deportes, etc.)
                        </p>

                        {/* Input para agregar */}
                        <div className="flex gap-2 mb-4">
                            <input
                                type="text"
                                value={newInterest}
                                onChange={(e) => setNewInterest(e.target.value)}
                                onKeyPress={(e) => e.key === "Enter" && handleAddInterest()}
                                placeholder="Ej: Valorant, Cold Play, Fútbol..."
                                className="flex-1 px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                            <button
                                onClick={handleAddInterest}
                                className="px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition flex items-center gap-2"
                            >
                                <Plus className="w-5 h-5" />
                                Agregar
                            </button>
                        </div>

                        {/* Lista de intereses */}
                        <div className="flex flex-wrap gap-2">
                            {profile.interests.map((interest) => (
                                <div
                                    key={interest.id}
                                    className="px-4 py-2 bg-indigo-600/20 border border-indigo-500/30 rounded-full text-indigo-300 flex items-center gap-2"
                                >
                                    <span>{interest.topic}</span>
                                    <button
                                        onClick={() => handleRemoveInterest(interest.id)}
                                        className="hover:bg-indigo-500/30 rounded-full p-1 transition"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>

                        {profile.interests.length === 0 && (
                            <p className="text-gray-500 text-center py-4">
                                No has agregado intereses aún
                            </p>
                        )}
                    </section>

                    {/* Ubicación */}
                    <section>
                        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                            <MapPin className="w-5 h-5 text-indigo-400" />
                            Ubicación
                        </h3>
                        <p className="text-sm text-gray-400 mb-4">
                            Configura tu ciudad para ver contenido local
                        </p>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Ciudad
                                </label>
                                <input
                                    type="text"
                                    value={newCity}
                                    onChange={(e) => setNewCity(e.target.value)}
                                    placeholder="Ej: Badajoz, Madrid..."
                                    className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Radio de búsqueda: {radius} km
                                </label>
                                <input
                                    type="range"
                                    min="5"
                                    max="100"
                                    step="5"
                                    value={radius}
                                    onChange={(e) => setRadius(Number(e.target.value))}
                                    className="w-full"
                                />
                                <div className="flex justify-between text-xs text-gray-500 mt-1">
                                    <span>5 km</span>
                                    <span>100 km</span>
                                </div>
                            </div>
                        </div>
                    </section>
                </div>

                {/* Footer */}
                <div className="sticky bottom-0 bg-gray-900 border-t border-white/10 p-6 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 px-6 py-3 bg-white/10 text-white rounded-lg hover:bg-white/20 transition"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {isSaving ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Guardando...
                            </>
                        ) : (
                            "Guardar Cambios"
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

// Icono Sparkles (faltaba en imports)
function Sparkles({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
        </svg>
    );
}
