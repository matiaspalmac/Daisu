import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

const apiUrl = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL;
const nextAuthSecret = process.env.NEXTAUTH_SECRET;

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
            return user;
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
        token.isAdmin = user.isAdmin;
        token.bio = user.bio;
        token.nativelang = user.nativelang;
        token.learninglang = user.learninglang;
        token.created_at = user.created_at;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as number;
        session.user.isAdmin = token.isAdmin as boolean;
        session.user.bio = token.bio as string;
        session.user.nativelang = token.nativelang as string;
        session.user.learninglang = token.learninglang as string;
        session.user.created_at = token.created_at as string;
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