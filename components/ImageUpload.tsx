"use client";

import { useState, useRef, useCallback } from "react";
import { X, Loader2, Image as ImageIcon } from "lucide-react";
import { uploadFiles } from "@/lib/uploadthing";

type ImageUploadProps = {
    onUploadComplete: (url: string) => void;
    onUploadError?: (error: string) => void;
    endpoint: "postImage" | "messageImage" | "communityAvatar";
    maxSizeMB?: number;
};

export default function ImageUpload({
    onUploadComplete,
    onUploadError,
    endpoint,
    maxSizeMB = 4
}: ImageUploadProps) {
    const [preview, setPreview] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [error, setError] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = useCallback(async (file: File) => {
        // Validar tamaño
        const sizeMB = file.size / (1024 * 1024);
        if (sizeMB > maxSizeMB) {
            const errMsg = `La imagen es demasiado grande (${sizeMB.toFixed(1)}MB). Máximo: ${maxSizeMB}MB`;
            setError(errMsg);
            onUploadError?.(errMsg);
            return;
        }

        // Validar tipo
        if (!file.type.startsWith('image/')) {
            const errMsg = "Solo se permiten imágenes";
            setError(errMsg);
            onUploadError?.(errMsg);
            return;
        }

        // Crear preview
        const reader = new FileReader();
        reader.onload = (e) => {
            setPreview(e.target?.result as string);
        };
        reader.readAsDataURL(file);

        // Subir
        setIsUploading(true);
        setError('');

        try {
            const result = await uploadFiles(endpoint, {
                files: [file],
            });

            if (result && result[0]) {
                // Obtener URL directamente
                const uploadedUrl = result[0].url;
                onUploadComplete(uploadedUrl);
                setPreview(null);
            } else {
                throw new Error('No se recibió URL del archivo');
            }
        } catch (err: any) {
            const errorMessage = err?.message || 'Error al subir la imagen';
            setError(errorMessage);
            onUploadError?.(errorMessage);
            setPreview(null);
        } finally {
            setIsUploading(false);
        }
    }, [maxSizeMB, onUploadError, onUploadComplete, endpoint]);

    // Manejador de input file
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            handleFileChange(file);
        }
    };

    // Manejador de paste (Ctrl+V desde portapapeles)
    const handlePaste = useCallback((e: React.ClipboardEvent) => {
        const items = e.clipboardData?.items;
        if (!items) return;

        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                const file = items[i].getAsFile();
                if (file) {
                    e.preventDefault();
                    handleFileChange(file);
                    break;
                }
            }
        }
    }, [handleFileChange]);

    // Drag and Drop
    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        const file = e.dataTransfer.files[0];
        if (file) {
            handleFileChange(file);
        }
    };

    const clearPreview = () => {
        setPreview(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    return (
        <div
            onPaste={handlePaste}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className="relative"
        >
            {/* Mensaje de error */}
            {error && (
                <div className="mb-2 p-2 bg-red-500/20 border border-red-500/50 rounded-lg text-red-300 text-sm">
                    {error}
                </div>
            )}

            {/* Preview de la imagen */}
            {preview && (
                <div className="relative mb-3 p-2 bg-white/5 rounded-lg border border-white/20">
                    <img
                        src={preview}
                        alt="Preview"
                        className="max-h-40 rounded-lg mx-auto"
                    />
                    {!isUploading && (
                        <button
                            onClick={clearPreview}
                            className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                    {isUploading && (
                        <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
                            <div className="text-center">
                                <Loader2 className="w-8 h-8 text-indigo-400 animate-spin mx-auto mb-2" />
                                <p className="text-white text-sm">Subiendo...</p>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Botón de upload */}
            {!preview && (
                <div
                    className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition ${isDragging
                        ? 'border-indigo-500 bg-indigo-500/10'
                        : 'border-white/20 hover:border-indigo-500/50 hover:bg-white/5'
                        }`}
                    onClick={() => fileInputRef.current?.click()}
                >
                    <ImageIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-300 text-sm mb-1">
                        Click o arrastra una imagen
                    </p>
                    <p className="text-gray-500 text-xs">
                        Máximo {maxSizeMB}MB • JPG, PNG, GIF, WebP
                    </p>
                </div>
            )}

            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleInputChange}
                className="hidden"
            />
        </div>
    );
}
