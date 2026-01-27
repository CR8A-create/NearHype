"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { MapPin, Sparkles, Check } from "lucide-react";

// Categorías preset de intereses
const PRESET_CATEGORIES = [
    { id: 'gaming', label: 'Videojuegos', icon: '🎮', subtopics: ['PC', 'Console', 'Mobile', 'eSports'] },
    { id: 'music', label: 'Música', icon: '🎵', subtopics: ['Conciertos', 'Festivales', 'Indie', 'Electrónica'] },
    { id: 'food', label: 'Gastronomía', icon: '🍕', subtopics: ['Restaurantes', 'Recetas', 'Vegano'] },
    { id: 'tech', label: 'Tecnología', icon: '💻', subtopics: ['IA', 'Startups', 'Hardware'] },
    { id: 'sports', label: 'Deportes', icon: '⚽', subtopics: ['Fútbol', 'Basket', 'Running'] },
    { id: 'culture', label: 'Cultura', icon: '🎭', subtopics: ['Cine', 'Teatro', 'Museos'] },
    { id: 'travel', label: 'Viajes', icon: '✈️', subtopics: ['Aventura', 'Playas', 'Montaña'] },
    { id: 'fitness', label: 'Fitness', icon: '💪', subtopics: ['Gym', 'Yoga', 'CrossFit'] },
];

type OnboardingStep = 'interests' | 'location' | 'complete';

