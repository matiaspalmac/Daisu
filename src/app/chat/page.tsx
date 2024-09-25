'use client'

import { useState, useEffect } from 'react'
import Button from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import ChatComponent from '@/components/chat-component'

export default function ChatPage() {
  const [activeChats, setActiveChats] = useState<string[]>([])
  const [selectedChat, setSelectedChat] = useState<string | null>(null)

  useEffect(() => {
    // Simular la carga de chats activos
    setActiveChats(['Usuario1', 'Usuario2', 'Usuario3'])
  }, [])

  return (
    <div className="min-h-screen bg-orange-50 p-4">
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-orange-600">Chats Activos</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {activeChats.map((chat) => (
                <li key={chat}>
                  <Button
                    onClick={() => setSelectedChat(chat)}
                    className={`w-full justify-start ${selectedChat === chat ? 'bg-orange-200' : 'bg-white'}`}
                  >
                    {chat}
                  </Button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card className="md:col-span-3">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-orange-600">
              {selectedChat ? `Chat con ${selectedChat}` : 'Selecciona un chat'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedChat ? (
              <ChatComponent />
            ) : (
              <p className="text-center text-gray-500">Selecciona un chat para comenzar</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}