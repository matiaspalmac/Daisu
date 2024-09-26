"use client";

import { useState } from 'react';
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Search, Globe } from 'lucide-react';

const languages = [
    { name: 'Español', code: 'es', speakers: '534 millones' },
    { name: 'Inglés', code: 'en', speakers: '1.121 millones' },
    { name: 'Francés', code: 'fr', speakers: '280 millones' },
    { name: 'Alemán', code: 'de', speakers: '132 millones' },
    { name: 'Italiano', code: 'it', speakers: '68 millones' },
    { name: 'Portugués', code: 'pt', speakers: '234 millones' },
    { name: 'Ruso', code: 'ru', speakers: '258 millones' },
    { name: 'Chino (Mandarín)', code: 'zh', speakers: '1.117 millones' },
    { name: 'Japonés', code: 'ja', speakers: '126 millones' },
    { name: 'Coreano', code: 'ko', speakers: '77 millones' },
];

export default function LanguagesPage() {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredLanguages = languages.filter(lang =>
        lang.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="container mx-auto mt-8 px-4">
            <h1 className="text-3xl font-bold text-center mb-8 text-blue-700">Explora Idiomas</h1>
            
            <div className="max-w-md mx-auto mb-8">
                <div className="relative">
                    <Input
                        type="text"
                        placeholder="Buscar idiomas..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 pr-4 py-2 w-full"
                    />
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredLanguages.map((lang) => (
                    <Card key={lang.code} className="hover:shadow-lg transition-shadow duration-300">
                        <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-t-lg">
                            <CardTitle className="flex items-center">
                                <Globe className="mr-2" size={24} />
                                {lang.name}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4">
                            <p className="text-gray-600 mb-4">Código: {lang.code}</p>
                            <p className="text-gray-600 mb-4">Hablantes: {lang.speakers}</p>
                            <Button className="w-full">Empezar a aprender</Button>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}