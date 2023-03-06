/** @type {import("prettier").Config} */
const config = {
	plugins: [require.resolve("prettier-plugin-tailwindcss")],
	useTabs: true,
	tabWidth: 4,
	semi: false,
	printWidth: 100,
}

module.exports = config
