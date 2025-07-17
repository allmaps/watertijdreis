import translations from "./translations";

export const state = $state({locale: "en"});
export const locales = Object.keys(translations);

function translate(locale: string, key: symbol, context: Record<string, never>) {
	if (!key) throw new Error("no key provided to t()");
	if (!locale) throw new Error(`no translation for language with key "${key.toString()}"`);

	let text = translations[locale][key];

	if (!text) throw new Error(`no translation found for ${locale}.${key.toString()}`);

	Object.keys(context).map((k) => {
		const regex = new RegExp(`{{${k}}}`, "g");
		text = text.replace(regex, context[k]);
	});

	return text;
}


export const t = (key: symbol, context = {}) => translate(state.locale, key, context);