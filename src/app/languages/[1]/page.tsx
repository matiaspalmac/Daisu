'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface Language {
  id: string;
  name: string;
  speakers: number;
  description: string;
}

export default function LanguageDetailPage() {
  const params = useParams()
  const [language, setLanguage] = useState<Language | null>(null)

  useEffect(() => {
    // Simular la carga de datos del idioma
    const fetchLanguage = async () => {
      // TODO: llamada a la API
      const mockLanguage: Language = {
        id: params.id as string,
        name: 'Español',
        speakers: 543000000,
        description: 'El español es una lengua romance que se originó en la península ibérica de Europa. Hoy en día, es hablado por más de 500 millones de personas en todo el mundo.'
      }
      setLanguage(mockLanguage)
    }

    fetchLanguage()
  }, [params.id])

  if (!language) {
    return <div>Cargando...</div>
  }

  return (
    <div className="min-h-screen bg-orange-50 p-4">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl font-bold text-orange-600">{language.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">{language.speakers.toLocaleString()} hablantes</p>
            <p className="text-gray-800 mb-6">{language.description}</p>
            <Button className="bg-orange-500 hover:bg-orange-600">
              Comenzar a aprender {language.name}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}