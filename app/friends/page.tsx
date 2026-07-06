"use client";

import { useState, useEffect } from "react";
import {
    Users, UserCheck, UserX, MessageCircle, UserPlus,
    Loader2, Sparkles, Heart,
} from "lucide-react";
import Link from "next/link";
import GlobalHeader from "@/components/GlobalHeader";

type Friend = {
    id: string;
    username: string;
    avatarUrl?: string;
    friendsSince?: string;
};

type FriendRequest = {
    id: string;
    sender: {
        id: string;
        username: string;
        avatarUrl?: string;
    };
    createdAt: string;
};

type SuggestedProfile = {
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

type Tab = 'friends' | 'requests' | 'suggestions';

export default function FriendsPage() {
    const [activeTab, setActiveTab] = useState<Tab>('friends');
    const [friends, setFriends] = useState<Friend[]>([]);
    const [requests, setRequests] = useState<FriendRequest[]>([]);
    const [suggestions, setSuggestions] = useState<SuggestedProfile[]>([]);
    const [loadingFriends, setLoadingFriends] = useState(true);
    const [loadingRequests, setLoadingRequests] = useState(true);
    const [loadingSuggestions, setLoadingSuggestions] = useState(false);
    const [suggestionsFetched, setSuggestionsFetched] = useState(false);

    useEffect(() => {
        loadFriends();
        loadRequests();
    }, []);

    useEffect(() => {
        if (activeTab === 'suggestions' && !suggestionsFetched) {
            loadSuggestions();
        }
    }, [activeTab, suggestionsFetched]);

    const loadFriends = async () => {
        try {
            const res = await fetch('/api/friends');
            const data = await res.json();
            setFriends(data.friends || []);
        } catch (e) {
            console.error('Error loading friends:', e);
        } finally {
            setLoadingFriends(false);
        }
    };

    const loadRequests = async () => {
        try {
            const res = await fetch('/api/friends/requests');
            const data = await res.json();
            setRequests(data.requests || []);
        } catch (e) {
            console.error('Error loading requests:', e);
        } finally {
            setLoadingRequests(false);
        }
    };

    const loadSuggestions = async () => {
        setLoadingSuggestions(true);
        try {
            const res = await fetch('/api/discover/profiles');
            const data = await res.json();
            setSuggestions(data.profiles || []);
            setSuggestionsFetched(true);
        } catch (e) {
            console.error('Error loading suggestions:', e);
        } finally {
            setLoadingSuggestions(false);
        }
    };

    const handleAccept = async (requestId: string) => {
        try {
            const res = await fetch(`/api/friends/requests/${requestId}/accept`, { method: 'PUT' });
            if (res.ok) {
                setRequests(prev => prev.filter(r => r.id !== requestId));
                loadFriends();
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleReject = async (requestId: string) => {
        try {
            const res = await fetch(`/api/friends/requests/${requestId}/reject`, { method: 'PUT' });
            if (res.ok) {
                setRequests(prev => prev.filter(r => r.id !== requestId));
            }
        } catch (e) {
            console.error(e);
        }
    };

    const tabClass = (tab: Tab) =>
        `flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-1.5 border-b-2 transition ${activeTab === tab
            ? 'border-indigo-500 text-white'
            : 'border-transparent text-gray-400 hover:text-gray-200'
        }`;

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
            <GlobalHeader />

            <div className="container mx-auto px-4 py-6 max-w-2xl">
                {/* Page title */}
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center">
                        <Users className="w-6 h-6 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-white">Amigos</h1>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-white/10 mb-6">
                    <button onClick={() => setActiveTab('friends')} className={tabClass('friends')}>
                        <Users className="w-4 h-4" />
                        <span>Amigos</span>
                        {!loadingFriends && (
                            <span className="text-xs opacity-60">({friends.length})</span>
                        )}
                    </button>

                    <button onClick={() => setActiveTab('requests')} className={tabClass('requests')}>
                        <UserCheck className="w-4 h-4" />
                        <span>Solicitudes</span>
                        {requests.length > 0 && (
                            <span className="bg-red-500 text-white text-[9px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">
                                {requests.length > 99 ? '99+' : requests.length}
                            </span>
                        )}
                    </button>

                    <button onClick={() => setActiveTab('suggestions')} className={tabClass('suggestions')}>
                        <Sparkles className="w-4 h-4" />
                        <span>Sugerencias</span>
                    </button>
                </div>

                {/* ── Tab: Amigos ── */}
                {activeTab === 'friends' && (
                    <div>
                        {loadingFriends ? (
                            <div className="flex justify-center py-16">
                                <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                            </div>
                        ) : friends.length === 0 ? (
                            <div className="text-center py-16">
                                <Users className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                                <p className="text-white font-semibold mb-1">Aún no tienes amigos</p>
                                <p className="text-gray-500 text-sm mb-6">
                                    Busca personas con intereses similares en Sugerencias
                                </p>
                                <button
                                    onClick={() => setActiveTab('suggestions')}
                                    className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition"
                                >
                                    Ver sugerencias
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {friends.map(friend => (
                                    <div
                                        key={friend.id}
                                        className="flex items-center gap-3 p-4 bg-white/5 rounded-xl border border-white/10 hover:border-indigo-500/40 transition"
                                    >
                                        {friend.avatarUrl ? (
                                            <img loading="lazy" decoding="async"
                                                src={friend.avatarUrl}
                                                alt={friend.username}
                                                className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                                            />
                                        ) : (
                                            <div className="w-12 h-12 bg-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                                                {friend.username[0].toUpperCase()}
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-white font-semibold truncate">{friend.username}</p>
                                            {friend.friendsSince && (
                                                <p className="text-xs text-gray-500">
                                                    Amigos desde {new Date(friend.friendsSince).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
                                                </p>
                                            )}
                                        </div>
                                        <Link
                                            href={`/messages?user=${encodeURIComponent(friend.username)}`}
                                            className="min-h-[44px] flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition flex-shrink-0"
                                        >
                                            <MessageCircle className="w-4 h-4" />
                                            <span className="hidden sm:inline">Mensaje</span>
                                        </Link>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* ── Tab: Solicitudes ── */}
                {activeTab === 'requests' && (
                    <div>
                        {loadingRequests ? (
                            <div className="flex justify-center py-16">
                                <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                            </div>
                        ) : requests.length === 0 ? (
                            <div className="text-center py-16">
                                <UserCheck className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                                <p className="text-white font-semibold mb-1">No hay solicitudes pendientes</p>
                                <p className="text-gray-500 text-sm">
                                    Cuando alguien te envíe una solicitud aparecerá aquí
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {requests.map(req => (
                                    <div
                                        key={req.id}
                                        className="flex items-center gap-3 p-4 bg-white/5 rounded-xl border border-white/10"
                                    >
                                        {req.sender.avatarUrl ? (
                                            <img loading="lazy" decoding="async"
                                                src={req.sender.avatarUrl}
                                                alt={req.sender.username}
                                                className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                                            />
                                        ) : (
                                            <div className="w-12 h-12 bg-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                                                {req.sender.username[0].toUpperCase()}
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-white font-semibold truncate">{req.sender.username}</p>
                                            <p className="text-xs text-gray-500">
                                                {new Date(req.createdAt).toLocaleDateString('es-ES', {
                                                    day: 'numeric',
                                                    month: 'short',
                                                    year: 'numeric',
                                                })}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            <button
                                                onClick={() => handleAccept(req.id)}
                                                className="min-h-[44px] flex items-center gap-1.5 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition"
                                            >
                                                <UserCheck className="w-4 h-4" />
                                                <span className="hidden sm:inline">Aceptar</span>
                                            </button>
                                            <button
                                                onClick={() => handleReject(req.id)}
                                                className="min-h-[44px] flex items-center gap-1.5 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm font-semibold rounded-lg transition"
                                            >
                                                <UserX className="w-4 h-4" />
                                                <span className="hidden sm:inline">Rechazar</span>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* ── Tab: Sugerencias ── */}
                {activeTab === 'suggestions' && (
                    <div>
                        {loadingSuggestions ? (
                            <div className="flex justify-center py-16">
                                <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                            </div>
                        ) : suggestions.length === 0 && suggestionsFetched ? (
                            <div className="text-center py-16">
                                <Sparkles className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                                <p className="text-white font-semibold mb-1">Sin sugerencias disponibles</p>
                                <p className="text-gray-500 text-sm">
                                    Añade intereses y activa tu ubicación para ver personas cercanas
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {suggestions.map(profile => (
                                    <SuggestionCard key={profile.id} profile={profile} />
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

function SuggestionCard({ profile }: { profile: SuggestedProfile }) {
    const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

    const sendRequest = async () => {
        setStatus('sending');
        try {
            const res = await fetch('/api/friends/request', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ receiverUsername: profile.username }),
            });
            // 409 = already sent — treat as sent
            setStatus(res.ok || res.status === 409 ? 'sent' : 'error');
        } catch {
            setStatus('error');
        }
    };

    return (
        <div className="flex items-center gap-3 p-4 bg-white/5 rounded-xl border border-white/10 hover:border-indigo-500/40 transition">
            {profile.avatarUrl ? (
                <img loading="lazy" decoding="async"
                    src={profile.avatarUrl}
                    alt={profile.username}
                    className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                />
            ) : (
                <div className="w-12 h-12 bg-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                    {profile.username[0].toUpperCase()}
                </div>
            )}

            <div className="flex-1 min-w-0">
                <p className="text-white font-semibold truncate">{profile.username}</p>
                <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 mt-0.5">
                    {profile.matchScore > 0 && (
                        <span className="flex items-center gap-1">
                            <Heart className="w-3 h-3 text-pink-400" />
                            {profile.matchScore}% coincidencia
                        </span>
                    )}
                    {profile.location?.city && (
                        <span>
                            📍 {profile.location.city}
                            {profile.location.distance ? ` · ${Math.round(profile.location.distance)} km` : ''}
                        </span>
                    )}
                </div>
                {profile.publicInterests && profile.publicInterests.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                        {profile.publicInterests.slice(0, 3).map(interest => (
                            <span
                                key={interest}
                                className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 rounded-full text-[10px]"
                            >
                                {interest}
                            </span>
                        ))}
                    </div>
                )}
            </div>

            {status === 'sent' ? (
                <span className="px-4 py-2 bg-gray-700 text-gray-400 text-sm font-semibold rounded-lg flex-shrink-0">
                    Enviada ✓
                </span>
            ) : (
                <button
                    onClick={sendRequest}
                    disabled={status === 'sending'}
                    className="min-h-[44px] flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition flex-shrink-0"
                >
                    {status === 'sending' ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <UserPlus className="w-4 h-4" />
                    )}
                    <span className="hidden sm:inline">Añadir</span>
                </button>
            )}
        </div>
    );
}
