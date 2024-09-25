'use client'

import { useState, useEffect } from 'react'
import Button from "@/components/ui/button"
import Input from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from 'next/link'

interface Language {
  id: string;
  name: string;
  speakers: number;
}

export default function LanguagesPage() {
  const [languages, setLanguages] = useState<Language[]>([])
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    // Simular la carga de idiomas
    setLanguages([
      { id: '1', name: 'Español', speakers: 543000000 },
      { id: '2', name: 'Inglés', speakers: 1452000000 },
      { id: '3', name: 'Mandarín', speakers: 1118000000 },
      { id: '4', name: 'Hindi', speakers: 637000000 },
      { id: '5', name: 'Árabe', speakers: 538000000 },
    ])
  }, [])

  const filteredLanguages = languages.filter(lang =>
    lang.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-orange-50 p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-orange-600 mb-6">Explora Idiomas</h1>
        <Input
          type="text"
          placeholder="Buscar idiomas..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="mb-6"
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredLanguages.map((lang) => (
            <Card key={lang.id}>
              <CardHeader>
                <CardTitle className="text-xl font-bold text-orange-600">{lang.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">{lang.speakers.toLocaleString()} hablantes</p>
                <Link href={`/languages/${lang.id}`}>
                  <Button className="w-full bg-orange-500 hover:bg-orange-600">
                    Explorar {lang.name}
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}