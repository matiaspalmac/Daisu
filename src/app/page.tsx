'use client'

import { useState } from 'react'
import Button from "@/components/ui/button"
import Input from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Globe, MessageCircle, Users, Search, X } from "lucide-react"
import ChatComponentWithSessionProvider from "@/components/chat-component"

export default function DaisuHome() {
  const [isChatOpen, setIsChatOpen] = useState(false)

  return (
    <div className="min-h-screen bg-orange-50 relative">
      <main className="container mx-auto mt-8 px-4 pb-24">
        <h2 className="text-3xl font-bold text-center mb-8 text-orange-800">Intercambia idiomas con hablantes nativos</h2>
        
        <div className="flex justify-center mb-8">
          <div className="relative w-full max-w-xl">
            <Input type="text" placeholder="Buscar idiomas o usuarios..." className="pl-10 pr-4 py-2 rounded-full" />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-white shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center text-orange-600">
                <Globe className="mr-2" />
                Explora idiomas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">Descubre una amplia variedad de idiomas para aprender y practicar con hablantes nativos de todo el mundo.</p>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center text-orange-600">
                <MessageCircle className="mr-2" />
                Chatea en vivo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">Conecta con otros usuarios en tiempo real a través de nuestro sistema de chat integrado para practicar idiomas.</p>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center text-orange-600">
                <Users className="mr-2" />
                Comunidad activa
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">Únete a una comunidad vibrante de entusiastas del aprendizaje de idiomas y haz nuevos amigos en todo el mundo.</p>
            </CardContent>
          </Card>
        </div>

        <div className="text-center mt-12">
          <Button className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-3 rounded-full text-lg font-semibold">
            Comienza a intercambiar ahora
          </Button>
        </div>
      </main>

      {/* Chat component */}
      <div className={`fixed bottom-4 right-4 z-50 transition-all duration-300 ease-in-out ${isChatOpen ? 'translate-y-0' : 'translate-y-[calc(100%-3.5rem)]'}`}>
        <div className="bg-white rounded-t-lg shadow-lg w-80">
          <div 
            className="bg-orange-500 text-white p-2 rounded-t-lg flex justify-between items-center cursor-pointer"
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