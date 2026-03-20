import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

const apiUrl = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL;
const nextAuthSecret = process.env.NEXTAUTH_SECRET;

const normalizeString = (value: unknown, max = 120) => {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
};

const normalizeImage = (value: unknown) => {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (!trimmed || trimmed.startsWith("data:")) return "";
  return trimmed.slice(0, 500);
};

if (!apiUrl) {
  console.error("La URL de la API no está definida. Verifica la variable API_URL o NEXT_PUBLIC_API_URL.");
}

if (process.env.NODE_ENV === 'production' && !nextAuthSecret) {
  throw new Error('NEXTAUTH_SECRET es requerido en producción');
}

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          const res = await fetch(`${apiUrl}/api/login`, {
            method: 'POST',
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password,
            }),
            headers: { "Content-Type": "application/json" }
          });

          if (!res.ok) {
            return null; // authentication failed
          }

          const user = await res.json();
          if (user) {
            return {
              id: Number(user.id) || 0,
              name: normalizeString(user.name),
              email: normalizeString(user.email),
              image: normalizeImage(user.image),
              isAdmin: Boolean(user.isAdmin),
              nativelang: normalizeString(user.nativelang, 12),
              learninglang: normalizeString(user.learninglang, 12),
              accessToken: typeof user.token === 'string' ? user.token : '',
              membership_tier: normalizeString(user.membership_tier, 20) || 'free',
            };
          }
          return null;
        } catch (error) {
          console.error("Error logging in:", error);
          return null;
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = Number(user.id);
        token.name = normalizeString(user.name);
        token.email = normalizeString(user.email);
        token.image = normalizeImage(user.image);
        token.isAdmin = Boolean(user.isAdmin);
        token.nativelang = normalizeString(user.nativelang, 12);
        token.learninglang = normalizeString(user.learninglang, 12);
        token.accessToken = user.accessToken || '';
        token.membership_tier = user.membership_tier || 'free';
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as number;
        session.user.name = (token.name as string) || session.user.name || '';
        session.user.email = (token.email as string) || session.user.email || '';
        session.user.image = (token.image as string) || session.user.image || '';
        session.user.isAdmin = token.isAdmin as boolean;
        session.user.nativelang = token.nativelang as string;
        session.user.learninglang = token.learninglang as string;
        session.user.accessToken = (token.accessToken as string) || '';
        session.user.membership_tier = (token.membership_tier as string) || 'free';
      }
      return session;
    }
  },
  session: {
    strategy: "jwt",
  },
  secret: nextAuthSecret,
  pages: {
    signIn: '/login', // custom login page
  },
  debug: process.env.NODE_ENV === 'development',
});

export { handler as GET, handler as POST };