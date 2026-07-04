"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { MapPin, Edit, Save, X, Plus, Globe } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const PRESET_INTERESTS = [
    "Videojuegos", "Música", "Gastronomía", "Tecnología",
    "Deportes", "Cultura", "Viajes", "Fitness", "Cine",
    "Arte", "Lectura", "Fotografía", "Moda", "Naturaleza"
];

export default function SettingsPage() {
    const { user } = useUser();
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Estados
    const [interests, setInterests] = useState<string[]>([]);
    const [newInterest, setNewInterest] = useState("");
    const [location, setLocation] = useState({
        city: "",
        lat: 0,
        lon: 0,
    });
    const [locationConsent, setLocationConsent] = useState(false);
    const [searchRadius, setSearchRadius] = useState(50);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    useEffect(() => {
        loadProfile();
    }, []);

    const loadProfile = async () => {
        try {
            const res = await fetch('/api/user/profile');
            if (res.ok) {
                const data = await res.json();
                setInterests(data.interests || []);
                if (data.location) {
                    setLocation({
                        city: data.location.city || "",
                        lat: data.location.latitude || 0,
                        lon: data.location.longitude || 0,
                    });
                    setLocationConsent(data.location.hasConsent || false);
                    setSearchRadius(data.location.searchRadius || 50);
                }
            }
        } catch (err) {
            console.error('Error loading profile:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const addInterest = (interest: string) => {
        if (interest && !interests.includes(interest) && interests.length < 10) {
            setInterests([...interests, interest]);
            setNewInterest("");
        }
    };

    const removeInterest = (interest: string) => {
        if (interests.length > 3) {
            setInterests(interests.filter(i => i !== interest));
        }
    };

    const requestLocation = async () => {
        try {
            const position = await new Promise<GeolocationPosition>((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject);
            });

            const res = await fetch(
                `https://nominatim.openstreetmap.org/reverse?lat=${position.coords.latitude}&lon=${position.coords.longitude}&format=json`
            );
            const data = await res.json();

            setLocation({
                city: data.address.city || data.address.town || data.address.village || "Tu ubicación",
                lat: position.coords.latitude,
                lon: position.coords.longitude,
            });
            setLocationConsent(true);
        } catch {
            setError("No se pudo obtener tu ubicación");
        }
    };

    const saveChanges = async () => {
        if (interests.length < 3) {
            setError("Debes tener al menos 3 intereses");
            return;
        }

        setIsSaving(true);
        setError("");
        setSuccess("");

        try {
            const res = await fetch('/api/user/onboarding', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    interests,
                    location: locationConsent ? location : null,
                    locationConsent,
                }),
            });

            if (!res.ok) throw new Error('Error al guardar');

            setSuccess("Cambios guardados correctamente");
            setTimeout(() => router.push('/feed'), 1500);
        } catch {
            setError("Error al guardar los cambios");
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-500"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
            {/* Header */}
            <header className="bg-gray-900/50 backdrop-blur-lg border-b border-white/10">
                <div className="container mx-auto px-4 py-4">
                    <div className="flex justify-between items-center">
                        <Link href="/feed" className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center">
                                <MapPin className="w-6 h-6 text-white" />
                            </div>
                            <span className="text-xl font-bold text-white">NearHype</span>
                        </Link>

                        <Link
                            href="/feed"
                            className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition"
                        >
                            Volver al Feed
                        </Link>
                    </div>
                </div>
            </header>

            <div className="container mx-auto px-4 py-8 max-w-4xl">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2">Configuración</h1>
                    <p className="text-gray-400">Personaliza tu experiencia en NearHype</p>
                </div>

                {/* Perfil */}
                <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6 mb-6">
                    <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                        <Edit className="w-5 h-5" />
                        Perfil
                    </h2>

                    <div className="flex items-center gap-4 mb-4">
                        <img
                            src={user?.imageUrl}
                            alt={user?.firstName || "Usuario"}
                            className="w-20 h-20 rounded-full border-2 border-indigo-500"
                        />
                        <div>
                            <p className="text-white font-semibold text-lg">
                                {user?.firstName} {user?.lastName}
                            </p>
                            <p className="text-gray-400">{user?.primaryEmailAddress?.emailAddress}</p>
                        </div>
                    </div>

                    <p className="text-sm text-gray-500">
                        Perfil gestionado por Clerk. Para cambiar tu foto o email,
                        <a href="https://dashboard.clerk.com" target="_blank" className="text-indigo-400 hover:underline ml-1">
                            visita el dashboard
                        </a>
                    </p>
                </div>

                {/* Intereses */}
                <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6 mb-6">
                    <h2 className="text-xl font-bold text-white mb-4">
                        Tus Intereses ({interests.length}/10)
                    </h2>

                    <div className="flex flex-wrap gap-2 mb-4">
                        {interests.map(interest => (
                            <div
                                key={interest}
                                className="bg-indigo-600 text-white px-4 py-2 rounded-full flex items-center gap-2"
                            >
                                <span>{interest}</span>
                                <button
                                    onClick={() => removeInterest(interest)}
                                    disabled={interests.length <= 3}
                                    className="hover:text-red-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>

                    <div className="mb-4">
                        <label className="text-gray-300 text-sm mb-2 block">Añadir nuevo interés</label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={newInterest}
                                onChange={(e) => setNewInterest(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && addInterest(newInterest)}
                                placeholder="Ej: Fotografía"
                                className="flex-1 px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-500"
                                maxLength={30}
                            />
                            <button
                                onClick={() => addInterest(newInterest)}
                                disabled={interests.length >= 10}
                                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Plus className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    <div>
                        <p className="text-gray-400 text-sm mb-2">Sugerencias:</p>
                        <div className="flex flex-wrap gap-2">
                            {PRESET_INTERESTS.filter(p => !interests.includes(p)).slice(0, 6).map(preset => (
                                <button
                                    key={preset}
                                    onClick={() => addInterest(preset)}
                                    disabled={interests.length >= 10}
                                    className="px-3 py-1 bg-white/5 text-gray-300 rounded-full text-sm hover:bg-white/10 disabled:opacity-50"
                                >
                                    + {preset}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Ubicación */}
                <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6 mb-6">
                    <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                        <MapPin className="w-5 h-5" />
                        Ubicación
                    </h2>

                    {location.city ? (
                        <div className="mb-4">
                            <p className="text-gray-300 mb-2">
                                <Globe className="w-4 h-4 inline mr-2" />
                                {location.city}
                            </p>
                            <button
                                onClick={requestLocation}
                                className="text-sm text-indigo-400 hover:underline"
                            >
                                Actualizar ubicación
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={requestLocation}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 mb-4"
                        >
                            Detectar mi ubicación
                        </button>
                    )}

                    <div>
                        <label className="text-gray-300 text-sm mb-2 block">
                            Radio de búsqueda: {searchRadius}km
                        </label>
                        <input
                            type="range"
                            min="10"
                            max="200"
                            step="10"
                            value={searchRadius}
                            onChange={(e) => setSearchRadius(parseInt(e.target.value))}
                            className="w-full"
                        />
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                            <span>10km (muy local)</span>
                            <span>200km (regional)</span>
                        </div>
                    </div>
                </div>

                {/* Mensajes */}
                {error && (
                    <div className="p-4 bg-red-500/20 border border-red-500 rounded-lg text-red-200 mb-4">
                        {error}
                    </div>
                )}

                {success && (
                    <div className="p-4 bg-green-500/20 border border-green-500 rounded-lg text-green-200 mb-4">
                        {success}
                    </div>
                )}

                {/* Botones */}
                <div className="flex gap-4">
                    <button
                        onClick={saveChanges}
                        disabled={isSaving || interests.length < 3}
                        className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        <Save className="w-5 h-5" />
                        {isSaving ? 'Guardando...' : 'Guardar Cambios'}
                    </button>

                    <Link
                        href="/feed"
                        className="px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition flex items-center justify-center"
                    >
                        Cancelar
                    </Link>
                </div>
            </div>
        </div>
    );
}
