"use client";

import { useState, useEffect } from "react";
import { Sparkles, Heart, X, Loader2, RefreshCcw } from "lucide-react";
import ProfileCard from "@/components/ProfileCard";

type Profile = {
    id: string;
    username: string;
    avatarUrl?: string;
    bio?: string;
    publicInterests?: string[];
    location?: {
        city: string;
        distance: number;
    };
    matchScore: number;
};

export default function DiscoverPeople() {
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        loadProfiles();
    }, []);

    const loadProfiles = async () => {
        try {
            const res = await fetch('/api/discover/profiles');
            const data = await res.json();
            setProfiles(data.profiles || []);
        } catch (error) {
            console.error('Error loading profiles:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSwipe = async (direction: 'like' | 'skip') => {
        if (isProcessing || currentIndex >= profiles.length) return;

        const currentProfile = profiles[currentIndex];
        setIsProcessing(true);

        try {
            await fetch(`/api/discover/profiles/${currentProfile.id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: direction }),
            });

            setCurrentIndex(prev => prev + 1);

            // Si quedan pocos perfiles, cargar más
            if (currentIndex >= profiles.length - 3) {
                loadProfiles();
            }
        } catch (error) {
            console.error('Error processing swipe:', error);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleButtonAction = (direction: 'like' | 'skip') => {
        handleSwipe(direction);
    };

    if (isLoading) {
        return (
            <div className="h-[600px] flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
            </div>
        );
    }

    const currentProfile = profiles[currentIndex];
    const hasMoreProfiles = currentIndex < profiles.length;

    return (
        <div className="max-w-md mx-auto">
            {/* Header */}
            <div className="text-center mb-8">
                <div className="flex items-center justify-center gap-3 mb-2">
                    <Sparkles className="w-8 h-8 text-indigo-400" />
                    <h2 className="text-3xl font-bold text-white">Personas Cercanas</h2>
                </div>
                <p className="text-gray-400">
                    {hasMoreProfiles
                        ? `${profiles.length - currentIndex} perfiles nuevos`
                        : "No hay más perfiles por ahora"}
                </p>
            </div>

            {hasMoreProfiles ? (
                <div className="relative h-[600px]">
                    {/* Render próxima card (background) */}
                    {profiles[currentIndex + 1] && (
                        <div className="absolute top-0 left-0 w-full h-full opacity-50 scale-95 transform">
                            <div className="bg-gray-800 rounded-2xl h-full border-2 border-white/10"></div>
                        </div>
                    )}

                    {/* Render current card */}
                    {currentProfile && (
                        <ProfileCard
                            profile={currentProfile}
                            onSwipe={handleSwipe}
                            isTop={true}
                        />
                    )}
                </div>
            ) : (
                <div className="bg-gray-800 rounded-2xl p-12 text-center border-2 border-white/10">
                    <Sparkles className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                    <h3 className="text-2xl font-bold text-white mb-2">
                        ¡Eso es todo!
                    </h3>
                    <p className="text-gray-400 mb-6">
                        No hay más perfiles disponibles en este momento.
                    </p>
                    <button
                        onClick={() => {
                            setCurrentIndex(0);
                            loadProfiles();
                        }}
                        className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition flex items-center gap-2 mx-auto"
                    >
                        <RefreshCcw className="w-5 h-5" />
                        Buscar de nuevo
                    </button>
                </div>
            )}

            {/* Action Buttons (Desktop) */}
            {hasMoreProfiles && (
                <div className="flex items-center justify-center gap-6 mt-8">
                    <button
                        onClick={() => handleButtonAction('skip')}
                        disabled={isProcessing}
                        className="w-16 h-16 bg-red-600 text-white rounded-full hover:bg-red-700 transition flex items-center justify-center shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Omitir (←)"
                    >
                        <X className="w-8 h-8" />
                    </button>
                    <button
                        onClick={() => handleButtonAction('like')}
                        disabled={isProcessing}
                        className="w-16 h-16 bg-green-600 text-white rounded-full hover:bg-green-700 transition flex items-center justify-center shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Me gusta (→)"
                    >
                        <Heart className="w-8 h-8" />
                    </button>
                </div>
            )}

            {/* Instructions */}
            {hasMoreProfiles && (
                <div className="text-center mt-6 text-gray-500 text-sm">
                    <p className="hidden md:block">
                        Arrastra la tarjeta o usa los botones para decidir
                    </p>
                    <p className="md:hidden">
                        Desliza la tarjeta para decidir
                    </p>
                </div>
            )}
        </div>
    );
}
