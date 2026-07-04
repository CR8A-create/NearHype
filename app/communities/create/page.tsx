"use client";

import { useState } from "react";
import { ArrowLeft, Users, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const CATEGORIES = [
    { id: "gaming", name: "Gaming", icon: "🎮" },
    { id: "music", name: "Música", icon: "🎵" },
    { id: "tech", name: "Tecnología", icon: "💻" },
    { id: "food", name: "Gastronomía", icon: "🍕" },
    { id: "sports", name: "Deportes", icon: "⚽" },
    { id: "culture", name: "Cultura", icon: "🎭" },
    { id: "travel", name: "Viajes", icon: "✈️" },
    { id: "other", name: "Otro", icon: "📌" },
];

export default function CreateCommunityPage() {
    const router = useRouter();
    const [isCreating, setIsCreating] = useState(false);
    const [error, setError] = useState("");

    const [formData, setFormData] = useState({
        name: "",
        description: "",
        category: "",
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.name || !formData.category) {
            setError("El nombre y la categoría son obligatorios");
            return;
        }

        setIsCreating(true);
        setError("");

        try {
            const res = await fetch('/api/communities', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Error al crear la comunidad');
            }

            // Redirect to the new community
            router.push(`/communities/${data.community.slug}`);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al crear la comunidad');
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
            {/* Header */}
            <header className="bg-gray-900/50 backdrop-blur-lg border-b border-white/10">
                <div className="container mx-auto px-4 py-4">
                    <div className="flex items-center gap-4">
                        <Link href="/communities" className="text-gray-400 hover:text-white">
                            <ArrowLeft className="w-6 h-6" />
                        </Link>
                        <h1 className="text-xl font-bold text-white">Crear Comunidad</h1>
                    </div>
                </div>
            </header>

            {/* Form */}
            <div className="container mx-auto px-4 py-8 max-w-2xl">
                <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-8">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-16 h-16 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center">
                            <Users className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-white">Nueva Comunidad</h2>
                            <p className="text-gray-400">Crea un espacio para compartir con otras personas</p>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Name */}
                        <div>
                            <label className="block text-white font-semibold mb-2">
                                Nombre de la comunidad *
                            </label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="Ej: Gamers Madrid"
                                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                maxLength={100}
                            />
                            <p className="text-sm text-gray-500 mt-1">{formData.name.length}/100 caracteres</p>
                        </div>

                        {/* Description */}
                        <div>
                            <label className="block text-white font-semibold mb-2">
                                Descripción
                            </label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Describe de qué trata tu comunidad..."
                                rows={4}
                                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                                maxLength={500}
                            />
                            <p className="text-sm text-gray-500 mt-1">{formData.description.length}/500 caracteres</p>
                        </div>

                        {/* Category */}
                        <div>
                            <label className="block text-white font-semibold mb-3">
                                Categoría *
                            </label>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {CATEGORIES.map(cat => (
                                    <button
                                        key={cat.id}
                                        type="button"
                                        onClick={() => setFormData({ ...formData, category: cat.id })}
                                        className={`p-4 rounded-lg border-2 transition text-center ${formData.category === cat.id
                                                ? 'border-indigo-500 bg-indigo-500/20 text-white'
                                                : 'border-white/10 bg-white/5 text-gray-400 hover:border-white/30'
                                            }`}
                                    >
                                        <div className="text-3xl mb-1">{cat.icon}</div>
                                        <div className="text-sm font-medium">{cat.name}</div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Error */}
                        {error && (
                            <div className="p-4 bg-red-500/20 border border-red-500 rounded-lg text-red-200 text-sm">
                                {error}
                            </div>
                        )}

                        {/* Submit */}
                        <div className="flex gap-4">
                            <button
                                type="submit"
                                disabled={isCreating || !formData.name || !formData.category}
                                className="flex-1 px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isCreating && <Loader2 className="w-5 h-5 animate-spin" />}
                                {isCreating ? 'Creando...' : 'Crear Comunidad'}
                            </button>

                            <Link
                                href="/communities"
                                className="px-6 py-3 bg-gray-700 text-white font-semibold rounded-lg hover:bg-gray-600 transition flex items-center justify-center"
                            >
                                Cancelar
                            </Link>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
