"use client";

import { useParams } from "next/navigation";
import CallRoom from "@/components/CallRoom";

export default function CallPage() {
    const params = useParams();
    const roomId = params.roomId as string;

    return <CallRoom roomId={roomId} />;
}
