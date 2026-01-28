"use client";

import { useState } from "react";
import { UserPlus, Check, Clock, Loader2 } from "lucide-react";

type AddFriendButtonProps = {
    username: string;
};

export default function AddFriendButton({ username }: AddFriendButtonProps) {
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

    if (status === 'sent') {
        return (
            <button
                disabled
                className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-gray-400 rounded-lg cursor-not-allowed"
            >
                <Clock className="w-4 h-4" />
                Solicitud Enviada
            </button>
        );
    }

    if (status === 'loading') {
        return (
            <button
                disabled
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg cursor-wait"
            >
                <Loader2 className="w-4 h-4 animate-spin" />
                Enviando...
            </button>
        );
    }

    return (
        <button
            onClick={handleSendRequest}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-semibold"
        >
            <UserPlus className="w-4 h-4" />
            Agregar Amigo
        </button>
    );
}
