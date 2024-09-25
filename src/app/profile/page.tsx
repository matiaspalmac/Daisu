'use client'
import { toast } from 'nextjs-toast-notify'
import "nextjs-toast-notify/dist/nextjs-toast-notify.css"
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Button from "@/components/ui/button"
import Input from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Textarea from "@/components/ui/textarea"
  
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
    <div className="min-h-screen bg-orange-50 p-4">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-orange-600">Tu Perfil</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700">Nombre de usuario</label>
                <Input
                  type="text"
                  id="username"
                  name="username"
                  value={profile.username}
                  onChange={handleChange}
                  className="mt-1"
                />
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">Correo electrónico</label>
                <Input
                  type="email"
                  id="email"
                  name="email"
                  value={profile.email}
                  onChange={handleChange}
                  className="mt-1"
                />
              </div>
              <div>
                <label htmlFor="bio" className="block text-sm font-medium text-gray-700">Biografía</label>
                <Textarea
                  id="bio"
                  name="bio"
                  value={profile.bio}
                  onChange={handleChange}
                  className="mt-1"
                  rows={4}
                />
              </div>
              <div>
                <label htmlFor="nativeLanguage" className="block text-sm font-medium text-gray-700">Idioma nativo</label>
                <Input
                  type="text"
                  id="nativeLanguage"
                  name="nativeLanguage"
                  value={profile.nativeLanguage}
                  onChange={handleChange}
                  className="mt-1"
                />
              </div>
              <div>
                <label htmlFor="learningLanguages" className="block text-sm font-medium text-gray-700">Idiomas que estás aprendiendo</label>
                <Input
                  type="text"
                  id="learningLanguages"
                  name="learningLanguages"
                  value={profile.learningLanguages.join(', ')}
                  onChange={(e) => setProfile(prev => ({ ...prev, learningLanguages: e.target.value.split(', ') }))}
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">Separa los idiomas con comas</p>
              </div>
              <Button type="submit" className="w-full bg-orange-500 hover:bg-orange-600">
                Guardar Cambios
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}