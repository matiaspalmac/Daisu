'use client'

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import ChatComponent from '@/components/chat-component'
import { MessageCircle, Search, User } from 'lucide-react'

interface ChatUser {
  id: string;
  name: string;
  avatar: string;
  lastMessage: string;
  timestamp: string;
}

export default function ChatPage() {
  const [activeChats, setActiveChats] = useState<ChatUser[]>([])
  const [selectedChat, setSelectedChat] = useState<ChatUser | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    // Simular la carga de chats activos
    setActiveChats([
      { id: '1', name: 'Usuario1', avatar: '/avatars/avatar1.png', lastMessage: 'Hola, ¿cómo estás?', timestamp: '10:30 AM' },
      { id: '2', name: 'Usuario2', avatar: '/avatars/avatar2.png', lastMessage: '¿Quieres practicar español hoy?', timestamp: 'Ayer' },
      { id: '3', name: 'Usuario3', avatar: '/avatars/avatar3.png', lastMessage: 'Gracias por la ayuda', timestamp: 'Lunes' },
    ])
  }, [])

  const filteredChats = activeChats.filter(chat => 
    chat.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-4">
        <Card className="lg:col-span-1 overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-4">
            <CardTitle className="text-xl font-bold flex items-center">
              <MessageCircle className="mr-2" />
              Chats Activos
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="mb-4">
              <div className="relative">
                <Input
                  type="text"
                  placeholder="Buscar chats..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 w-full rounded-full"
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              </div>
            </div>
            <ul className="space-y-2 max-h-[calc(100vh-250px)] overflow-y-auto">
              {filteredChats.map((chat) => (
                <li key={chat.id}>
                  <Button
                    onClick={() => setSelectedChat(chat)}
                    className={`w-full justify-start text-left p-2 rounded-lg transition-colors duration-200 ${
                      selectedChat?.id === chat.id ? 'bg-blue-100 text-blue-700' : 'bg-white text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center">
                      <img src={chat.avatar} alt={chat.name} className="w-10 h-10 rounded-full mr-3" />
                      <div className="flex-grow">
                        <div className="font-semibold">{chat.name}</div>
                        <div className="text-xs text-gray-500 truncate">{chat.lastMessage}</div>
                      </div>
                      <div className="text-xs text-gray-400">{chat.timestamp}</div>
                    </div>
                  </Button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card className="lg:col-span-3 overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-4">
            <CardTitle className="text-xl font-bold flex items-center">
              {selectedChat ? (
                <>
                  <img src={selectedChat.avatar} alt={selectedChat.name} className="w-8 h-8 rounded-full mr-2" />
                  Chat con {selectedChat.name}
                </>
              ) : (
                <>
                  <User className="mr-2" />
                  Selecciona un chat
                </>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 h-[calc(100vh-200px)]">
            {selectedChat ? (
              <ChatComponent />
            ) : (
              <div className="flex items-center justify-center h-full text-center text-gray-500">
                <div>
                  <MessageCircle size={48} className="mx-auto mb-4 text-blue-300" />
                  <p>Selecciona un chat para comenzar una conversación</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}