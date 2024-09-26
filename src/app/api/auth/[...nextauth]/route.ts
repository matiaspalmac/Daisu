import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";

// Verificar que la variable de entorno API_URL esté definida
const url_env = process.env.NEXT_PUBLIC_API_URL;

if (!url_env) {
  console.error("La URL de la API no está definida. Verifica la variable NEXT_PUBLIC_API_URL.");
}

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      try {
        if (!url_env) {
          console.error("La URL de la API no está definida.");
          return false; // Falla el proceso de sign-in si no está definida
        }

        // Verificar si el usuario ya existe en la API
        const getUsersResponse = await fetch(`${url_env}/api/getusers`, {
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!getUsersResponse.ok) {
          console.error(`Error al obtener la lista de usuarios: ${getUsersResponse.statusText}`);
          return false; // Error en la solicitud GET
        }

        const users = await getUsersResponse.json();
        const userExists = users.some((existingUser: { email: string }) => existingUser.email === user.email);

        // Si el usuario no existe, crear uno nuevo
        if (!userExists) {
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
            console.error(`Error al crear el usuario: ${createUserResponse.statusText}`);
            return false; // Error en la solicitud POST
          }
        }

        return true; // Todo salió bien, permitir sign-in
      } catch (error) {
        console.error("Error durante el proceso de inicio de sesión:", error);
        return false; // Error en la lógica de sign-in
      }
    },
  },
  // Habilitar el modo debug para obtener más información en caso de errores
  debug: process.env.NODE_ENV === 'development',
});

export { handler as GET, handler as POST };
