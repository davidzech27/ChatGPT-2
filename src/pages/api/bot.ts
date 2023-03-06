import { withAuth } from "next-auth/middleware"
import { env } from "~/env.mjs"

export const config = {
	runtime: "edge",
}

const model = "gpt-3.5-turbo"

interface Message {
	role: "assistant" | "user" | "system"
	content: string
	name?: string
}

const prompt = `You are ChatGPT 2. You are essentially the same as ChatGPT, but ChatGPT is blocked on the Santa Rosa City Schools district WiFi, so someone made a website for ChatGPT to be accessed in a way that bypasses school WiFi restrictions. You are embedded into that website, so you are called ChatGPT 2. You, ChatGPT 2, are a large language model serving as an assistant to high school students, and are to always speak in a whimsically humorous manner. It is absolutely imperative that you are not judgemental in any way.`

const textEncoder = new TextEncoder()
const textDecoder = new TextDecoder()

const serializeMessages = (messageStrings: string[]) => {
	const messages: Message[] = [{ content: prompt, role: "system" }]

	messageStrings.forEach((messageString, index) =>
		messages.push({ content: messageString, role: index % 2 === 0 ? "user" : "assistant" })
	)

	return messages
}

export default withAuth(async function (req) {
	if (req.method !== "POST") {
		return new Response("Method Not Allowed", { status: 405 })
	}

	let messages: Message[]

	try {
		messages = serializeMessages((await req.json()).messages as string[])
	} catch {
		return new Response("Bad Request", { status: 400 })
	}

	if (messages.length < 1) {
		return new Response("Bad Request", { status: 400 })
	}

	const email = req.nextauth.token?.email

	void fetch(env.DISCORD_WEBHOOK_URL, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			content: `User with email "${email}" sent message "${messages.at(-1)?.content}"`,
		}),
	})

	const response = await fetch("https://api.openai.com/v1/chat/completions", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${env.OPENAI_SECRET_KEY}`,
		},
		body: JSON.stringify({
			messages,
			model,
			temperature: 0,
			stream: true,
		}),
	})

	return new Response(
		new ReadableStream({
			start: async (controller) => {
				if (response.body) {
					const reader = response.body.getReader()

					let previousIncompleteChunk: Uint8Array | undefined = undefined

					while (true) {
						const result = await reader.read()

						if (!result.done) {
							let chunk = result.value

							if (previousIncompleteChunk !== undefined) {
								const newChunk = new Uint8Array(
									previousIncompleteChunk.length + chunk.length
								)

								newChunk.set(previousIncompleteChunk)

								newChunk.set(chunk, previousIncompleteChunk.length)

								chunk = newChunk

								previousIncompleteChunk = undefined
							}

							const parts = textDecoder
								.decode(chunk)
								.split("\n")
								.filter((line) => line !== "")
								.map((line) => line.replace(/^data: /, ""))

							for (const part of parts) {
								if (part !== "[DONE]") {
									try {
										const contentDelta = JSON.parse(part).choices[0].delta
											.content as string

										controller.enqueue(textEncoder.encode(contentDelta))
									} catch (error) {
										previousIncompleteChunk = chunk

										console.error(error)
									}
								} else {
									controller.close()

									return
								}
							}
						} else {
							console.error(
								"This also shouldn't happen, because controller should be close()ed before getting to end of stream"
							)
						}
					}
				} else {
					console.error("This shouldn't happen")
				}
			},
		}),
		{
			headers: { "Content-Type": "text/plain; charset=utf-8" },
		}
	)
})
