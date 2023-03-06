import { type NextPage } from "next"
import Head from "next/head"
import { Inter } from "next/font/google"
import clsx from "clsx"
import { signIn } from "next-auth/react"
import { env } from "~/env.mjs"

const inter = Inter({
	subsets: ["latin"],
})

const YouMustSignInWithASchoolEmail: NextPage = () => {
	return (
		<>
			<Head>
				<title>You must sign in with a school email</title>
			</Head>

			<main
				className={clsx(
					"fixed bottom-0 h-screen w-full bg-black text-9xl font-semibold text-white",
					inter.className
				)}
				style={{
					padding:
						"env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)",
				}}
			>
				<div
					onClick={() => signIn("google", { callbackUrl: "/" })}
					className="cursor-pointer select-none transition-all duration-150 hover:opacity-70 active:opacity-70"
				>
					You must sign in with an email address ending with{" "}
					{env.NEXT_PUBLIC_REQUIRED_EMAIL_ENDING}
				</div>
			</main>
		</>
	)
}

export default YouMustSignInWithASchoolEmail
