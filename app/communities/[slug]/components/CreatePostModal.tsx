"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { uploadFiles } from "@/lib/uploadthing";
import ImageUpload from "@/components/ImageUpload";

type Post = {
    id: string;
    title: string;
    content: string;
    contentType: string;
    mediaUrl?: string;
    linkUrl?: string;
    upvotes: number;
    downvotes: number;
    commentCount: number;
    createdAt: string;
    userId: string;
    author: {
        username: string;
        avatarUrl?: string;
    };
};

export default function CreatePostModal({
    communitySlug,
    onClose,
    onPostCreated
}: {
    communitySlug: string;
    onClose: () => void;
    onPostCreated: (post: Post) => void;
}) {
    const [postType, setPostType] = useState<'text' | 'image' | 'link'>('text');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        content: '',
        linkUrl: '',
        mediaUrl: '',
    });

    const handlePaste = async (e: React.ClipboardEvent) => {
        const items = e.clipboardData?.items;
        if (!items) return;

        for (const item of items) {
            if (item.type.indexOf('image') === 0) {
                e.preventDefault();

                const file = item.getAsFile();
                if (!file) return;

                setPostType('image');
                setIsUploading(true);
                setError('');

                try {
                    const res = await uploadFiles("postImage", {
                        files: [file],
                    });

                    if (res && res[0]) {
                        setFormData(prev => ({ ...prev, mediaUrl: res[0].url }));
                    }
                } catch (err) {
                    console.error("Error uploading pasted image:", err);
                    setError("Error al subir la imagen pegada");
                } finally {
                    setIsUploading(false);
                }
                break;
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.title.trim()) {
            setError('El título es obligatorio');
            return;
        }

        if (postType === 'link' && !formData.linkUrl.trim()) {
            setError('Debes proporcionar una URL');
            return;
        }

        setIsSubmitting(true);
        setError('');

        try {
            const res = await fetch(`/api/communities/${communitySlug}/posts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: formData.title,
                    content: formData.content,
                    contentType: postType,
                    linkUrl: postType === 'link' ? formData.linkUrl : null,
                    mediaUrl: postType === 'image' ? formData.mediaUrl : null,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Error al crear el post');
            }

            const newPost: Post = {
                ...data.post,
                author: {
                    username: 'Tú',
                    avatarUrl: undefined,
                },
            };

            onPostCreated(newPost);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-gray-900 rounded-xl border border-white/10 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="border-b border-white/10 p-6 flex items-center justify-between sticky top-0 bg-gray-900">
                    <h2 className="text-2xl font-bold text-white">Crear Post</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white transition"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Post Type Selector */}
                    <div>
                        <label className="block text-white font-semibold mb-3">Tipo de post</label>
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={() => setPostType('text')}
                                className={`flex-1 p-4 rounded-lg border-2 transition ${postType === 'text'
                                    ? 'border-indigo-500 bg-indigo-500/20 text-white'
                                    : 'border-white/10 bg-white/5 text-gray-400 hover:border-white/30'
                                    }`}
                            >
                                <div className="text-2xl mb-1">📝</div>
                                <div className="text-sm font-medium">Texto</div>
                            </button>
                            <button
                                type="button"
                                onClick={() => setPostType('image')}
                                className={`flex-1 p-4 rounded-lg border-2 transition ${postType === 'image'
                                    ? 'border-indigo-500 bg-indigo-500/20 text-white'
                                    : 'border-white/10 bg-white/5 text-gray-400 hover:border-white/30'
                                    }`}
                            >
                                <div className="text-2xl mb-1">🖼️</div>
                                <div className="text-sm font-medium">Imagen</div>
                            </button>
                            <button
                                type="button"
                                onClick={() => setPostType('link')}
                                className={`flex-1 p-4 rounded-lg border-2 transition ${postType === 'link'
                                    ? 'border-indigo-500 bg-indigo-500/20 text-white'
                                    : 'border-white/10 bg-white/5 text-gray-400 hover:border-white/30'
                                    }`}
                            >
                                <div className="text-2xl mb-1">🔗</div>
                                <div className="text-sm font-medium">Link</div>
                            </button>
                        </div>
                    </div>

                    {/* Title */}
                    <div>
                        <label className="block text-white font-semibold mb-2">
                            Título *
                        </label>
                        <input
                            type="text"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            placeholder="Escribe un título llamativo..."
                            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            maxLength={300}
                        />
                        <p className="text-sm text-gray-500 mt-1">{formData.title.length}/300</p>
                    </div>

                    {/* Content (for text and image posts) */}
                    {(postType === 'text' || postType === 'image') && (
                        <div>
                            <label className="block text-white font-semibold mb-2">
                                {postType === 'image' ? 'Descripción' : 'Contenido'}
                            </label>
                            <textarea
                                value={formData.content}
                                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                                onPaste={handlePaste}
                                placeholder={postType === 'image' ? "Describe tu imagen... (o pega una imagen aquí)" : "Escribe tu post aquí... (puedes pegar imágenes)"}
                                rows={postType === 'image' ? 4 : 8}
                                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                                maxLength={5000}
                            />
                            <p className="text-sm text-gray-500 mt-1 flex justify-between">
                                <span>{formData.content.length}/5000</span>
                                {isUploading && <span className="text-indigo-400 animate-pulse">Subiendo imagen pegada...</span>}
                            </p>
                        </div>
                    )}

                    {/* Image Upload (for image posts) */}
                    {postType === 'image' && (
                        <div>
                            <label className="block text-white font-semibold mb-2">
                                Subir Imagen
                            </label>
                            <ImageUpload
                                endpoint="postImage"
                                onUploadComplete={(url: string) => setFormData({ ...formData, mediaUrl: url })}
                                onUploadError={(err: string) => setError(err)}
                                maxSizeMB={4}
                            />
                            {formData.mediaUrl && (
                                <div className="mt-3 relative">
                                    <img
                                        src={formData.mediaUrl}
                                        alt="Preview"
                                        className="rounded-lg max-h-64 object-cover w-full"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, mediaUrl: '' })}
                                        className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Link URL (for link posts) */}
                    {postType === 'link' && (
                        <div>
                            <label className="block text-white font-semibold mb-2">
                                URL del enlace *
                            </label>
                            <input
                                type="url"
                                value={formData.linkUrl}
                                onChange={(e) => setFormData({ ...formData, linkUrl: e.target.value })}
                                placeholder="https://ejemplo.com"
                                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                    )}

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
                            {isSubmitting ? 'Publicando...' : 'Publicar'}
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
