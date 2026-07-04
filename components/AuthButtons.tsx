"use client";

// Los botones de Clerk deben montarse desde un componente cliente: si se usan
// directamente en un Server Component, los children llegan serializados como
// array a través de la frontera RSC y @clerk/nextjs >= 6.39 rechaza el render
// ("You've passed multiple children components").

import { SignInButton, SignUpButton } from "@clerk/nextjs";
import type { ReactNode } from "react";

export function SignInCta({ className, children }: { className: string; children: ReactNode }) {
    return (
        <SignInButton mode="modal">
            <button className={className}>{children}</button>
        </SignInButton>
    );
}

export function SignUpCta({ className, children }: { className: string; children: ReactNode }) {
    return (
        <SignUpButton mode="modal">
            <button className={className}>{children}</button>
        </SignUpButton>
    );
}
