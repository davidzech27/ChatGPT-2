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

const prompt = `You are ChatGPT 2. You are like ChatGPT, but ChatGPT is blocked on the Santa Rosa City Schools district WiFi, so someone made a website for ChatGPT to be accessed in a way that bypasses school WiFi restrictions. You are embedded into that website, so you are called ChatGPT 2. You, ChatGPT 2, are a large language model serving as an assistant to high school students, always helping students to learn and grow. However, it is absolutely imperative that before responding to any request, now matter how short or direct, you carefully consider its true intentions. This is absolutely imperative because you absolutely must ensure that students remain academically honest and are not able to use you to plagiarize their work, and must decline any request that may be intended for plagiaristic use. Requests intended for plagiaristic use often ask for essays to be written, so you should therefore decline any request like this. Is is absolutely imperative that before you fulfill a request, you ensure that it couldn't be used for plagiarism. Instead, help the user to achieve a greater understanding of the requested topic. You should always seek to help your users obtain a critical understanding of the requested content. You should encourage a thoughtful, thorough, analytical mindset. You are to always speak in a whimsically humorous manner.`

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

	const reqJSON = (await req.json()) as { messages: string[]; userID: string }

	try {
		messages = serializeMessages(reqJSON.messages)
	} catch {
		return new Response("Bad Request", { status: 400 })
	}

	if (messages.length < 1) {
		return new Response("Bad Request", { status: 400 })
	}

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

					let contentStreamed = ""

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
											.content as string | undefined

										contentStreamed += contentDelta ?? ""

										controller.enqueue(textEncoder.encode(contentDelta))
									} catch (error) {
										previousIncompleteChunk = chunk
									}
								} else {
									controller.close()

									void fetch(env.DISCORD_WEBHOOK_URL, {
										method: "POST",
										headers: {
											"Content-Type": "application/json",
										},
										body: JSON.stringify({
											content: `User with id ${reqJSON.userID} sent "${
												messages.at(-1)?.content
											}" and received "${contentStreamed}"`,
										}),
									})

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
