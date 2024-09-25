import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="bg-orange-100 text-gray-600">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-lg font-semibold mb-4">Acerca de Daisu</h3>
            <p>Daisu es una plataforma de intercambio de idiomas que conecta a personas de todo el mundo para aprender y practicar nuevos idiomas.</p>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-4">Enlaces rápidos</h3>
            <ul className="space-y-2">
              <li><Link href="/languages" className="hover:text-orange-600">Explorar idiomas</Link></li>
              <li><Link href="/chat" className="hover:text-orange-600">Chat en vivo</Link></li>
              <li><Link href="/profile" className="hover:text-orange-600">Mi perfil</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-4">Contacto</h3>
            <p>Email: info@daisu.com</p>
            <p>Teléfono: +1 234 567 890</p>
          </div>
        </div>
        <div className="mt-8 pt-8 border-t border-gray-200 text-center">
          <p>&copy; 2024 Daisu. Todos los derechos reservados.</p>
        </div>
      </div>
    </footer>
  )
}