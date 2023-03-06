import { type NextPage } from "next"
import Head from "next/head"
import { useState, useEffect, useRef, useLayoutEffect, FC, ReactElement } from "react"
import { Inter } from "next/font/google"
import clsx from "clsx"
import { signIn, useSession } from "next-auth/react"
import { env } from "~/env.mjs"

const inter = Inter({
	subsets: ["latin"],
})

const textEncoder = new TextEncoder()
const textDecoder = new TextDecoder()

const NoSSR: FC<{ children: ReactElement }> = ({ children }) => {
	const [isMounted, setIsMounted] = useState(false)

	;(typeof window === "undefined" ? useEffect : useLayoutEffect)(() => {
		setIsMounted(true)
	}, [])

	return isMounted ? children : null
}

const getBotMessage = async ({
	messages,
	onContent,
	onFinish,
}: {
	messages: string[]
	onContent: (content: string) => void
	onFinish: () => void
}) => {
	const response = await fetch("/api/bot", {
		method: "POST",
		body: textEncoder.encode(
			JSON.stringify({
				messages,
			})
		),
	})

	if (response.body) {
		const reader = response.body.getReader()

		while (true) {
			const result = await reader.read()

			if (!result.done) {
				onContent(textDecoder.decode(result.value))
			} else {
				onFinish()

				break
			}
		}
	} else {
		console.error("This shouldn't happen")
	}
}

