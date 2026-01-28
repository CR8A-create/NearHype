"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { Loader2, MapPin, Users, Calendar, Settings, MessageCircle } from "lucide-react";
import Link from "next/link";
import AddFriendButton from "@/components/AddFriendButton";

type UserProfile = {
    id: string;
    username: string;
    avatarUrl?: string;
    bio?: string;
    bannerUrl?: string;
    publicInterests?: string[];
    showLocation: boolean;
    createdAt: Date;
    location?: {
        city: string;
        countryCode: string;
    };
    stats: {
        friends: number;
        communities: number;
    };
    relationship: string;
    isOwnProfile: boolean;
};

export default function UserProfilePage() {
    const params = useParams();
    const { user: clerkUser } = useUser();
    const username = params?.username as string;

    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        if (username) {
            loadProfile();
        }
    }, [username]);

    const loadProfile = async () => {
        try {
            const res = await fetch(`/api/users/${username}`);
            const data = await res.json();

            if (res.ok) {
                setProfile(data.user);
            } else {
                setError(data.error || "Error al cargar perfil");
            }
        } catch (err) {
            setError("Error al cargar perfil");
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
            </div>
        );
    }

    if (error || !profile) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <div className="text-center">
                    <p className="text-red-400 text-lg mb-4">{error}</p>
                    <Link href="/feed" className="text-indigo-400 hover:underline">
                        Volver al feed
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-900">
            {/* Banner */}
            <div
                className="h-64 bg-gradient-to-r from-indigo-600 to-purple-600 relative"
                style={profile.bannerUrl ? {
                    backgroundImage: `url(${profile.bannerUrl})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                } : {}}
            >
                {profile.isOwnProfile && (
                    <Link
                        href="/settings/profile"
                        className="absolute top-4 right-4 bg-gray-900/80 text-white px-4 py-2 rounded-lg hover:bg-gray-900 transition flex items-center gap-2"
                    >
                        <Settings className="w-4 h-4" />
                        Editar Perfil
                    </Link>
                )}
            </div>

            {/* Main Content */}
            <div className="container mx-auto px-4">
                <div className="relative -mt-20 mb-8">
                    {/* Avatar */}
                    <div className="flex items-end gap-6">
                        {profile.avatarUrl ? (
                            <img
                                src={profile.avatarUrl}
                                alt={profile.username}
                                className="w-40 h-40 rounded-full border-4 border-gray-900 shadow-xl"
                            />
                        ) : (
                            <div className="w-40 h-40 bg-indigo-600 rounded-full border-4 border-gray-900 shadow-xl flex items-center justify-center text-white text-5xl font-bold">
                                {profile.username[0].toUpperCase()}
                            </div>
                        )}

                        <div className="flex-1 pb-4">
                            <h1 className="text-4xl font-bold text-white mb-2">{profile.username}</h1>
                            {profile.location && profile.showLocation && (
                                <p className="text-gray-400 flex items-center gap-2">
                                    <MapPin className="w-4 h-4" />
                                    {profile.location.city}, {profile.location.countryCode}
                                </p>
                            )}
                        </div>

                        {/* Actions */}
                        {!profile.isOwnProfile && (
                            <div className="pb-4 flex gap-2">
                                {profile.relationship === "friends" ? (
                                    <Link
                                        href={`/messages?user=${profile.username}`}
                                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
                                    >
                                        <MessageCircle className="w-4 h-4" />
                                        Enviar Mensaje
                                    </Link>
                                ) : (
                                    <AddFriendButton username={profile.username} />
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 mb-8">
                    <div className="bg-gray-800 rounded-lg p-4 text-center">
                        <p className="text-3xl font-bold text-white">{profile.stats.friends}</p>
                        <p className="text-gray-400 text-sm">Amigos</p>
                    </div>
                    <div className="bg-gray-800 rounded-lg p-4 text-center">
                        <p className="text-3xl font-bold text-white">{profile.stats.communities}</p>
                        <p className="text-gray-400 text-sm">Comunidades</p>
                    </div>
                    <div className="bg-gray-800 rounded-lg p-4 text-center flex items-center justify-center gap-2">
                        <Calendar className="w-5 h-5 text-gray-400" />
                        <div>
                            <p className="text-sm text-gray-400">Desde</p>
                            <p className="text-white font-semibold">
                                {new Date(profile.createdAt).toLocaleDateString('es-ES', {
                                    month: 'short',
                                    year: 'numeric'
                                })}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Bio */}
                {profile.bio && (
                    <div className="bg-gray-800 rounded-lg p-6 mb-8">
                        <h2 className="text-xl font-bold text-white mb-3">Bio</h2>
                        <p className="text-gray-300 whitespace-pre-wrap">{profile.bio}</p>
                    </div>
                )}

                {/* Interests */}
                {profile.publicInterests && profile.publicInterests.length > 0 && (
                    <div className="bg-gray-800 rounded-lg p-6">
                        <h2 className="text-xl font-bold text-white mb-3">Intereses</h2>
                        <div className="flex flex-wrap gap-2">
                            {profile.publicInterests.map((interest, idx) => (
                                <span
                                    key={idx}
                                    className="px-3 py-1 bg-indigo-600/20 text-indigo-400 rounded-full text-sm"
                                >
                                    {interest}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
