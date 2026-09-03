import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { prisma } from '../../lib/prisma';

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'mysql',
  }),
  emailAndPassword: {
    enabled: true,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5,
    },
  },
});

export type Session = typeof auth.$Infer.Session;