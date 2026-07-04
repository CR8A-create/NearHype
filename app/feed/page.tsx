"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
    MapPin, Sparkles, RefreshCw,
    ExternalLink, Play, MessageSquare, Gamepad2,
    Lightbulb, Target, Newspaper, Globe, ArrowUp, Users, Calendar
} from "lucide-react";
import Link from "next/link";
import GlobalHeader from "@/components/GlobalHeader";

type ContentItem = {
    id: string;
    type: 'article' | 'video' | 'music' | 'image' | 'game' | 'fact' | 'recommendation' | 'reddit' | 'community_post' | 'event';
    title: string;
    description: string;
    url: string;
    embedUrl?: string;
    thumbnailUrl?: string;
    source: string;
    publishedAt: string;
    relevanceScore: number;
    category: string;
    imageUrl?: string;
    mediaType?: 'youtube' | 'spotify' | 'reddit' | 'image' | 'link' | 'game';
    duration?: string;
    interactionCount?: number;
    isRecommendation?: boolean;
    reason?: string;
    icon?: string;
    location?: { city: string; distance: number };
    subreddit?: string;
    score?: number;
    numComments?: number;
    // Community post fields
    author?: string;
    community?: string;
    communitySlug?: string;
    // Event fields
    startDate?: string;
    eventLocation?: string;
};

type FeedResponse = {
    items: ContentItem[];
    generatedAt: string;
    userLocation: string;
    totalSources: number;
};

