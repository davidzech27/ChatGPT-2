import { type NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import { env } from "~/env.mjs"
import { webhookClient } from "~/lib/discord"

export const authOptions: NextAuthOptions = {
	providers: [
		GoogleProvider({
			clientId: env.GOOGLE_CLIENT_ID,
			clientSecret: env.GOOGLE_CLIENT_SECRET,
			authorization: {
				params: {
					prompt: "consent",
					access_type: "offline",
					response_type: "code",
				},
			},
		}),
	],
	callbacks: {
		signIn: ({ user }) => {
			void webhookClient.send(`User with email "${user.email}" signing up`)

			if (!user.email?.endsWith(env.NEXT_PUBLIC_REQUIRED_EMAIL_ENDING)) {
				return "/YouMustSignInWithASchoolEmail"
			}

			return true
		},
	},
}
