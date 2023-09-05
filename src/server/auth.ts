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

			const emailDomain = user.email?.split(".").at(-1)

			if (emailDomain !== "net" && emailDomain !== "org" && emailDomain !== "edu") {
				return "/YouMustSignInWithASchoolEmail"
			}

			return true
		},
	},
}