export default function FeedPage() {
    const router = useRouter();
    const [feed, setFeed] = useState<FeedResponse | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState("");
    const [needsOnboarding, setNeedsOnboarding] = useState(false);
    const [filterCategory, setFilterCategory] = useState<string>("all");
    const [displayedCount, setDisplayedCount] = useState(15);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [showScrollTop, setShowScrollTop] = useState(false);

    useEffect(() => { loadFeed(); }, []);

    // Infinite scroll
    useEffect(() => {
        const handleScroll = () => {
            if (isLoadingMore) return;
            setShowScrollTop(window.scrollY > 800);
            if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 500) {
                loadMore();
            }
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, [displayedCount, feed, filterCategory, isLoadingMore]);

    const loadFeed = async () => {
        setIsLoading(true);
        setError("");
        try {
            const res = await fetch('/api/feed/generate');
            if (!res.ok) {
                if (res.status === 401) return;
                throw new Error('Error al cargar el feed');
            }
            const data = await res.json();
            if (data.needsOnboarding) {
                setNeedsOnboarding(true);
                setIsLoading(false);
                return;
            }
            setFeed(data);
            setDisplayedCount(15);
        } catch (err) {
            console.error('Error loading feed:', err);
            setError("No pudimos cargar tu feed. Intenta de nuevo.");
        } finally {
            setIsLoading(false);
        }
    };

    const refreshFeed = async () => {
        setIsRefreshing(true);
        await loadFeed();
        setIsRefreshing(false);
    };

    const loadMore = useCallback(() => {
        if (!feed || isLoadingMore) return;
        const filtered = getFilteredItems();
        if (displayedCount >= filtered.length) return;
        setIsLoadingMore(true);
        setTimeout(() => {
            setDisplayedCount(prev => Math.min(prev + 10, filtered.length));
            setIsLoadingMore(false);
        }, 200);
    }, [feed, isLoadingMore, displayedCount, filterCategory]);

    const getFilteredItems = () => {
        if (!feed) return [];
        if (filterCategory === "all") return feed.items;
        return feed.items.filter(item => {
            if (filterCategory === "video") return item.type === 'video';
            if (filterCategory === "reddit") return item.type === 'reddit';
            if (filterCategory === "events") return item.type === 'event';
            if (filterCategory === "community") return item.type === 'community_post';
            if (filterCategory === "gaming") return item.type === 'game' || item.category === 'gaming';
            if (filterCategory === "facts") return item.type === 'fact' || item.type === 'recommendation';
            if (filterCategory === "news") return item.type === 'article';
            return item.category === filterCategory;
        });
    };

    const filteredItems = getFilteredItems().slice(0, displayedCount);
    const allCount = getFilteredItems().length;

    const categories = [
        { id: "all", label: "Todo", icon: "🌐" },
        { id: "news", label: "Noticias", icon: "📰" },
        { id: "events", label: "Eventos", icon: "📅" },
        { id: "community", label: "NearHype", icon: "👥" },
        { id: "video", label: "Videos", icon: "🎬" },
        { id: "reddit", label: "Reddit", icon: "💬" },
        { id: "gaming", label: "Gaming", icon: "🎮" },
        { id: "facts", label: "Descubre", icon: "💡" },
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
            <GlobalHeader />

            {/* Onboarding prompt */}
            {needsOnboarding && (
                <div className="container mx-auto px-4 py-16 flex items-center justify-center">
                    <div className="max-w-md w-full text-center space-y-6 bg-white/5 border border-white/10 rounded-2xl p-10">
                        <Sparkles className="w-14 h-14 text-indigo-400 mx-auto" />
                        <h2 className="text-2xl font-bold text-white">Configura tu perfil</h2>
                        <p className="text-gray-400">
                            Selecciona tus intereses para ver contenido personalizado: noticias, videos, gaming, música y más.
                        </p>
                        <button
                            onClick={() => router.push("/onboarding")}
                            className="w-full py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition"
                        >
                            Configurar mi perfil →
                        </button>
                    </div>
                </div>
            )}

            {/* Main feed */}
            {!needsOnboarding && (
                <div className="max-w-3xl mx-auto px-4 py-4 sm:py-6">
                    {/* Feed header */}
                    {feed && (
                        <div className="mb-4 sm:mb-6 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-1.5 text-gray-400 text-sm">
                                    <MapPin className="w-4 h-4 text-indigo-400" />
                                    <span className="font-medium text-gray-300">{feed.userLocation}</span>
                                </div>
                                <span className="text-gray-600">•</span>
                                <span className="text-gray-500 text-sm">{feed.totalSources} fuentes</span>
                            </div>
                            <button
                                onClick={refreshFeed}
                                disabled={isRefreshing}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition"
                            >
                                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                                <span className="hidden sm:inline">Actualizar</span>
                            </button>
                        </div>
                    )}

                    {/* Category filters — scrollable on mobile */}
                    <div className="mb-4 sm:mb-6 flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                        {categories.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => { setFilterCategory(cat.id); setDisplayedCount(15); }}
                                className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-full whitespace-nowrap text-sm transition-all ${filterCategory === cat.id
                                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                                        : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-gray-300'
                                    }`}
                            >
                                <span>{cat.icon}</span>
                                <span>{cat.label}</span>
                            </button>
                        ))}
                    </div>

                    {/* Loading */}
                    {isLoading && (
                        <div className="flex flex-col items-center justify-center py-20">
                            <div className="relative w-16 h-16 mb-4">
                                <div className="absolute inset-0 rounded-full border-2 border-indigo-500/20"></div>
                                <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-indigo-500 animate-spin"></div>
                                <Sparkles className="absolute inset-0 m-auto w-6 h-6 text-indigo-400 animate-pulse" />
                            </div>
                            <p className="text-gray-300 text-lg font-medium">Generando tu feed...</p>
                            <p className="text-gray-500 text-sm mt-1">Videos, noticias, gaming, música y más</p>
                        </div>
                    )}

                    {/* Error */}
                    {error && (
                        <div className="p-6 bg-red-500/10 border border-red-500/30 rounded-xl text-center">
                            <p className="text-red-300 mb-4">{error}</p>
                            <button onClick={loadFeed} className="px-6 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition">
                                Intentar de nuevo
                            </button>
                        </div>
                    )}

                    {/* Feed items — single column like TikTok/Twitter */}
                    {!isLoading && !error && filteredItems.length > 0 && (
                        <div className="space-y-4">
                            {filteredItems.map(item => (
                                <FeedCard key={item.id} item={item} />
                            ))}
                        </div>
                    )}

                    {/* Empty */}
                    {!isLoading && !error && filteredItems.length === 0 && (
                        <div className="text-center py-16">
                            <Globe className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                            <h3 className="text-lg font-bold text-gray-300 mb-2">Sin contenido en esta categoría</h3>
                            <button onClick={() => setFilterCategory("all")} className="text-indigo-400 hover:text-indigo-300 text-sm">
                                Ver todo el contenido →
                            </button>
                        </div>
                    )}

                    {/* Loading more */}
                    {isLoadingMore && (
                        <div className="flex justify-center py-6">
                            <div className="flex items-center gap-2 text-gray-500 text-sm">
                                <RefreshCw className="w-4 h-4 animate-spin" />
                                <span>Cargando más...</span>
                            </div>
                        </div>
                    )}

                    {/* End of feed */}
                    {!isLoading && !error && filteredItems.length > 0 && displayedCount >= allCount && (
                        <div className="text-center py-8 text-gray-600 text-sm">
                            Has visto todo 🎉 · {allCount} items
                        </div>
                    )}
                </div>
            )}

            {/* Scroll to top button */}
            {showScrollTop && (
                <button
                    onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                    className="fixed bottom-6 right-6 p-3 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-700 transition-all hover:scale-110 z-50"
                >
                    <ArrowUp className="w-5 h-5" />
                </button>
            )}
        </div>
    );
}

// Fire-and-forget: POST item category to increment relevanceWeight
function trackInterestClick(category: string): void {
    fetch("/api/user/interests/weight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: category, action: "click" }),
    }).catch(() => {});
}

// ====== FEED CARD COMPONENT ======
function FeedCard({ item }: { item: ContentItem }) {
    const [showEmbed, setShowEmbed] = useState(false);

    const formatDate = (dateStr: string) => {
        try {
            const date = new Date(dateStr);
            const now = new Date();
            const diffMs = now.getTime() - date.getTime();
            const diffMins = Math.floor(diffMs / 60000);
            const diffHours = Math.floor(diffMs / 3600000);
            const diffDays = Math.floor(diffMs / 86400000);

            if (diffMins < 60) return `hace ${diffMins}m`;
            if (diffHours < 24) return `hace ${diffHours}h`;
            if (diffDays < 7) return `hace ${diffDays}d`;
            return date.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' });
        } catch {
            return '';
        }
    };

    const formatNumber = (n?: number) => {
        if (!n) return '';
        if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
        if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
        return n.toString();
    };

    const getTypeIcon = () => {
        switch (item.type) {
            case 'video': return <Play className="w-4 h-4" />;
            case 'reddit': return <MessageSquare className="w-4 h-4" />;
            case 'game': return <Gamepad2 className="w-4 h-4" />;
            case 'fact': return <Lightbulb className="w-4 h-4" />;
            case 'recommendation': return <Target className="w-4 h-4" />;
            case 'article': return <Newspaper className="w-4 h-4" />;
            case 'community_post': return <Users className="w-4 h-4" />;
            case 'event': return <Calendar className="w-4 h-4" />;
            default: return <Globe className="w-4 h-4" />;
        }
    };

    const getTypeColor = () => {
        switch (item.type) {
            case 'video': return 'text-red-400 bg-red-500/10';
            case 'reddit': return 'text-orange-400 bg-orange-500/10';
            case 'game': return 'text-purple-400 bg-purple-500/10';
            case 'fact': return 'text-yellow-400 bg-yellow-500/10';
            case 'recommendation': return 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20';
            case 'article': return 'text-blue-400 bg-blue-500/10';
            case 'community_post': return 'text-violet-400 bg-violet-500/10';
            case 'event': return 'text-green-400 bg-green-500/10';
            default: return 'text-gray-400 bg-gray-500/10';
        }
    };

    const getTypeBadge = () => {
        switch (item.type) {
            case 'video': return 'Video';
            case 'reddit': return `r/${item.subreddit || 'popular'}`;
            case 'game': return 'Gaming';
            case 'fact': return 'Dato curioso';
            case 'recommendation': return '🎯 Descubre';
            case 'article': return 'Artículo';
            case 'community_post': return `👥 ${item.community || 'Comunidad'}`;
            case 'event': return '📅 Evento';
            default: return item.source;
        }
    };

    // Recommendation cards have special design
    if (item.type === 'recommendation') {
        return (
            <div className="relative overflow-hidden rounded-xl border border-emerald-500/30 bg-gradient-to-br from-emerald-900/20 to-teal-900/20 p-5 sm:p-6">
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full -translate-y-1/2 translate-x-1/2" />
                <div className="flex items-center gap-2 mb-3">
                    <div className="p-1.5 bg-emerald-500/20 rounded-lg">
                        <Target className="w-4 h-4 text-emerald-400" />
                    </div>
                    <span className="text-emerald-400 text-xs font-bold uppercase tracking-wider">Descubre algo nuevo</span>
                </div>
                <h3 className="text-white font-bold text-lg mb-2">{item.icon} {item.title}</h3>
                <p className="text-gray-300 text-sm mb-3">{item.description}</p>
                {item.reason && (
                    <p className="text-emerald-400/70 text-xs italic mb-3">💡 {item.reason}</p>
                )}
                <a href={item.url} target="_blank" rel="noopener noreferrer"
                    onClick={() => trackInterestClick(item.category)}
                    className="inline-flex items-center gap-1.5 text-sm text-emerald-400 hover:text-emerald-300 transition font-medium">
                    Explorar más <ExternalLink className="w-3.5 h-3.5" />
                </a>
            </div>
        );
    }

    // Fact cards
    if (item.type === 'fact') {
        return (
            <div className="rounded-xl border border-yellow-500/20 bg-gradient-to-br from-yellow-900/10 to-orange-900/10 p-5 sm:p-6">
                <div className="flex items-center gap-2 mb-3">
                    <Lightbulb className="w-4 h-4 text-yellow-400" />
                    <span className="text-yellow-400 text-xs font-bold uppercase tracking-wider">Dato curioso</span>
                </div>
                <h3 className="text-white font-bold text-lg mb-2">{item.icon} {item.title}</h3>
                <p className="text-gray-300 text-sm leading-relaxed">{item.description}</p>
                <div className="mt-3 text-gray-500 text-xs">{item.source}</div>
            </div>
        );
    }

    // Community post cards — glassmorphism blue/purple style
    if (item.type === 'community_post') {
        return (
            <Link href={item.url} className="block" onClick={() => trackInterestClick(item.category)}>
                <div className="relative overflow-hidden rounded-xl border border-violet-500/30 bg-gradient-to-br from-violet-900/20 via-indigo-900/15 to-blue-900/20 backdrop-blur-sm p-5 sm:p-6 hover:border-violet-400/40 hover:from-violet-900/30 hover:via-indigo-900/25 hover:to-blue-900/30 transition-all group">
                    <div className="absolute top-0 right-0 w-40 h-40 bg-violet-500/5 rounded-full -translate-y-1/2 translate-x-1/2" />
                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-indigo-500/5 rounded-full translate-y-1/2 -translate-x-1/2" />

                    {/* Header: community badge */}
                    <div className="flex items-center gap-2 mb-3">
                        <div className="p-1.5 bg-violet-500/20 rounded-lg">
                            <Users className="w-4 h-4 text-violet-400" />
                        </div>
                        <span className="text-violet-400 text-xs font-bold uppercase tracking-wider">{item.community || 'Comunidad'}</span>
                    </div>

                    {/* Title */}
                    <h3 className="text-white font-bold text-lg mb-2 group-hover:text-violet-300 transition-colors line-clamp-2">
                        {item.title}
                    </h3>

                    {/* Content preview */}
                    {item.description && (
                        <p className="text-gray-300/80 text-sm mb-4 line-clamp-3 leading-relaxed">
                            {item.description.slice(0, 150)}{item.description.length > 150 ? '...' : ''}
                        </p>
                    )}

                    {/* Footer: author, time, interactions */}
                    <div className="flex items-center justify-between text-xs text-gray-400">
                        <div className="flex items-center gap-2">
                            <span className="text-violet-400/80">@{item.author}</span>
                            <span className="text-gray-600">·</span>
                            <span>{formatDate(item.publishedAt)}</span>
                        </div>
                        <div className="flex items-center gap-3">
                            {(item.score ?? 0) > 0 && (
                                <span className="flex items-center gap-1 text-violet-400/70">
                                    <ArrowUp className="w-3 h-3" /> {formatNumber(item.score)}
                                </span>
                            )}
                            {(item.numComments ?? 0) > 0 && (
                                <span className="flex items-center gap-1 text-violet-400/70">
                                    <MessageSquare className="w-3 h-3" /> {formatNumber(item.numComments)}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </Link>
        );
    }

    // Event card — glassmorphism green accent
    if (item.type === 'event') {
        const formatEventDate = (dateStr?: string) => {
            if (!dateStr) return null;
            try {
                const d = new Date(dateStr);
                return d.toLocaleDateString('es-ES', {
                    weekday: 'short', day: 'numeric', month: 'short',
                }) + ' · ' + d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
            } catch {
                return null;
            }
        };
        const eventDate = formatEventDate(item.startDate);

        return (
            <a href={item.url} target="_blank" rel="noopener noreferrer" className="block"
                onClick={() => trackInterestClick(item.category)}>
                <div className="relative overflow-hidden rounded-xl border border-green-500/30 bg-gradient-to-br from-green-900/20 via-emerald-900/15 to-teal-900/20 backdrop-blur-sm p-5 sm:p-6 hover:border-green-400/40 hover:from-green-900/30 transition-all group">
                    <div className="absolute top-0 right-0 w-40 h-40 bg-green-500/5 rounded-full -translate-y-1/2 translate-x-1/2" />

                    {/* Badge */}
                    <div className="flex items-center gap-2 mb-3">
                        <div className="p-1.5 bg-green-500/20 rounded-lg">
                            <Calendar className="w-4 h-4 text-green-400" />
                        </div>
                        <span className="text-green-400 text-xs font-bold uppercase tracking-wider">Evento local</span>
                        <span className="ml-auto text-xs text-green-500/70">{item.source}</span>
                    </div>

                    {/* Title */}
                    <h3 className="text-white font-bold text-lg mb-2 group-hover:text-green-300 transition-colors line-clamp-2">
                        {item.title}
                    </h3>

                    {/* Description */}
                    {item.description && (
                        <p className="text-gray-300/80 text-sm mb-3 line-clamp-2 leading-relaxed">
                            {item.description}
                        </p>
                    )}

                    {/* Date + Location row */}
                    <div className="flex flex-wrap items-center gap-3 text-xs text-green-400/80">
                        {eventDate && (
                            <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {eventDate}
                            </span>
                        )}
                        {item.eventLocation && (
                            <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {item.eventLocation}
                            </span>
                        )}
                    </div>
                </div>
            </a>
        );
    }

    // Standard card (articles, videos, reddit, games)
    return (
        <div className="group rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/10 transition-all overflow-hidden">
            {/* Image/Thumbnail */}
            {(item.imageUrl || item.thumbnailUrl) && (
                <div className="relative aspect-video bg-gray-900 overflow-hidden cursor-pointer"
                    onClick={() => {
                        if (item.type === 'video' && item.embedUrl) {
                            setShowEmbed(!showEmbed);
                        } else {
                            trackInterestClick(item.category);
                            window.open(item.url, '_blank');
                        }
                    }}>
                    {showEmbed && item.embedUrl ? (
                        <iframe
                            src={item.embedUrl + '?autoplay=1'}
                            className="w-full h-full"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                        />
                    ) : (
                        <>
                            <img
                                src={item.thumbnailUrl || item.imageUrl || ''}
                                alt={item.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                            />
                            {/* Video play overlay */}
                            {item.type === 'video' && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition">
                                    <div className="w-14 h-14 bg-red-600 rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition">
                                        <Play className="w-7 h-7 text-white ml-1" fill="white" />
                                    </div>
                                </div>
                            )}
                            {/* Duration badge */}
                            {item.duration && (
                                <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-1.5 py-0.5 rounded">
                                    {item.duration}
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}

            {/* Content */}
            <div className="p-4 sm:p-5">
                {/* Type badge + source */}
                <div className="flex items-center gap-2 mb-2.5 flex-wrap">
                    <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getTypeColor()}`}>
                        {getTypeIcon()}
                        <span>{getTypeBadge()}</span>
                    </div>
                    {item.location && item.location.distance === 0 && (
                        <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-green-500/10 text-green-400">
                            <MapPin className="w-3 h-3" />
                            <span>Local</span>
                        </div>
                    )}
                </div>

                {/* Title */}
                <a href={item.url} target="_blank" rel="noopener noreferrer"
                    onClick={() => trackInterestClick(item.category)}>
                    <h3 className="text-white font-semibold text-base sm:text-lg mb-1.5 line-clamp-2 hover:text-indigo-400 transition cursor-pointer">
                        {item.title}
                    </h3>
                </a>

                {/* Description */}
                {item.description && (
                    <p className="text-gray-400 text-sm mb-3 line-clamp-2">
                        {item.description}
                    </p>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between text-xs text-gray-500">
                    <div className="flex items-center gap-3">
                        <span>{item.source}</span>
                        <span>{formatDate(item.publishedAt)}</span>
                    </div>
                    <div className="flex items-center gap-3">
                        {item.score !== undefined && item.score > 0 && (
                            <span className="flex items-center gap-1">
                                <ArrowUp className="w-3 h-3" /> {formatNumber(item.score)}
                            </span>
                        )}
                        {item.numComments !== undefined && item.numComments > 0 && (
                            <span className="flex items-center gap-1">
                                <MessageSquare className="w-3 h-3" /> {formatNumber(item.numComments)}
                            </span>
                        )}
                        {item.interactionCount !== undefined && item.interactionCount > 0 && item.type === 'video' && (
                            <span>{formatNumber(item.interactionCount)} views</span>
                        )}
                        <a href={item.url} target="_blank" rel="noopener noreferrer" className="hover:text-indigo-400 transition">
                            <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}
