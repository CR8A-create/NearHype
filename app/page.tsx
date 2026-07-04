import { SignedIn, SignedOut } from "@clerk/nextjs";
import { SignInCta, SignUpCta } from "@/components/AuthButtons";
import { ArrowRight, MapPin, Sparkles, Users, Globe2 } from "lucide-react";
import Link from "next/link";

export default function HomePage() {
  return (
    <>
      {/* Si el usuario ya está logueado, redirigir al feed */}
      <SignedIn>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">Redirigiendo a tu feed...</h2>
            <Link
              href="/feed"
              className="inline-flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition"
            >
              Ir al Feed
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </SignedIn>

      {/* Landing page para usuarios no autenticados */}
      <SignedOut>
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-indigo-900">
          {/* Hero Section */}
          <div className="container mx-auto px-4 py-16">
            {/* Header */}
            <header className="flex justify-between items-center mb-20">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-indigo-600 rounded-lg flex items-center justify-center">
                  <MapPin className="w-7 h-7 text-white" />
                </div>
                <span className="text-2xl font-bold text-white">NearHype</span>
              </div>
              <div className="flex gap-4">
                <SignInCta className="px-6 py-2 text-white hover:text-indigo-300 transition">
                  Iniciar Sesión
                </SignInCta>
                <SignUpCta className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-semibold">
                  Comenzar Gratis
                </SignUpCta>
              </div>
            </header>

            {/* Hero Content */}
            <div className="text-center max-w-4xl mx-auto mb-20">
              <h1 className="text-6xl font-bold text-white mb-6 leading-tight">
                Descubre lo que{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
                  pasa cerca de ti
                </span>
              </h1>
              <p className="text-xl text-gray-300 mb-10 leading-relaxed">
                Tu agregador inteligente de eventos, noticias y comunidades basado en tus intereses y ubicación.
                Nunca más te pierdas lo importante.
              </p>
              <SignUpCta className="px-10 py-4 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition font-bold text-lg inline-flex items-center gap-3 shadow-xl hover:shadow-2xl hover:scale-105 transform">
                Empezar Ahora <ArrowRight className="w-6 h-6" />
              </SignUpCta>
              <p className="text-gray-400 mt-4 text-sm">
                Gratis para siempre • Sin tarjeta de crédito
              </p>
            </div>

            {/* Features Grid */}
            <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto mb-20">
              <FeatureCard
                icon={<MapPin className="w-8 h-8" />}
                title="Geolocalizado"
                description="Contenido relevante cerca de ti. Desde eventos a 5km hasta tendencias globales."
              />
              <FeatureCard
                icon={<Sparkles className="w-8 h-8" />}
                title="IA Inteligente"
                description="Algoritmo que aprende de tus intereses y te muestra exactamente lo que te importa."
              />
              <FeatureCard
                icon={<Users className="w-8 h-8" />}
                title="Comunidades"
                description="Encuentra grupos, meetups y personas con tus mismos intereses en tu ciudad."
              />
            </div>

            {/* How it works */}
            <div className="max-w-4xl mx-auto text-center mb-20">
              <h2 className="text-4xl font-bold text-white mb-12">¿Cómo funciona?</h2>
              <div className="grid md:grid-cols-3 gap-8">
                <Step
                  number="1"
                  title="Crea tu perfil"
                  description="Dinos qué te interesa: gaming, música, comida, deportes..."
                />
                <Step
                  number="2"
                  title="Comparte tu ubicación"
                  description="Solo guardamos tu ciudad. Privacidad garantizada."
                />
                <Step
                  number="3"
                  title="Descubre contenido"
                  description="Tu feed personalizado se actualiza automáticamente."
                />
              </div>
            </div>

            {/* CTA Final */}
            <div className="text-center bg-white/10 backdrop-blur-lg rounded-2xl p-12 max-w-3xl mx-auto">
              <Globe2 className="w-16 h-16 text-indigo-400 mx-auto mb-6" />
              <h2 className="text-3xl font-bold text-white mb-4">
                Únete a la revolución del contenido local
              </h2>
              <p className="text-gray-300 mb-8 text-lg">
                Miles de usuarios ya están descubriendo lo mejor de su ciudad
              </p>
              <SignUpCta className="px-10 py-4 bg-white text-indigo-900 rounded-xl hover:bg-gray-100 transition font-bold text-lg inline-flex items-center gap-3">
                Comenzar Gratis <ArrowRight className="w-6 h-6" />
              </SignUpCta>
            </div>

            {/* Footer */}
            <footer className="mt-20 pt-10 border-t border-white/10 text-center text-gray-400">
              <p>© 2026 NearHype. Hecho con ❤️ para descubrir lo que importa.</p>
            </footer>
          </div>
        </div>
      </SignedOut>
    </>
  );
}

// Componente de Feature Card
function FeatureCard({ icon, title, description }: {
  icon: React.ReactNode;
  title: string;
  description: string
}) {
  return (
    <div className="bg-white/5 backdrop-blur-sm rounded-xl p-8 hover:bg-white/10 transition border border-white/10">
      <div className="text-indigo-400 mb-4">{icon}</div>
      <h3 className="text-xl font-bold text-white mb-3">{title}</h3>
      <p className="text-gray-300">{description}</p>
    </div>
  );
}

// Componente de Step
function Step({ number, title, description }: {
  number: string;
  title: string;
  description: string
}) {
  return (
    <div className="relative">
      <div className="w-16 h-16 bg-indigo-600 rounded-full flex items-center justify-center text-2xl font-bold text-white mx-auto mb-4">
        {number}
      </div>
      <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
      <p className="text-gray-300">{description}</p>
    </div>
  );
}
