"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sparkles, Loader2 } from "lucide-react";

type SimilarUser = {
    id: string;
    username: string;
    avatarUrl?: string;
    matchCount: number;
};

export default function SimilarUsers({ username }: { username: string }) {
    const [similar, setSimilar] = useState<SimilarUser[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchSimilar = async () => {
            try {
                const res = await fetch(`/api/users/${username}/similar`);
                const data = await res.json();
                if (data.similarUsers) {
                    setSimilar(data.similarUsers);
                }
            } catch (error) {
                console.error("Error fetching similar users:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchSimilar();
    }, [username]);

    if (isLoading) return null;
    if (similar.length === 0) return null;

    return (
        <div className="bg-gray-800/50 rounded-lg p-6 mb-8 border border-white/5">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                Personas Similares
            </h2>
            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                {similar.map((user) => (
                    <Link
                        key={user.id}
                        href={`/users/${user.username}`}
                        className="flex-shrink-0 w-32 group"
                    >
                        <div className="bg-gray-800 p-3 rounded-lg border border-white/5 group-hover:border-indigo-500/50 transition text-center h-full">
                            {user.avatarUrl ? (
                                <img
                                    src={user.avatarUrl}
                                    alt={user.username}
                                    className="w-20 h-20 rounded-full mx-auto mb-3 object-cover"
                                />
                            ) : (
                                <div className="w-20 h-20 bg-indigo-600 rounded-full mx-auto mb-3 flex items-center justify-center text-white text-2xl font-bold">
                                    {user.username[0].toUpperCase()}
                                </div>
                            )}
                            <p className="text-white font-medium truncate text-sm">@{user.username}</p>
                            <p className="text-xs text-indigo-400 mt-1">
                                {user.matchCount} intereses en común
                            </p>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}
