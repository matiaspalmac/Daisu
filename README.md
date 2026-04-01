# Daisu - Frontend

Plataforma de intercambio de idiomas. Aplicacion web construida con Next.js 16, React 19 y TypeScript.

## Stack Tecnologico

- **Framework**: Next.js 16 (App Router)
- **UI**: React 19, Tailwind CSS 4
- **Componentes**: Radix UI, cva, Framer Motion
- **Iconos**: Lucide React
- **Autenticacion**: NextAuth.js
- **Internacionalizacion**: next-intl
- **Tiempo real**: Socket.IO Client
- **Lenguaje**: TypeScript

## Arquitectura

El proyecto sigue una arquitectura modular basada en features:

```
src/
├── app/                    # App Router de Next.js
│   ├── [locale]/           # Rutas con soporte i18n
│   ├── api/                # API routes internos
│   └── public/             # Rutas publicas
├── features/               # Modulos por funcionalidad
│   ├── auth/               # Login, registro
│   ├── chat/               # Salas de chat en tiempo real
│   ├── dms/                # Mensajes directos
│   ├── profile/            # Perfil de usuario
│   ├── vocabulary/         # Flashcards y repaso espaciado
│   ├── quiz/               # Quizzes diarios
│   ├── gamification/       # Logros, XP, rachas
│   ├── events/             # Eventos comunitarios
│   ├── resources/          # Materiales de aprendizaje
│   ├── news/               # Articulos y novedades
│   ├── membership/         # Planes de suscripcion
│   ├── notifications/      # Notificaciones
│   ├── search/             # Busqueda global
│   ├── admin/              # Panel de administracion
│   ├── home/               # Pagina principal
│   ├── about/              # Pagina de informacion
│   └── languages/          # Selector de idiomas
├── components/             # Componentes compartidos
│   ├── ui/                 # Componentes base (botones, inputs, etc.)
│   ├── layout/             # Layout general (sidebar, containers)
│   ├── chat/               # Componentes de chat reutilizables
│   ├── header.tsx          # Header principal
│   ├── footer.tsx          # Footer
│   └── app-shell.tsx       # Shell de la aplicacion
├── lib/                    # Utilidades y logica compartida
│   ├── api/                # Clientes API por modulo
│   ├── api.ts              # Cliente API base
│   ├── hooks/              # Hooks personalizados
│   ├── types/              # Tipos TypeScript globales
│   ├── constants/          # Constantes de la app
│   ├── utils/              # Funciones utilitarias
│   └── utils.ts            # Utilidades generales (cn, etc.)
├── hooks/                  # Hooks globales
├── i18n/                   # Configuracion de internacionalizacion
└── types/                  # Tipos TypeScript adicionales
```

Carpetas adicionales en la raiz:

```
locales/                    # Archivos de traduccion (JSON)
public/                     # Assets estaticos (imagenes, iconos)
```

## Configuracion

### 1. Clonar el repositorio

```bash
git clone <url-del-repositorio>
cd Daisu
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Variables de entorno

Crear un archivo `.env.local` en la raiz del proyecto con las siguientes variables:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
API_URL=http://localhost:3001/api
NEXTAUTH_SECRET=tu-secreto-aqui
NEXTAUTH_URL=http://localhost:3000
```

| Variable | Descripcion |
|---|---|
| `NEXT_PUBLIC_API_URL` | URL publica de la API (accesible desde el cliente) |
| `API_URL` | URL de la API (accesible desde el servidor) |
| `NEXTAUTH_SECRET` | Secreto para firmar sesiones de NextAuth |
| `NEXTAUTH_URL` | URL base de la aplicacion |

### 4. Iniciar el servidor de desarrollo

```bash
npm run dev
```

La aplicacion estara disponible en `http://localhost:3000`.

## Scripts Disponibles

| Script | Comando | Descripcion |
|---|---|---|
| `dev` | `npm run dev` | Inicia el servidor de desarrollo con hot reload |
| `build` | `npm run build` | Genera el build de produccion |
| `start` | `npm run start` | Inicia el servidor de produccion |
| `lint` | `npm run lint` | Ejecuta ESLint para verificar el codigo |
