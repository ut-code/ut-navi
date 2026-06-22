import js from "@eslint/js";
import { defineConfig } from "eslint/config";
import prettier from "eslint-config-prettier";
import svelte from "eslint-plugin-svelte";
import globals from "globals";
import ts from "typescript-eslint";
import svelteConfig from "./svelte.config.js";

export default defineConfig([
	// node_modules / .git は eslint がデフォルトで無視。生成物だけ追加で除外
	{ ignores: [".svelte-kit/", "build/"] },
	js.configs.recommended,
	ts.configs.recommended,
	svelte.configs.recommended,
	prettier,
	svelte.configs.prettier,
	{
		languageOptions: {
			// ブラウザ(マップ描画)と node(取得スクリプト)の両方を扱う
			globals: { ...globals.browser, ...globals.node },
		},
	},
	{
		files: ["**/*.svelte", "**/*.svelte.ts", "**/*.svelte.js"],
		languageOptions: {
			parserOptions: {
				projectService: true,
				extraFileExtensions: [".svelte"],
				parser: ts.parser,
				svelteConfig,
			},
		},
	},
	{
		// no-navigation-without-resolve はテンプレートリテラル内の resolve() を追跡できず、
		// クエリパラメータ付きリンク (/?campus=xxx) で誤検知する (Issue #1327)
		rules: {
			"svelte/no-navigation-without-resolve": ["error", { ignoreLinks: true }],
		},
	},
]);
