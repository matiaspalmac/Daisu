<p align="center">
  <h1 align="center">Daisu</h1>
  <p align="center">A social language learning platform — practice languages in real-time with people around the world.</p>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-000000?style=for-the-badge&logo=nextdotjs&logoColor=white" alt="Next.js 16" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React 19" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/Socket.IO-4-010101?style=for-the-badge&logo=socketdotio&logoColor=white" alt="Socket.IO" />
  <img src="https://img.shields.io/badge/i18n-ES%20%7C%20EN%20%7C%20PT-8B5CF6?style=for-the-badge&logo=googletranslate&logoColor=white" alt="i18n" />
</p>

---

## About

Daisu is a social platform designed for language learners who want to practice through real-time conversation. Users can join chat rooms organized by language and proficiency level, interact with native speakers, track their progress on leaderboards, and access curated learning resources — all within a multilingual interface available in Spanish, English, and Portuguese.

## Features

- **Real-time chat rooms** — Join language-specific rooms organized by CEFR level (A1 through C2) with live messaging powered by Socket.IO
- **Peer corrections** — Request and provide corrections directly within conversations
- **Private messaging** — Send direct messages and room invitations to other users
- **In-message translation** — Translate messages on the fly to aid comprehension
- **Leaderboards** — Track activity and progress across the community
- **Vocabulary builder** — Build and review personal vocabulary lists
- **Quizzes** — Test your knowledge with interactive language quizzes
- **Learning resources** — Browse textbooks, videos, articles, and curated links
- **Events** — Discover and participate in community language events
- **User profiles & dashboard** — Manage your profile, view stats, and monitor learning progress
- **Membership tiers** — Access premium features through membership plans
- **Multilingual UI** — Full interface localization in Spanish, English, and Portuguese (Brazil)
- **Authentication** — Secure sign-in with NextAuth.js (Google OAuth support)
- **Notifications & announcements** — Stay up to date with system-wide banners and a notification bell
- **Online presence indicators** — See who is currently online in rooms
- **Emoji reactions** — React to messages with emojis
- **Dark/light theme** — Toggle between themes via the built-in theme provider

## Screenshots

<!-- Add screenshots here -->

| Home | Chat | Dashboard |
|------|------|-----------|
| ![Home](docs/screenshots/home.png) | ![Chat](docs/screenshots/chat.png) | ![Dashboard](docs/screenshots/dashboard.png) |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | [Next.js 16](https://nextjs.org/) (App Router) |
| UI Library | [React 19](https://react.dev/) |
| Language | [TypeScript 5](https://www.typescriptlang.org/) |
| Styling | [Tailwind CSS 4](https://tailwindcss.com/) |
| Animations | [Framer Motion](https://www.framer.com/motion/) |
| Real-time | [Socket.IO Client](https://socket.io/) |
| Auth | [NextAuth.js](https://next-auth.js.org/) |
| i18n | [next-intl](https://next-intl-docs.vercel.app/) |
| UI Components | [Radix UI](https://www.radix-ui.com/) + [shadcn/ui](https://ui.shadcn.com/) |
| Icons | [Lucide React](https://lucide.dev/) |

## Getting Started

### Prerequisites

- **Node.js** >= 18
- **npm** (or your preferred package manager)
- A running backend API (the app connects to `NEXT_PUBLIC_API_URL`)

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/daisu.git
cd daisu

# Install dependencies
npm install
```

### Environment Variables

Create a `.env.local` file in the project root:

```env
# Backend API
NEXT_PUBLIC_API_URL=http://localhost:4000

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-here

# OAuth providers
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

### Running the App

```bash
# Development
npm run dev

# Production build
npm run build
npm start

# Lint
npm run lint
```

The app will be available at [http://localhost:3000](http://localhost:3000).

## Project Structure

```
src/
├── app/
│   ├── [locale]/          # Locale-based routing (es, en, br)
│   │   ├── chat/          # Real-time chat rooms
│   │   ├── dashboard/     # User dashboard
│   │   ├── languages/     # Language catalog & detail pages
│   │   ├── leaderboard/   # Community leaderboard
│   │   ├── vocabulary/    # Vocabulary builder
│   │   ├── quiz/          # Language quizzes
│   │   ├── resources/     # Textbooks, videos, articles, links
│   │   ├── events/        # Community events
│   │   ├── profile/       # User profile
│   │   ├── membership/    # Membership plans & checkout
│   │   ├── messages/      # Private messages
│   │   ├── search/        # Global search
│   │   └── ...            # Auth, legal, and info pages
│   └── api/
│       └── auth/          # NextAuth.js API route
├── components/
│   ├── chat/              # Chat-specific components
│   ├── ui/                # Reusable UI primitives (shadcn/ui)
│   ├── header.tsx         # App header with navigation
│   ├── footer.tsx         # App footer
│   └── app-shell.tsx      # Main layout shell
├── hooks/                 # Custom React hooks
├── i18n/                  # Internationalization config & routing
├── lib/                   # Utilities and API client
└── types/                 # TypeScript type declarations
locales/
├── es.json                # Spanish translations
├── en.json                # English translations
└── br.json                # Portuguese (Brazil) translations
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/my-feature`)
3. Commit your changes (`git commit -m 'Add my feature'`)
4. Push to the branch (`git push origin feature/my-feature`)
5. Open a Pull Request

## License

This project is proprietary. All rights reserved.