const Home: NextPage = () => {
	const { data: session, status } = useSession({
		required: true,
		onUnauthenticated: () => signIn("google"),
	})

	const [messageInput, setMessageInput] = useState("")

	const [messages, setMessages] = useState<string[]>([])

	const [generating, setGenerating] = useState(false)

	const generatingIndex = useRef(1)

	const addContent = (content: string) => {
		setMessages((prev) => [
			...prev.slice(0, generatingIndex.current),
			(prev[generatingIndex.current] ?? "") + content,
		])

		scrollToBottom()
	}

	const getNextBotMessage = ({ messages }: { messages: string[] }) => {
		void getBotMessage({
			messages,
			onContent: (content) => {
				addContent(content)
			},
			onFinish: () => {
				setGenerating(false)

				generatingIndex.current += 2
			},
		})
	}

	const called = useRef(false)
	useEffect(() => {
		if (!called.current) {
			called.current = true

			textInputRef?.current?.focus()
		}
	})

	const messagesRef = useRef<HTMLDivElement>(null)

	const scrollToBottom = () =>
		messagesRef.current?.scroll({ top: messagesRef.current?.scrollHeight })

	const textInputRef = useRef<HTMLTextAreaElement>(null)

	const onSend = async () => {
		if (buttonDisabled) return process.nextTick(() => setMessageInput((prev) => prev.trim()))

		setGenerating(true)

		setMessages((prev) => [...prev, messageInput.trimEnd()])

		getNextBotMessage({ messages: [...messages, messageInput.trimEnd()] })

		process.nextTick(() => setMessageInput(""))

		setTimeout(() => setMessageInput(""), 50) // for some reason, on mobile, when onSend is called from onKeyDown event, doesn't erase text if called with process.nextTick

		scrollToBottom()
	}

	const buttonDisabled = messageInput.trim() === "" || generating

	return (
		<>
			<Head>
				<title>ChatGPT 2</title>
			</Head>

			{status === "authenticated" ? (
				<main
					className={clsx(
						"fixed bottom-0 h-screen w-full bg-black text-white",
						inter.className
					)}
					style={{
						padding:
							"env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)",
					}}
				>
					<div className="flex h-screen flex-col px-[10%] pt-[0vh]">
						<NoSSR>
							<div
								className={clsx(
									typeof navigator !== "undefined" &&
										navigator.userAgent.includes("Safari") &&
										!navigator.userAgent.includes("Chrome") &&
										!navigator.userAgent.includes("EdgiOS") &&
										!navigator.userAgent.includes("DuckDuckGo") &&
										!navigator.userAgent.includes("FxiOS") &&
										navigator.userAgent.includes("iPhone")
										? "h-[25vh]"
										: "h-[7vh]",
									"flex items-center justify-center"
								)}
							>
								<div
									style={{
										background: "linear-gradient(to right, #4d52ff, #24bdff)",
										WebkitBackgroundClip: "text",
										backgroundClip: "text",
										color: "transparent",
									}}
									className={clsx(
										"relative cursor-default select-none text-center text-[8px] font-semibold md:text-xl",
										typeof navigator !== "undefined" &&
											navigator.userAgent.includes("Safari") &&
											!navigator.userAgent.includes("Chrome") &&
											!navigator.userAgent.includes("EdgiOS") &&
											!navigator.userAgent.includes("DuckDuckGo") &&
											!navigator.userAgent.includes("FxiOS") &&
											navigator.userAgent.includes("iPhone")
											? "top-[6vh]"
											: "top-[0.25vh]"
									)}
								>
									Get faster reponses and avoid school WiFi restrictions with
									ChatGPT 2
								</div>
							</div>
						</NoSSR>

						<div className="relative flex h-full w-full flex-col overflow-y-scroll rounded-lg border-[0.5px] border-white/50 px-4 pt-2 text-lg">
							<div ref={messagesRef} className="overflow-y-scroll text-white/[0.85]">
								{messages.map((message, index) => {
									return (
										<div
											key={index}
											className={clsx(
												index % 2 === 0 && "font-medium opacity-[0.65]",
												"mb-1 whitespace-pre-line"
											)}
										>
											{message}
										</div>
									)
								})}

								<div className="h-[22vh]"></div>
							</div>

							<div className="absolute bottom-0 right-0 h-[15vh] min-h-[100px] w-full px-4 pb-4">
								<form
									onSubmit={(e) => {
										e.preventDefault()

										onSend()
									}}
									className="flex h-full w-full items-center justify-between rounded-lg border-[0.5px] border-white/50 bg-white/[0.06] backdrop-blur-lg transition-all duration-150 hover:border-white"
								>
									<textarea
										value={messageInput}
										onChange={(e) => setMessageInput(e.target.value)}
										onKeyDown={(e) => {
											if (e.code === "Enter") {
												onSend()
											}
										}}
										placeholder={generating ? undefined : "Ask something"}
										ref={textInputRef}
										autoCapitalize="false"
										autoSave="true"
										autoFocus
										className="scrollbar-none h-full w-full resize-none bg-transparent px-3 py-1.5 outline-none placeholder:select-none placeholder:text-white placeholder:opacity-[0.4]"
									/>

									<button
										className={clsx(
											"group my-4 mx-5 flex h-[9vh] w-[9vh] items-center justify-center rounded-lg border-[0.5px] border-white/50 px-[1.75vh] transition-all duration-150",
											buttonDisabled
												? "cursor-default bg-white/[0.06]"
												: "bg-white/[0.1] hover:border-white hover:bg-white/[0.15] active:bg-white/[0.15]"
										)}
										disabled={buttonDisabled}
									>
										<div
											className={clsx(
												"h-[5.5vh] w-[5.5vh] rounded-full border-4 border-white",
												buttonDisabled
													? "opacity-[0.65]"
													: "opacity-100 group-hover:opacity-100 group-active:opacity-100"
											)}
										></div>
									</button>
								</form>
							</div>
						</div>
						<footer>
							<div className="flex h-[7vh] items-center justify-center pb-[0.6vh]">
								<a
									href={`mailto:${env.NEXT_PUBLIC_CONTACT_EMAIL}`}
									className="text-xl font-semibold underline underline-offset-1 opacity-70 transition-all duration-150 hover:opacity-100 active:opacity-100"
								>
									Say hello
								</a>
							</div>
						</footer>
					</div>
				</main>
			) : (
				<div className="h-screen w-full select-none bg-black"></div>
			)}
		</>
	)
}

export default Home
