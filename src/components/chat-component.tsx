'use client'

import { SessionProvider, useSession } from 'next-auth/react';
import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";

interface Message {
  id: string;
  content: string;
  username: string;
}

const url_env = process.env.NEXT_PUBLIC_API_URL;

function ChatComponent() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
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
      });

      socketRef.current.on('disconnect', () => {
        console.log('an user has disconnected');
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
    return <p>Please log in to use the chat.</p>;
  }

  return (
    <div className="flex flex-col h-96">
      <div className="flex-1 overflow-y-auto p-4" id="messages">
        <ul className="space-y-2">
          {messages.map((message) => (
            <li key={message.id} className={`p-2 rounded-lg ${parseInt(message.id) % 2 === 0 ? 'bg-orange-100' : 'bg-orange-50'}`}>
              <p className="text-gray-800 text-sm">{message.content}</p>
              <small className="text-orange-600 text-xs">{message.username}</small>
            </li>
          ))}
        </ul>
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={handleSubmit} className="border-t border-orange-200 p-2 flex" id="form">
        <Input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Escribe un mensaje"
          className="flex-1 text-sm"
          id="input"
        />
        <Button type="submit" className="ml-2 bg-orange-500 text-white hover:bg-orange-600">
          Enviar
        </Button>
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