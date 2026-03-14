"use client";

import { useEffect, useState } from "react";
import { MapPin, Users, ExternalLink, Search, Plus, Loader2 } from "lucide-react";
import Link from "next/link";
import GlobalHeader from "@/components/GlobalHeader";

type Community = {
    id: string;
    name: string;
    slug: string;
    description: string;
    iconUrl?: string;
    category: string;
    memberCount: number;
    postCount: number;
    createdAt: string;
};

export default function CommunitiesPage() {
    const [communities, setCommunities] = useState<Community[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("all");

    useEffect(() => {
        loadCommunities();
    }, []);

    const loadCommunities = async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/communities');
            const data = await res.json();
            setCommunities(data.communities || []);
        } catch (error) {
            console.error('Error loading communities:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const filteredCommunities = communities.filter(community => {
        const matchesSearch = community.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            community.description?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = selectedCategory === "all" || community.category === selectedCategory;

        return matchesSearch && matchesCategory;
    });

    const categories = ["all", "gaming", "music", "tech", "food", "culture", "sports"];

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
            {/* Global Header */}
            <GlobalHeader />

            <div className="container mx-auto px-4 py-8">
                {/* Hero */}
                <div className="text-center mb-12">
                    <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 flex items-center justify-center gap-3">
                        <Users className="w-10 h-10 text-indigo-400" />
                        Comunidades
                    </h1>
                    <p className="text-gray-400 text-lg max-w-2xl mx-auto mb-6">
                        Únete a comunidades para compartir y descubrir contenido sobre tus intereses
                    </p>
                    <Link
                        href="/communities/create"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition"
                    >
                        <Plus className="w-5 h-5" />
                        Crear Comunidad
                    </Link>
                </div>

                {/* Barra de búsqueda */}
                <div className="mb-8 max-w-4xl mx-auto">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Buscar comunidades..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-4 py-4 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                </div>

                {/* Filtros de categoría */}
                <div className="mb-8 flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                    {categories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={`px-4 py-2 rounded-full capitalize whitespace-nowrap transition ${selectedCategory === cat
                                ? 'bg-indigo-600 text-white'
                                : 'bg-white/5 text-gray-300 hover:bg-white/10'
                                }`}
                        >
                            {cat === "all" ? "Todas" : cat}
                        </button>
                    ))}
                </div>

                {/* Loading */}
                {isLoading && (
                    <div className="flex justify-center py-20">
                        <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
                    </div>
                )}

                {/* Resultados */}
                {!isLoading && (
                    <div className="mb-6 text-center">
                        <p className="text-gray-400">
                            {filteredCommunities.length} {filteredCommunities.length === 1 ? 'comunidad' : 'comunidades'}
                        </p>
                    </div>
                )}

                {/* Grid de comunidades */}
                {!isLoading && filteredCommunities.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
                        {filteredCommunities.map(community => (
                            <CommunityCard key={community.id} community={community} />
                        ))}
                    </div>
                )}

                {/* Empty state */}
                {!isLoading && filteredCommunities.length === 0 && (
                    <div className="text-center py-20">
                        <Users className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-gray-300 mb-2">
                            {communities.length === 0 ? 'No hay comunidades aún' : 'No se encontraron comunidades'}
                        </h3>
                        <p className="text-gray-500 mb-6">
                            {communities.length === 0
                                ? '¡Sé el primero en crear una!'
                                : 'Prueba con otros filtros o términos de búsqueda'
                            }
                        </p>
                        <Link
                            href="/communities/create"
                            className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
                        >
                            <Plus className="w-5 h-5" />
                            Crear Primera Comunidad
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}

function CommunityCard({ community }: { community: Community }) {
    return (
        <Link
            href={`/communities/${community.slug}`}
            className="group block bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 hover:border-indigo-500 transition-all hover:scale-105 p-6"
        >
            {/* Icon */}
            {community.iconUrl ? (
                <div className="w-16 h-16 rounded-lg overflow-hidden mb-4">
                    <img src={community.iconUrl} alt={community.name} className="w-full h-full object-cover" />
                </div>
            ) : (
                <div className="w-16 h-16 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center mb-4">
                    <Users className="w-8 h-8 text-white" />
                </div>
            )}

            {/* Name */}
            <h3 className="text-white font-bold text-xl mb-2 group-hover:text-indigo-400 transition">
                {community.name}
            </h3>

            {/* Description */}
            {community.description && (
                <p className="text-gray-400 text-sm mb-4 line-clamp-2">
                    {community.description}
                </p>
            )}

            {/* Stats */}
            <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                <div className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    {community.memberCount} {community.memberCount === 1 ? 'miembro' : 'miembros'}
                </div>
                <div>
                    {community.postCount} posts
                </div>
            </div>

            {/* Category */}
            <div>
                <span className="inline-block px-3 py-1 bg-indigo-500/20 text-indigo-300 text-xs rounded-full capitalize">
                    {community.category}
                </span>
            </div>
        </Link>
    );
}
