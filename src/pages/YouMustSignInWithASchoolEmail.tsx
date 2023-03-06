import { type NextPage } from "next"
import { type FC, type ReactElement, useEffect, useLayoutEffect, useState } from "react"
import Head from "next/head"
import { Inter } from "next/font/google"
import clsx from "clsx"
import { signIn } from "next-auth/react"
import { env } from "~/env.mjs"

const inter = Inter({
	subsets: ["latin"],
})

const NoSSR: FC<{ children: ReactElement }> = ({ children }) => {
	const [isMounted, setIsMounted] = useState(false)

	;(typeof window === "undefined" ? useEffect : useLayoutEffect)(() => {
		setIsMounted(true)
	}, [])

	return isMounted ? children : null
}

const YouMustSignInWithASchoolEmail: NextPage = () => {
	return (
		<>
			<Head>
				<title>You must sign in with a school email</title>
			</Head>

			<main
				className={clsx(
					"fixed bottom-0 h-screen w-full bg-black text-7xl font-semibold text-white md:text-9xl",
					inter.className
				)}
				style={{
					padding:
						"env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)",
				}}
			>
				<NoSSR>
					<div
						className={
							typeof navigator !== "undefined" &&
							navigator.userAgent.includes("Safari") &&
							!navigator.userAgent.includes("Chrome") &&
							!navigator.userAgent.includes("EdgiOS") &&
							!navigator.userAgent.includes("DuckDuckGo") &&
							!navigator.userAgent.includes("FxiOS") &&
							navigator.userAgent.includes("iPhone")
								? "h-[9vh]"
								: "h-0"
						}
					></div>
				</NoSSR>

				<div
					onClick={() => signIn("google", { callbackUrl: "/" })}
					className="cursor-pointer select-none break-words transition-all duration-150 hover:opacity-70 active:opacity-70"
				>
					You must sign in with an email address ending with{" "}
					{env.NEXT_PUBLIC_REQUIRED_EMAIL_ENDING}
				</div>
			</main>
		</>
	)
}

export default YouMustSignInWithASchoolEmail
