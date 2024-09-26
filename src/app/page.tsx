'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Globe, MessageCircle, Users, Search, X, BookOpen, Award, Zap, Headphones } from "lucide-react"
import ChatComponentWithSessionProvider from "@/components/chat-component"

export default function DaisuHome() {
  const [isChatOpen, setIsChatOpen] = useState(false)

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 relative">
      <div className="absolute inset-0 bg-white/30 backdrop-blur-xl z-0"></div>
      <main className="container mx-auto mt-8 px-4 pb-24 relative z-10">
        <h1 className="text-5xl font-bold text-center mb-4 text-blue-800">Daisu</h1>
        <h2 className="text-3xl font-bold text-center mb-8 text-blue-700">Intercambia idiomas con hablantes nativos</h2>
        
        <div className="flex justify-center mb-12">
          <div className="relative w-full max-w-xl">
            <Input type="text" placeholder="Buscar idiomas o usuarios..." className="pl-10 pr-4 py-3 rounded-full bg-white/50 backdrop-blur-sm border-blue-200 focus:border-blue-400 focus:ring-blue-400" />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-400" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {[
            { icon: Globe, title: "Explora idiomas", description: "Descubre una amplia variedad de idiomas para aprender y practicar con hablantes nativos de todo el mundo." },
            { icon: MessageCircle, title: "Chatea en vivo", description: "Conecta con otros usuarios en tiempo real a través de nuestro sistema de chat integrado para practicar idiomas." },
            { icon: Users, title: "Comunidad activa", description: "Únete a una comunidad vibrante de entusiastas del aprendizaje de idiomas y haz nuevos amigos en todo el mundo." }
          ].map((feature, index) => (
            <Card key={index} className="bg-white/40 backdrop-blur-sm shadow-lg hover:shadow-xl transition-shadow border border-blue-100">
              <CardHeader>
                <CardTitle className="flex items-center text-blue-600">
                  <feature.icon className="mr-2" />
                  {feature.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center mb-16">
          <Button className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-4 rounded-full text-lg font-semibold shadow-lg hover:shadow-xl transition-shadow">
            Comienza a intercambiar ahora
          </Button>
        </div>

        <section className="mb-16">
          <h3 className="text-2xl font-bold text-center mb-8 text-blue-700">¿Por qué elegir Daisu?</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { icon: BookOpen, title: "Aprendizaje personalizado", description: "Adapta tu experiencia de aprendizaje a tus necesidades y objetivos específicos." },
              { icon: Award, title: "Certificaciones", description: "Obtén certificados que validen tu progreso y nivel en los idiomas que aprendes." },
              { icon: Zap, title: "Aprendizaje rápido", description: "Metodologías probadas para ayudarte a aprender idiomas de manera eficiente." },
              { icon: Headphones, title: "Soporte 24/7", description: "Nuestro equipo está siempre disponible para ayudarte en tu viaje de aprendizaje." }
            ].map((feature, index) => (
              <div key={index} className="flex flex-col items-center text-center">
                <feature.icon className="w-12 h-12 text-blue-500 mb-4" />
                <h4 className="text-xl font-semibold mb-2 text-blue-600">{feature.title}</h4>
                <p className="text-gray-700">{feature.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-16">
          <h3 className="text-2xl font-bold text-center mb-8 text-blue-700">Testimonios de usuarios</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="bg-white/40 backdrop-blur-sm shadow-lg border border-blue-100">
                <CardContent className="pt-6">
                  <div className="flex items-center mb-4">
                    <div className="w-12 h-12 rounded-full bg-blue-200 mr-4"></div>
                    <div>
                      <h4 className="font-semibold text-blue-600">Usuario {i}</h4>
                      <p className="text-sm text-gray-600">Estudiante de {i === 1 ? 'Inglés' : i === 2 ? 'Español' : 'Francés'}</p>
                    </div>
                  </div>
                  <p className="text-gray-700">Daisu ha transformado mi forma de aprender idiomas. La comunidad es increíble y he mejorado mucho más rápido de lo que esperaba.</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="text-center">
          <h3 className="text-2xl font-bold mb-4 text-blue-700">¿Listo para empezar?</h3>
          <p className="text-gray-700 mb-8">Únete a nuestra comunidad global de aprendices de idiomas hoy mismo.</p>
          <Button className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-4 rounded-full text-lg font-semibold shadow-lg hover:shadow-xl transition-shadow">
            Regístrate gratis
          </Button>
        </section>
      </main>

      {/* Chat component */}
      <div className={`fixed bottom-4 right-4 z-50 transition-all duration-300 ease-in-out ${isChatOpen ? 'translate-y-0' : 'translate-y-[calc(100%-3.5rem)]'}`}>
        <div className="bg-white/80 backdrop-blur-md rounded-t-lg shadow-lg w-80 border border-blue-200">
          <div 
            className="bg-blue-500 text-white p-2 rounded-t-lg flex justify-between items-center cursor-pointer"
            onClick={() => setIsChatOpen(!isChatOpen)}
          >
            <span className="font-semibold">Chat en vivo</span>
            {isChatOpen ? (
              <X size={20} />
            ) : (
              <MessageCircle size={20} />
            )}
          </div>
          <div className={`transition-all duration-300 ease-in-out ${isChatOpen ? 'max-h-96' : 'max-h-0'} overflow-hidden`}>
            <ChatComponentWithSessionProvider />
          </div>
        </div>
      </div>
    </div>
  )
}