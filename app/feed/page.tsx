"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { MapPin, Sparkles, RefreshCw, Filter, TrendingUp, Calendar, Users, ExternalLink } from "lucide-react";
import Link from "next/link";
import GlobalHeader from "@/components/GlobalHeader";

type ContentItem = {
    id: string;
    title: string;
    description: string;
    url: string;
    source: string;
    publishedAt: string;
    location?: {
        city: string;
        distance: number;
    };
    relevanceScore: number;
    category: string;
    imageUrl?: string;
};

type FeedResponse = {
    items: ContentItem[];
    generatedAt: string;
    userLocation: string;
    totalSources: number;
};

export default function FeedPage() {
    const { user } = useUser();
    const router = useRouter();
    const [feed, setFeed] = useState<FeedResponse | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState("");
    const [needsOnboarding, setNeedsOnboarding] = useState(false);
    const [filterCategory, setFilterCategory] = useState<string>("all");
    const [displayedCount, setDisplayedCount] = useState(20);
    const [isLoadingMore, setIsLoadingMore] = useState(false);

    // Cargar feed al montar
    useEffect(() => {
        loadFeed();
    }, []);

    // Infinite scroll: detectar cuando el usuario llega al final
    useEffect(() => {
        const handleScroll = () => {
            if (isLoadingMore) return;

            const scrollPosition = window.innerHeight + window.scrollY;
            const pageHeight = document.documentElement.scrollHeight;

            // Si está a 300px del final, cargar más
            if (scrollPosition >= pageHeight - 300) {
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
                if (res.status === 401) {
                    // Not authenticated yet, wait briefly
                    return;
                }
                throw new Error('Error al cargar el feed');
            }

            const data = await res.json();

            // If user hasn't completed onboarding, redirect them
            if (data.needsOnboarding) {
                setNeedsOnboarding(true);
                setIsLoading(false);
                return;
            }

            setFeed(data);
            setDisplayedCount(20);
        } catch (err) {
            console.error('Error loading feed:', err);
            setError("No pudimos cargar tu feed. Por favor intenta de nuevo.");
        } finally {
            setIsLoading(false);
        }
    };

    const refreshFeed = async () => {
        setIsRefreshing(true);
        await loadFeed();
        setIsRefreshing(false);
    };

    const loadMore = () => {
        if (!feed || isLoadingMore) return;

        const filtered = feed.items.filter(item =>
            filterCategory === "all" || item.category === filterCategory
        );

        if (displayedCount >= filtered.length) return; // Ya mostramos todo

        setIsLoadingMore(true);
        setTimeout(() => {
            setDisplayedCount(prev => Math.min(prev + 10, filtered.length));
            setIsLoadingMore(false);
        }, 300); // Pequeño delay para simular carga
    };

    // Filtrar items por categoría
    const allFilteredItems = feed?.items.filter(item =>
        filterCategory === "all" || item.category === filterCategory
    ) || [];

    // Mostrar solo los primeros N items
    const filteredItems = allFilteredItems.slice(0, displayedCount);

    const categories = ["all", "news", "gaming", "tech", "music", "sports", "community", "events"];

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
            <GlobalHeader />

            {/* Onboarding prompt */}
            {needsOnboarding && (
                <div className="container mx-auto px-4 py-16 flex items-center justify-center">
                    <div className="max-w-md w-full text-center space-y-6 bg-white/5 border border-white/10 rounded-2xl p-10">
                        <Sparkles className="w-14 h-14 text-indigo-400 mx-auto" />
                        <h2 className="text-2xl font-bold text-white">Configura tu perfil</h2>
                        <p className="text-gray-400">
                            Para ver tu feed personalizado necesitas seleccionar tus intereses y ubicación.
                            Solo toma 2 minutos.
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
                <div className="container mx-auto px-4 py-8">
                    {/* Info del feed */}
                    {feed && (
                        <div className="mb-8 p-6 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10">
                            <div className="flex items-center justify-between flex-wrap gap-4">
                                <div className="flex items-center gap-6">
                                    <div className="flex items-center gap-2 text-gray-300">
                                        <MapPin className="w-5 h-5 text-indigo-400" />
                                        <span className="font-semibold">{feed.userLocation}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-gray-300">
                                        <Sparkles className="w-5 h-5 text-purple-400" />
                                        <span>{feed.totalSources} fuentes consultadas</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-gray-300">
                                        <TrendingUp className="w-5 h-5 text-green-400" />
                                        <span>{filteredItems.length} resultados</span>
                                    </div>
                                </div>
                                <div className="text-sm text-gray-400">
                                    Última actualización: {new Date(feed.generatedAt).toLocaleTimeString('es-ES')}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Filtros de categoría */}
                    <div className="mb-6 flex gap-3 overflow-x-auto pb-2">
                        {categories.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setFilterCategory(cat)}
                                className={`px-4 py-2 rounded-full whitespace-nowrap transition ${filterCategory === cat
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-white/5 text-gray-300 hover:bg-white/10'
                                    }`}
                            >
                                {cat === "all" ? "Todo" : cat.charAt(0).toUpperCase() + cat.slice(1)}
                            </button>
                        ))}
                    </div>

                    {/* Loading state */}
                    {isLoading && (
                        <div className="flex flex-col items-center justify-center py-20">
                            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-500 mb-4"></div>
                            <p className="text-gray-300 text-lg">Generando tu feed personalizado con IA...</p>
                            <p className="text-gray-500 text-sm mt-2">Esto puede tomar unos segundos</p>
                        </div>
                    )}

                    {/* Error state */}
                    {error && (
                        <div className="p-6 bg-red-500/20 border border-red-500 rounded-xl text-center">
                            <p className="text-red-200 mb-4">{error}</p>
                            <button
                                onClick={loadFeed}
                                className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                            >
                                Intentar de nuevo
                            </button>
                        </div>
                    )}

                    {/* Feed Grid */}
                    {!isLoading && !error && filteredItems.length > 0 && (
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredItems.map(item => (
                                <FeedCard key={item.id} item={item} />
                            ))}
                        </div>
                    )}

                    {/* Empty state */}
                    {!isLoading && !error && filteredItems.length === 0 && (
                        <div className="text-center py-20">
                            <Sparkles className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                            <h3 className="text-xl font-bold text-gray-300 mb-2">
                                No encontramos contenido para esta categoría
                            </h3>
                            <p className="text-gray-500 mb-6">
                                Intenta con otra categoría o actualiza tus intereses
                            </p>
                            <Link
                                href="/settings"
                                className="inline-block px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
                            >
                                Editar Intereses
                            </Link>
                        </div>
                    )}

                    {/* Loading More */}
                    {!isLoading && !error && isLoadingMore && (
                        <div className="flex justify-center py-8">
                            <div className="flex items-center gap-3 text-gray-400">
                                <RefreshCw className="w-5 h-5 animate-spin" />
                                <span>Cargando más contenido...</span>
                            </div>
                        </div>
                    )}

                    {/* End of results */}
                    {!isLoading && !error && filteredItems.length > 0 && displayedCount >= allFilteredItems.length && (
                        <div className="text-center py-8 text-gray-500">
                            <p>Has visto todo el contenido disponible 🎉</p>
                            <p className="text-sm mt-2">Total: {allFilteredItems.length} items</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// Componente para cada card del feed
function FeedCard({ item }: { item: ContentItem }) {
    const getIcon = (category: string) => {
        switch (category) {
            case "events": return <Calendar className="w-5 h-5" />;
            case "community": return <Users className="w-5 h-5" />;
            case "news": return <TrendingUp className="w-5 h-5" />;
            case "gaming": return <Sparkles className="w-5 h-5 text-purple-400" />;
            case "music": return <Calendar className="w-5 h-5 text-pink-400" />;
            case "tech": return <Sparkles className="w-5 h-5 text-blue-400" />;
            case "sports": return <TrendingUp className="w-5 h-5 text-green-400" />;
            default: return <Sparkles className="w-5 h-5" />;
        }
    };

    const getDistanceBadge = (distance?: number) => {
        if (!distance) return null;

        let color = "bg-green-500";
        let label = "Muy cerca";

        if (distance > 50) {
            color = "bg-yellow-500";
            label = "Región";
        } else if (distance > 200) {
            color = "bg-orange-500";
            label = "Nacional";
        } else if (distance > 1000) {
            color = "bg-red-500";
            label = "Global";
        }

        return (
            <div className={`${color} text-white text-xs px-3 py-1 rounded-full flex items-center gap-1`}>
                <MapPin className="w-3 h-3" />
                {distance < 1000 ? `${Math.round(distance)}km` : label}
            </div>
        );
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

        if (diffHours < 1) return "Hace menos de 1 hora";
        if (diffHours < 24) return `Hace ${diffHours} horas`;
        if (diffHours < 48) return "Ayer";
        return date.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' });
    };

    return (
        <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group block bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 hover:border-indigo-500 transition-all hover:scale-105 overflow-hidden"
        >
            {/* Imagen (si existe) */}
            {item.imageUrl && (
                <div className="aspect-video bg-gray-800 overflow-hidden">
                    <img
                        src={item.imageUrl}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                </div>
            )}

            <div className="p-5">
                {/* Header con badges */}
                <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                    <div className="flex items- center gap-2 text-indigo-400">
                        {getIcon(item.category)}
                        <span className="text-xs uppercase font-semibold">{item.category}</span>
                    </div>
                    {item.location && (
                        <div className={`${item.location.distance === 0 ? 'bg-green-500' :
                            item.location.distance < 100 ? 'bg-yellow-500' :
                                item.location.distance < 500 ? 'bg-orange-500' :
                                    'bg-gray-500'
                            } text-white text-xs px-3 py-1 rounded-full flex items-center gap-1`}>
                            <MapPin className="w-3 h-3" />
                            {item.location.city}
                        </div>
                    )}
                </div>

                {/* Título */}
                <h3 className="text-white font-bold text-lg mb-2 line-clamp-2 group-hover:text-indigo-400 transition">
                    {item.title}
                </h3>

                {/* Descripción */}
                <p className="text-gray-400 text-sm mb-4 line-clamp-3">
                    {item.description}
                </p>

                {/* Footer */}
                <div className="flex items-center justify-between pt-3 border-t border-white/10">
                    <div className="text-xs text-gray-500">
                        {item.source} • {formatDate(item.publishedAt)}
                    </div>
                    <ExternalLink className="w-4 h-4 text-gray-500 group-hover:text-indigo-400 transition" />
                </div>
            </div>
        </a>
    );
}
