"use client";

import { useState } from "react";
import { TrendingUp, Users } from "lucide-react";
import GlobalHeader from "@/components/GlobalHeader";
import DiscoverPosts from "./components/DiscoverPosts";
import DiscoverPeople from "./components/DiscoverPeople";

export default function UnifiedDiscoverPage() {
    const [activeTab, setActiveTab] = useState<'posts' | 'people'>('posts');

    return (
        <div className="min-h-screen bg-gray-900">
            <GlobalHeader />

            {/* Submenu / Tabs */}
            <div className="sticky top-16 z-20 bg-gray-900/95 backdrop-blur-lg border-b border-white/10">
                <div className="container mx-auto px-4">
                    <div className="flex justify-center">
                        <div className="flex gap-1 p-1 bg-gray-800 rounded-xl my-4">
                            <button
                                onClick={() => setActiveTab('posts')}
                                className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-semibold transition-all ${activeTab === 'posts'
                                    ? 'bg-indigo-600 text-white shadow-lg'
                                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                                    }`}
                            >
                                <TrendingUp className="w-4 h-4" />
                                Posts y Comunidades
                            </button>
                            <button
                                onClick={() => setActiveTab('people')}
                                className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-semibold transition-all ${activeTab === 'people'
                                    ? 'bg-indigo-600 text-white shadow-lg'
                                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                                    }`}
                            >
                                <Users className="w-4 h-4" />
                                Personas
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="container mx-auto px-4 py-8">
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {activeTab === 'posts' ? <DiscoverPosts /> : <DiscoverPeople />}
                </div>
            </div>
        </div>
    );
}
