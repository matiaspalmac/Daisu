import { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: number;
      isAdmin: boolean;
      bio?: string;
      nativelang?: string;
      learninglang?: string;
      created_at?: string;
      accessToken?: string;
      membership_tier?: string;
    } & DefaultSession["user"]
  }

  interface User {
    id: number;
    isAdmin: boolean;
    bio?: string;
    nativelang?: string;
    learninglang?: string;
    created_at?: string;
    accessToken?: string;
    membership_tier?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: number;
    isAdmin: boolean;
    bio?: string;
    nativelang?: string;
    learninglang?: string;
    created_at?: string;
    accessToken?: string;
    membership_tier?: string;
  }
}
