"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

type Community = {
    id: string;
    name: string;
    slug: string;
    description: string;
    iconUrl?: string;
    memberCount: number;
    postCount: number;
    category: string;
};

export default function EditCommunityModal({
    community,
    onClose,
    onSaved,
}: {
    community: Community;
    onClose: () => void;
    onSaved: () => void;
}) {
    const [formData, setFormData] = useState({
        name: community.name,
        description: community.description,
        iconUrl: community.iconUrl || '',
        category: community.category,
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    const categories = [
        'gaming',
        'sports',
        'music',
        'food',
        'tech',
        'art',
        'fitness',
        'travel',
        'other'
    ];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!formData.name.trim()) {
            setError('El nombre es obligatorio');
            return;
        }

        setIsSubmitting(true);

        try {
            const res = await fetch(`/api/communities/${community.slug}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            const data = await res.json();

            if (res.ok) {
                onSaved();
                onClose();
            } else {
                setError(data.error || 'Error al actualizar comunidad');
            }
        } catch (error) {
            console.error('Error updating community:', error);
            setError('Error de conexión');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-gray-900 rounded-xl max-w-2xl w-full p-6 my-8">
                <h2 className="text-2xl font-bold text-white mb-6">Editar Comunidad</h2>

                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Name */}
                    <div>
                        <label className="block text-white font-semibold mb-2">
                            Nombre de la comunidad *
                        </label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="Ej: Gamers de Madrid"
                            maxLength={50}
                            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-white font-semibold mb-2">
                            Descripción
                        </label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Describe tu comunidad..."
                            rows={4}
                            maxLength={300}
                            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>

                    {/* Icon URL */}
                    <div>
                        <label className="block text-white font-semibold mb-2">
                            URL del icono
                        </label>
                        <input
                            type="url"
                            value={formData.iconUrl}
                            onChange={(e) => setFormData({ ...formData, iconUrl: e.target.value })}
                            placeholder="https://ejemplo.com/icon.png"
                            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        {formData.iconUrl && (
                            <div className="mt-3">
                                <img
                                    src={formData.iconUrl}
                                    alt="Preview"
                                    className="w-20 h-20 rounded-lg object-cover"
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).style.display = 'none';
                                    }}
                                />
                            </div>
                        )}
                    </div>

                    {/* Category */}
                    <div>
                        <label className="block text-white font-semibold mb-2">
                            Categoría *
                        </label>
                        <select
                            value={formData.category}
                            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                            {categories.map(cat => (
                                <option key={cat} value={cat} className="bg-gray-800">
                                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="p-4 bg-red-500/20 border border-red-500 rounded-lg text-red-200 text-sm">
                            {error}
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3 pt-4">
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex-1 px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isSubmitting && <Loader2 className="w-5 h-5 animate-spin" />}
                            {isSubmitting ? 'Guardando...' : 'Guardar Cambios'}
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-3 bg-gray-700 text-white font-semibold rounded-lg hover:bg-gray-600 transition"
                        >
                            Cancelar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
