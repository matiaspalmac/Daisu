import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";

const url_env = process.env.NEXT_PUBLIC_API_URL;
const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      try {
        // Verificar si las variables de entorno están definidas
        if (!url_env) {
          console.error('La URL de la API no está definida.');
          return false;
        }

        // Verificar si el usuario ya existe
        console.log('Usuario:', user);
        console.log('URL de la API:', url_env);

        const getUsersResponse = await fetch(`${url_env}/api/getusers`);
        if (!getUsersResponse.ok) {
          console.error('Error al obtener la lista de usuarios:', getUsersResponse.statusText);
          return false;
        }

        const users = await getUsersResponse.json();
        const userExists = users.some((existingUser: { email: string }) => existingUser.email === user.email);

        if (!userExists) {
          // Crear el usuario si no existe
          const createUserResponse = await fetch(`${url_env}/api/createuser`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              name: user.name,
              email: user.email,
              image: user.image,
            }),
          });

          if (!createUserResponse.ok) {
            console.error('Error al enviar los datos del usuario a la API:', createUserResponse.statusText);
            return false;
          }
        }

        return true;
      } catch (error) {
        console.error('Error durante el proceso de inicio de sesión:', error);
        return false;
      }
    },
  },
});

//aaa
export { handler as GET, handler as POST };
