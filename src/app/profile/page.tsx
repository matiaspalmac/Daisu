'use client'
import { toast } from 'nextjs-toast-notify'
import "nextjs-toast-notify/dist/nextjs-toast-notify.css"
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { User, Mail, FileText, Globe, BookOpen } from 'lucide-react'

interface UserProfile {
  username: string;
  email: string;
  bio: string;
  nativeLanguage: string;
  learningLanguages: string[];
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile>({
    username: '',
    email: '',
    bio: '',
    nativeLanguage: '',
    learningLanguages: [],
  })
  const { data: session } = useSession();

  useEffect(() => {
    if (!session) return

    setProfile({
      username: session?.user?.name || '',
      email: session?.user?.email || '',
      bio: '',
      nativeLanguage: '',
      learningLanguages: [],
    })
  }, [session])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setProfile(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Aquí iría la lógica para actualizar el perfil
    console.log('Perfil actualizado:', profile)
    
    // Mostrar un mensaje de éxito
    toast.success("Perfil actualizado correctamente", {
      duration: 5000,
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-2xl mx-auto">
        <Card className="shadow-lg">
          <CardHeader className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-t-lg">
            <CardTitle className="text-2xl font-bold">Tu Perfil</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 flex items-center">
                  <User className="w-5 h-5 mr-2 text-blue-500" />
                  Nombre de usuario
                </label>
                <Input
                  type="text"
                  id="username"
                  name="username"
                  value={profile.username}
                  onChange={handleChange}
                  className="w-full rounded-full"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 flex items-center">
                  <Mail className="w-5 h-5 mr-2 text-blue-500" />
                  Correo electrónico
                </label>
                <Input
                  type="email"
                  id="email"
                  name="email"
                  value={profile.email}
                  onChange={handleChange}
                  className="w-full rounded-full"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="bio" className="block text-sm font-medium text-gray-700 flex items-center">
                  <FileText className="w-5 h-5 mr-2 text-blue-500" />
                  Biografía
                </label>
                <Textarea
                  id="bio"
                  name="bio"
                  value={profile.bio}
                  onChange={handleChange}
                  className="w-full rounded-lg"
                  rows={4}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="nativeLanguage" className="block text-sm font-medium text-gray-700 flex items-center">
                  <Globe className="w-5 h-5 mr-2 text-blue-500" />
                  Idioma nativo
                </label>
                <Input
                  type="text"
                  id="nativeLanguage"
                  name="nativeLanguage"
                  value={profile.nativeLanguage}
                  onChange={handleChange}
                  className="w-full rounded-full"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="learningLanguages" className="block text-sm font-medium text-gray-700 flex items-center">
                  <BookOpen className="w-5 h-5 mr-2 text-blue-500" />
                  Idiomas que estás aprendiendo
                </label>
                <Input
                  type="text"
                  id="learningLanguages"
                  name="learningLanguages"
                  value={profile.learningLanguages.join(', ')}
                  onChange={(e) => setProfile(prev => ({ ...prev, learningLanguages: e.target.value.split(', ') }))}
                  className="w-full rounded-full"
                />
                <p className="text-xs text-gray-500 mt-1 ml-7">Separa los idiomas con comas</p>
              </div>
              <Button type="submit" className="w-full bg-blue-500 hover:bg-blue-600 text-white rounded-full transition duration-300 ease-in-out transform hover:scale-105">
                Guardar Cambios
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}