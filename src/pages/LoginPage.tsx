import { LoginForm } from "@/features/auth/components/LoginForm"

export default function LoginPage() {
    return (
        <div className="relative flex min-h-screen items-center justify-center bg-[#1a1a1a] p-4 overflow-hidden">
            {/* Grid background pattern */}
            <div className="absolute inset-0 z-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-size-[50px_50px] mask-[radial-gradient(ellipse_at_center,black_20%,transparent_80%)]" />

            {/* Gradient overlay */}
            <div className="absolute inset-0 z-0 bg-linear-to-br from-[#2a2a2a] via-[#1a1a1a] to-[#0f0f0f] opacity-90" />

            {/* Content */}
            <div className="relative z-10 w-full flex items-center justify-center">
                <LoginForm />
            </div>
        </div>
    )
}