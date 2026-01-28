"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { TrendingUp, Heart, MapPin, Loader2, Users, MessageCircle, ChevronUp } from "lucide-react";
import Link from "next/link";
import GlobalHeader from "@/components/GlobalHeader";

type Post = {
    id: string;
    title: string;
    content: string;
    upvotes: number;
    downvotes: number;
    commentCount: number;
    createdAt: string;
    communityName: string;
    communitySlug: string;
    category: string;
    author: {
        username: string;
        avatarUrl?: string;
    };
};

export default function DiscoverPage() {
    const { user } = useUser();
    const [posts, setPosts] = useState<Post[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadDiscoverFeed();
    }, []);

    const loadDiscoverFeed = async () => {
        try {
            const res = await fetch('/api/discover');
            const data = await res.json();
            setPosts(data.posts || []);
        } catch (error) {
            console.error('Error loading discover feed:', error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
            {/* Global Header */}
            <GlobalHeader />

            {/* Main Content */}
            <div className="container mx-auto px-4 py-8 max-w-4xl">
                {/* Hero */}
                <div className="mb-8 text-center">
                    <div className="flex items-center justify-center gap-3 mb-4">
                        <TrendingUp className="w-8 h-8 text-indigo-400" />
                        <h1 className="text-4xl font-bold text-white">Descubrir</h1>
                    </div>
                    <p className="text-gray-400 text-lg">
                        Posts populares basados en tus intereses
                    </p>
                </div>

                {/* Posts Feed */}
                {isLoading ? (
                    <div className="text-center py-20">
                        <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mx-auto mb-4" />
                        <p className="text-gray-400">Cargando posts...</p>
                    </div>
                ) : posts.length === 0 ? (
                    <div className="text-center py-20 bg-white/5 rounded-xl">
                        <TrendingUp className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-gray-300 mb-2">
                            No hay posts por ahora
                        </h3>
                        <p className="text-gray-500">
                            Únete a comunidades para ver contenido aquí
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {posts.map((post) => (
                            <PostCard key={post.id} post={post} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

function PostCard({ post }: { post: Post }) {
    const score = post.upvotes - post.downvotes;

    return (
        <Link
            href={`/communities/${post.communitySlug}`}
            className="block bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 hover:border-indigo-500/50 transition p-4"
        >
            <div className="flex gap-4">
                {/* Vote Score */}
                <div className="flex flex-col items-center gap-1">
                    <Heart className={`w-5 h-5 ${score > 0 ? 'text-indigo-400' : 'text-gray-500'}`} />
                    <span className={`font-bold text-sm ${score > 0 ? 'text-indigo-400' : score < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                        {score}
                    </span>
                </div>

                {/* Post Content */}
                <div className="flex-1">
                    {/* Community Badge */}
                    <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 text-xs rounded capitalize">
                            {post.category}
                        </span>
                        <span className="text-gray-500 text-sm">
                            en <span className="text-indigo-400 font-semibold">{post.communityName}</span>
                        </span>
                    </div>

                    {/* Title */}
                    <h3 className="text-white font-bold text-lg mb-2 hover:text-indigo-400 transition">
                        {post.title}
                    </h3>

                    {/* Content Preview */}
                    {post.content && (
                        <p className="text-gray-400 text-sm mb-3 line-clamp-2">
                            {post.content}
                        </p>
                    )}

                    {/* Meta */}
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span>{post.author.username}</span>
                        <span>•</span>
                        <span>{new Date(post.createdAt).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })}</span>
                        <span>•</span>
                        <span>{post.commentCount} comentarios</span>
                    </div>
                </div>
            </div>
        </Link>
    );
}