export default function OnboardingPage() {
    const { user } = useUser();
    const router = useRouter();

    const [step, setStep] = useState<OnboardingStep>('interests');
    const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
    const [customInterest, setCustomInterest] = useState("");
    const [location, setLocation] = useState<{ city: string; lat: number; lon: number } | null>(null);
    const [manualCity, setManualCity] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [locationConsent, setLocationConsent] = useState(false);

    // Verificar si el onboarding ya está completo
    useEffect(() => {
        async function checkOnboarding() {
            try {
                const res = await fetch('/api/user/profile');
                if (res.ok) {
                    const data = await res.json();
                    if (data.onboardingCompleted) {
                        router.push('/feed');
                    }
                }
            } catch (err) {
                console.error('Error checking onboarding:', err);
            }
        }
        checkOnboarding();
    }, [router]);

    // Toggle interest selection
    const toggleInterest = (interest: string) => {
        if (selectedInterests.includes(interest)) {
            setSelectedInterests(prev => prev.filter(i => i !== interest));
        } else {
            if (selectedInterests.length < 10) {
                setSelectedInterests(prev => [...prev, interest]);
            }
        }
    };

    // Añadir interés personalizado
    const addCustomInterest = () => {
        if (customInterest.trim() && !selectedInterests.includes(customInterest.trim())) {
            if (selectedInterests.length < 10) {
                setSelectedInterests(prev => [...prev, customInterest.trim()]);
                setCustomInterest("");
            }
        }
    };

    // Solicitar ubicación del navegador
    const requestLocationPermission = async () => {
        setIsLoading(true);
        setError("");

        try {
            const position = await new Promise<GeolocationPosition>((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                    enableHighAccuracy: false,
                    timeout: 10000,
                });
            });

            // Reverse geocoding con API gratuita
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
        } catch (err) {
            setError("No se pudo obtener tu ubicación. Por favor ingrésala manualmente.");
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    // Usar ubicación manual
    const useManualLocation = () => {
        if (manualCity.trim()) {
            setLocation({
                city: manualCity.trim(),
                lat: 0, // Se puede mejorar con geocoding
                lon: 0,
            });
            setLocationConsent(false);
        }
    };

    // Completar onboarding
    const completeOnboarding = async () => {
        if (selectedInterests.length < 3) {
            setError("Selecciona al menos 3 intereses");
            return;
        }
        if (!location) {
            setError("Por favor proporciona tu ubicación");
            return;
        }

        setIsLoading(true);
        setError("");

        try {
            const res = await fetch('/api/user/onboarding', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    interests: selectedInterests,
                    location: location,
                    locationConsent: locationConsent,
                }),
            });

            if (!res.ok) {
                throw new Error('Error al guardar el perfil');
            }

            setStep('complete');

            // Redirigir al feed después de 2 segundos
            setTimeout(() => {
                router.push('/feed');
            }, 2000);
        } catch (err) {
            setError("Hubo un error. Por favor intenta de nuevo.");
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-indigo-900 py-12 px-4">
            <div className="max-w-4xl mx-auto">
                {/* Progress bar */}
                <div className="mb-8">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-white font-semibold">
                            {step === 'interests' ? 'Paso 1 de 2' : step === 'location' ? 'Paso 2 de 2' : 'Completado'}
                        </span>
                        <span className="text-gray-300 text-sm">
                            {step === 'interests' ? 'Intereses' : step === 'location' ? 'Ubicación' : '¡Listo!'}
                        </span>
                    </div>
                    <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-indigo-500 transition-all duration-500"
                            style={{
                                width: step === 'interests' ? '33%' : step === 'location' ? '66%' : '100%'
                            }}
                        />
                    </div>
                </div>

                {/* Step: Interests */}
                {step === 'interests' && (
                    <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
                        <div className="text-center mb-8">
                            <Sparkles className="w-16 h-16 text-indigo-400 mx-auto mb-4" />
                            <h1 className="text-4xl font-bold text-white mb-3">
                                ¿Qué te interesa?
                            </h1>
                            <p className="text-gray-300 text-lg">
                                Selecciona al menos 3 temas (máximo 10)
                            </p>
                            <p className="text-indigo-300 font-semibold mt-2">
                                {selectedInterests.length} / 10 seleccionados
                            </p>
                        </div>

                        {/* Grid de categorías */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                            {PRESET_CATEGORIES.map(category => (
                                <button
                                    key={category.id}
                                    onClick={() => toggleInterest(category.label)}
                                    className={`p-6 rounded-xl border-2 transition-all hover:scale-105 ${selectedInterests.includes(category.label)
                                            ? 'bg-indigo-600 border-indigo-400 shadow-lg'
                                            : 'bg-white/5 border-white/20 hover:bg-white/10'
                                        }`}
                                >
                                    <div className="text-4xl mb-2">{category.icon}</div>
                                    <div className="text-white font-semibold">{category.label}</div>
                                </button>
                            ))}
                        </div>

                        {/* Input personalizado */}
                        <div className="mb-6">
                            <label className="text-white font-semibold mb-2 block">
                                O añade un interés personalizado:
                            </label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={customInterest}
                                    onChange={(e) => setCustomInterest(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && addCustomInterest()}
                                    placeholder="Ej: K-pop, Senderismo, Astronomía..."
                                    className="flex-1 px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                                <button
                                    onClick={addCustomInterest}
                                    className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-semibold"
                                >
                                    Añadir
                                </button>
                            </div>
                        </div>

                        {/* Intereses seleccionados */}
                        {selectedInterests.length > 0 && (
                            <div className="mb-6">
                                <p className="text-white font-semibold mb-3">Tus intereses:</p>
                                <div className="flex flex-wrap gap-2">
                                    {selectedInterests.map(interest => (
                                        <span
                                            key={interest}
                                            className="px-4 py-2 bg-indigo-600 text-white rounded-full text-sm font-semibold flex items-center gap-2"
                                        >
                                            {interest}
                                            <button
                                                onClick={() => toggleInterest(interest)}
                                                className="hover:text-red-300"
                                            >
                                                ✕
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {error && (
                            <div className="mb-6 p-4 bg-red-500/20 border border-red-500 rounded-lg text-red-200">
                                {error}
                            </div>
                        )}

                        <button
                            onClick={() => {
                                if (selectedInterests.length >= 3) {
                                    setStep('location');
                                    setError("");
                                } else {
                                    setError("Selecciona al menos 3 intereses");
                                }
                            }}
                            disabled={selectedInterests.length < 3}
                            className="w-full py-4 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Continuar
                        </button>
                    </div>
                )}

                {/* Step: Location */}
                {step === 'location' && (
                    <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
                        <div className="text-center mb-8">
                            <MapPin className="w-16 h-16 text-indigo-400 mx-auto mb-4" />
                            <h1 className="text-4xl font-bold text-white mb-3">
                                ¿Dónde estás?
                            </h1>
                            <p className="text-gray-300 text-lg">
                                Solo guardamos tu ciudad aproximada. Tu privacidad es importante.
                            </p>
                        </div>

                        {!location ? (
                            <>
                                {/* Opción 1: Geolocalización automática */}
                                <div className="mb-6 p-6 bg-white/5 rounded-xl border border-white/20">
                                    <h3 className="text-white font-bold text-lg mb-3">Opción 1: Detección automática</h3>
                                    <p className="text-gray-300 mb-4">
                                        Usaremos la ubicación de tu navegador solo para esta vez.
                                    </p>
                                    <button
                                        onClick={requestLocationPermission}
                                        disabled={isLoading}
                                        className="w-full py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-semibold disabled:opacity-50"
                                    >
                                        {isLoading ? 'Obteniendo ubicación...' : 'Usar mi ubicación actual'}
                                    </button>
                                </div>

                                {/* Opción 2: Manual */}
                                <div className="p-6 bg-white/5 rounded-xl border border-white/20">
                                    <h3 className="text-white font-bold text-lg mb-3">Opción 2: Ingreso manual</h3>
                                    <p className="text-gray-300 mb-4">
                                        Escribe tu ciudad manualmente.
                                    </p>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={manualCity}
                                            onChange={(e) => setManualCity(e.target.value)}
                                            placeholder="Ej: Madrid, Barcelona, Valencia..."
                                            className="flex-1 px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        />
                                        <button
                                            onClick={useManualLocation}
                                            className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-semibold"
                                        >
                                            Usar
                                        </button>
                                    </div>
                                </div>

                                {error && (
                                    <div className="mt-6 p-4 bg-yellow-500/20 border border-yellow-500 rounded-lg text-yellow-200">
                                        {error}
                                    </div>
                                )}
                            </>
                        ) : (
                            <>
                                {/* Ubicación confirmada */}
                                <div className="mb-6 p-6 bg-green-500/20 border border-green-500 rounded-xl">
                                    <div className="flex items-center gap-3 mb-2">
                                        <Check className="w-6 h-6 text-green-400" />
                                        <h3 className="text-white font-bold text-lg">Ubicación configurada</h3>
                                    </div>
                                    <p className="text-green-200 text-lg">
                                        📍 {location.city}
                                    </p>
                                    <button
                                        onClick={() => setLocation(null)}
                                        className="mt-3 text-sm text-green-300 hover:text-green-200 underline"
                                    >
                                        Cambiar ubicación
                                    </button>
                                </div>

                                <button
                                    onClick={completeOnboarding}
                                    disabled={isLoading}
                                    className="w-full py-4 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition font-bold text-lg disabled:opacity-50"
                                >
                                    {isLoading ? 'Guardando...' : 'Completar configuración'}
                                </button>
                            </>
                        )}
                    </div>
                )}

                {/* Step: Complete */}
                {step === 'complete' && (
                    <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-12 border border-white/20 text-center">
                        <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Check className="w-12 h-12 text-white" />
                        </div>
                        <h1 className="text-4xl font-bold text-white mb-4">
                            ¡Todo listo!
                        </h1>
                        <p className="text-gray-300 text-lg mb-6">
                            Estamos preparando tu feed personalizado...
                        </p>
                        <div className="flex justify-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
                        </div>
                    </div>
                )}

                {/* Botón de volver (solo en step location) */}
                {step === 'location' && (
                    <button
                        onClick={() => setStep('interests')}
                        className="mt-6 text-gray-300 hover:text-white transition text-center w-full"
                    >
                        ← Volver a intereses
                    </button>
                )}
            </div>
        </div>
    );
}
