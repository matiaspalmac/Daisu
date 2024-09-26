'use client'

import { SessionProvider, useSession } from 'next-auth/react';
import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Loader2 } from 'lucide-react';

interface Message {
  id: string;
  content: string;
  username: string;
}

const url_env = process.env.NEXT_PUBLIC_API_URL;

function ChatComponent() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isConnecting, setIsConnecting] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status !== 'authenticated') return;

    const getUsername = async () => {
      if (session?.user) {
        return session.user.name;
      }
      return 'anonymous';
    };

    const initializeSocket = async () => {
      const username = await getUsername();
      socketRef.current = io(`${url_env}`, {
        path: '/api/socket',
        auth: {
          username,
          serverOffset: 0
        }
      });

      socketRef.current.on('connect_error', (err) => {
        console.error('Connection error:', err);
        setIsConnecting(false);
      });

      socketRef.current.on('chat message', (msg: string, id: string, username: string) => {
        setMessages(prevMessages => {
          if (prevMessages.some(message => message.id === id)) {
            return prevMessages;
          }
          return [...prevMessages, { id, content: msg, username }];
        });
        if (socketRef.current) {
          if (typeof socketRef.current.auth === 'object') {
            socketRef.current.auth.serverOffset = id;
          }
        }
      });

      socketRef.current.on('connect', () => {
        console.log('a user has connected!');
        setIsConnecting(false);
      });

      socketRef.current.on('disconnect', () => {
        console.log('an user has disconnected');
        setIsConnecting(true);
      });
    };

    initializeSocket();

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [session, status]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue && socketRef.current) {
      socketRef.current.emit('chat message', inputValue);
      setInputValue('');
    }
  };

  if (status !== 'authenticated') {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500">Por favor, inicia sesión para usar el chat.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-blue-50 to-indigo-100 rounded-lg overflow-hidden">
      {isConnecting && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      )}
      <div className="flex-1 overflow-y-auto p-4 space-y-4" id="messages">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.username === session?.user?.name ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs px-4 py-2 rounded-lg ${
                message.username === session?.user?.name
                  ? 'bg-blue-500 text-white'
                  : 'bg-white text-gray-800'
              }`}
            >
              <p className="text-sm">{message.content}</p>
              <p className="text-xs mt-1 opacity-70">{message.username}</p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={handleSubmit} className="border-t border-blue-200 p-4 bg-white" id="form">
        <div className="flex items-center space-x-2">
          <Input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Escribe un mensaje"
            className="flex-1 text-sm rounded-full"
            id="input"
          />
          <Button type="submit" size="default" className="rounded-full bg-blue-500 text-white hover:bg-blue-600">
            <Send size={18} />
          </Button>
        </div>
      </form>
    </div>
  );
}

export default function ChatComponentWithSessionProvider(props: object) {
  return (
    <SessionProvider>
      <ChatComponent {...props} />
    </SessionProvider>
  );
}