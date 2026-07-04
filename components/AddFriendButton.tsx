"use client";

import { useState } from "react";
import { UserPlus, Clock, Loader2 } from "lucide-react";

type AddFriendButtonProps = {
    username: string;
    className?: string;
    minimal?: boolean;
};

export default function AddFriendButton({ username, className = "", minimal = false }: AddFriendButtonProps) {
    const [status, setStatus] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle');

    const handleSendRequest = async () => {
        setStatus('loading');
        try {
            const res = await fetch('/api/friends/request', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ receiverUsername: username }),
            });

            const data = await res.json();

            if (res.ok) {
                setStatus('sent');
            } else if (res.status === 409) {
                // Conflict: Already pending
                setStatus('sent');
            } else {
                console.error('Error:', data.error);
                setStatus('error');
                setTimeout(() => setStatus('idle'), 3000);
            }
        } catch (error) {
            console.error('Error sending friend request:', error);
            setStatus('error');
            setTimeout(() => setStatus('idle'), 3000);
        }
    };

    const baseClasses = minimal
        ? className
        : `flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-semibold ${className}`;

    if (status === 'sent') {
        return (
            <button
                disabled
                className={`${baseClasses} opacity-50 cursor-not-allowed`}
            >
                <Clock className="w-4 h-4" />
                {minimal ? "Enviada" : "Solicitud Enviada"}
            </button>
        );
    }

    if (status === 'loading') {
        return (
            <button
                disabled
                className={`${baseClasses} cursor-wait`}
            >
                <Loader2 className="w-4 h-4 animate-spin" />
                {minimal ? "Enviando" : "Enviando..."}
            </button>
        );
    }

    return (
        <button
            onClick={handleSendRequest}
            className={baseClasses}
        >
            <UserPlus className="w-4 h-4" />
            {minimal ? "Agregar amigo" : "Agregar Amigo"}
        </button>
    );
}
