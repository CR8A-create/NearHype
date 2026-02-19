"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { Phone, PhoneOff, Video, X } from "lucide-react";

type IncomingCall = {
    id: string;
    callerId: string;
    calleeId: string;
    callType: string;
    callerUsername: string;
    callerAvatar: string | null;
};

export default function IncomingCallModal() {
    const router = useRouter();
    const { isSignedIn } = useUser();
    const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
    const [isResponding, setIsResponding] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const failCountRef = useRef(0);

    // Poll for incoming calls every 3 seconds (only when signed in)
    useEffect(() => {
        if (!isSignedIn) return;

        const checkCalls = async () => {
            try {
                const res = await fetch("/api/calls");
                if (!res.ok) {
                    failCountRef.current++;
                    // Back off if repeated failures
                    if (failCountRef.current > 5) return;
                    return;
                }
                failCountRef.current = 0;
                const data = await res.json();
                if (data.incomingCall && !isResponding) {
                    setIncomingCall(data.incomingCall);
                    // Play ringtone
                    if (!audioRef.current) {
                        audioRef.current = new Audio("/ringtone.mp3");
                        audioRef.current.loop = true;
                        audioRef.current.volume = 0.5;
                        audioRef.current.play().catch(() => { });
                    }
                } else if (!data.incomingCall && incomingCall) {
                    setIncomingCall(null);
                    stopRingtone();
                }
            } catch {
                failCountRef.current++;
            }
        };

        const interval = setInterval(checkCalls, 3000);
        return () => {
            clearInterval(interval);
            stopRingtone();
        };
    }, [incomingCall, isResponding, isSignedIn]);

    const stopRingtone = () => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current = null;
        }
    };

    const acceptCall = async () => {
        if (!incomingCall) return;
        setIsResponding(true);
        stopRingtone();
        router.push(`/calls/${incomingCall.id}`);
    };

    const rejectCall = async () => {
        if (!incomingCall) return;
        setIsResponding(true);
        stopRingtone();

        try {
            await fetch(`/api/calls/${incomingCall.id}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "reject" }),
            });
        } catch (e) {
            console.error("Error rejecting call:", e);
        }

        setIncomingCall(null);
        setIsResponding(false);
    };

    if (!incomingCall) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

            {/* Call card */}
            <div className="relative bg-gray-900 border border-white/10 rounded-3xl shadow-2xl p-8 max-w-sm w-full mx-4 animate-in zoom-in-95 fade-in duration-300">
                {/* Dismiss */}
                <button
                    onClick={rejectCall}
                    className="absolute top-4 right-4 text-gray-500 hover:text-white transition"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="text-center">
                    {/* Avatar with pulse ring */}
                    <div className="relative inline-block mb-6">
                        <div className="absolute inset-0 rounded-full bg-accent/30 animate-ping" style={{ animationDuration: "1.5s" }} />
                        <div className="absolute -inset-2 rounded-full bg-accent/20 animate-pulse" />
                        {incomingCall.callerAvatar ? (
                            <img
                                src={incomingCall.callerAvatar}
                                alt={incomingCall.callerUsername}
                                className="relative w-24 h-24 rounded-full border-4 border-accent"
                            />
                        ) : (
                            <div className="relative w-24 h-24 rounded-full bg-accent flex items-center justify-center border-4 border-accent/50">
                                <span className="text-3xl text-white font-bold">
                                    {incomingCall.callerUsername[0].toUpperCase()}
                                </span>
                            </div>
                        )}
                    </div>

                    <h3 className="text-xl font-bold text-white mb-1">{incomingCall.callerUsername}</h3>
                    <p className="text-gray-400 text-sm mb-8 flex items-center justify-center gap-2">
                        {incomingCall.callType === "video" ? (
                            <><Video className="w-4 h-4" /> Videollamada entrante</>
                        ) : (
                            <><Phone className="w-4 h-4" /> Llamada de voz entrante</>
                        )}
                    </p>

                    {/* Action buttons */}
                    <div className="flex items-center justify-center gap-8">
                        <button
                            onClick={rejectCall}
                            disabled={isResponding}
                            className="w-16 h-16 rounded-full bg-red-600 text-white flex items-center justify-center hover:bg-red-700 transition-all shadow-lg shadow-red-600/30 hover:scale-110 disabled:opacity-50"
                            title="Rechazar"
                        >
                            <PhoneOff className="w-7 h-7" />
                        </button>

                        <button
                            onClick={acceptCall}
                            disabled={isResponding}
                            className="w-16 h-16 rounded-full bg-green-600 text-white flex items-center justify-center hover:bg-green-700 transition-all shadow-lg shadow-green-600/30 hover:scale-110 disabled:opacity-50"
                            title="Aceptar"
                        >
                            <Phone className="w-7 h-7" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
