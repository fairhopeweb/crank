import {xm} from "@b9g/crank";
import type {Context, Element} from "@b9g/crank";

//import {Edit} from "@b9g/revise/edit.js";
import {Keyer} from "@b9g/revise/keyer.js";
import {EditHistory} from "@b9g/revise/history.js";
import Prism from "prismjs";
import type {Token} from "prismjs";
import "prismjs/components/prism-typescript.js";
import {ContentArea} from "./contentarea.js";

const IS_CLIENT = typeof document !== "undefined";

export function* PrismEditor(
	this: Context,
	{
		value,
		language,
		editable,
	}: {value: string; language: string; editable?: boolean},
) {
	const keyer = new Keyer();
	const editHistory = new EditHistory();
	let selectionRange: SelectionRange | undefined;
	let renderSource: string | undefined;
	this.addEventListener("contentchange", (ev: any) => {
		const {edit, source} = ev.detail;
		const normalizedEdit = edit.normalize();
		keyer.transform(normalizedEdit);
		if (source === "refresh") {
			return;
		} else if (source !== "history") {
			editHistory.append(normalizedEdit);
		}

		value = ev.target.value;
		renderSource = "refresh";
		this.refresh();
	});

	// should be added to history stuff
	// TODO: restore this to a state where it worked.
	//this.addEventListener("beforeinput", (ev: any) => {
	//	switch (ev.inputType) {
	//		case "historyUndo": {
	//			ev.preventDefault();
	//			const edit = editHistory.undo();
	//			if (edit) {
	//				selectionRange = selectionRangeFromEdit(edit);
	//				value = edit.apply(value);
	//				renderSource = "history";
	//				this.refresh();
	//			}
	//			break;
	//		}
	//		case "historyRedo": {
	//			ev.preventDefault();
	//			const edit = editHistory.redo();
	//			if (edit) {
	//				value = edit.apply(value);
	//				selectionRange = selectionRangeFromEdit(edit);
	//				renderSource = "history";
	//				this.refresh();
	//			}
	//			break;
	//		}
	//	}
	//});

	//// Potato quality tab-matching.
	//// TODO: dedent when we see closing characters.
	/*
	this.addEventListener("keydown", (ev: any) => {
		if (ev.key === "Enter") {
			let {value: value1, selectionStart: selectionStart1, selectionEnd} = area;
			if (selectionStart1 !== selectionEnd) {
				return;
			}

			// A reasonable length to look for tabs and braces.
			const prev = value.slice(0, selectionStart1);
			const tabMatch = prev.match(/[\r\n]?([^\S\r\n]*).*$/);
			// [^\S\r\n] = non-newline whitespace
			const prevMatch = prev.match(/({|\(|\[)([^\S\r\n]*)$/);
			if (prevMatch) {
				// increase tab
				ev.preventDefault();
				const next = value1.slice(selectionStart1);
				const startBracket = prevMatch[1];
				const startWhitespace = prevMatch[2];
				let insertBefore = "\n";
				if (tabMatch) {
					insertBefore += tabMatch[1] + "  ";
				}

				// TODO: use Edit.createBuilder
				let edit = Edit.build(
					value1,
					insertBefore,
					selectionStart1,
					selectionStart1 + startWhitespace.length,
				);

				selectionStart1 -= startWhitespace.length;
				selectionStart1 += insertBefore.length;

				const closingMap: Record<string, string> = {
					"{": "}",
					"(": ")",
					"[": "]",
				};
				let closing = closingMap[startBracket];
				if (closing !== "}") {
					closing = "\\" + closing;
				}
				const nextMatch = next.match(
					new RegExp(String.raw`^([^\S\r\n]*)${closing}`),
				);

				if (nextMatch) {
					const value2 = edit.apply(value1);
					const endWhitespace = nextMatch[1];
					const insertAfter = tabMatch ? "\n" + tabMatch[1] : "\n";
					// TODO: use Edit.createBuilder
					const edit1 = Edit.build(
						value2,
						insertAfter,
						selectionStart1,
						selectionStart1 + endWhitespace.length,
					);

					edit = edit.compose(edit1);
				}

				value = edit.apply(value1);
				selectionRange = {
					selectionStart: selectionStart1,
					selectionEnd: selectionStart1,
					selectionDirection: "none",
				};
				renderSource = "tab";
				this.refresh();
			} else if (tabMatch && tabMatch[1].length) {
				// match the tabbing of the previous line
				ev.preventDefault();
				const insertBefore = "\n" + tabMatch[1];
				// TODO: use Edit.createBuilder
				const edit = Edit.build(value1, insertBefore, selectionStart1);
				value = edit.apply(value1);
				selectionRange = {
					selectionStart: selectionStart1 + insertBefore.length,
					selectionEnd: selectionStart1 + insertBefore.length,
					selectionDirection: "none",
				};
				renderSource = "tab";
				this.refresh();
			}
		}
	});
	*/

	let value1: string;
	for ({value: value1, language, editable = true} of this) {
		this.schedule(() => {
			selectionRange = undefined;
			renderSource = undefined;
		});

		if (renderSource == null) {
			value = value1;
		}

		// adding a line so that we can do shit
		value = value.match(/(?:\r|\n|\r\n)$/) ? value : value + "\n";
		const grammar = Prism.languages[language] || Prism.languages.javascript;
		const lines = splitLines(Prism.tokenize(value || "", grammar));
		let index = 0;
		yield xm`
			<div style="overflow: hidden auto; height: 100%">
				<div
					style="
						display: flex;
						flex-direction: row;
						min-height: 100%;
						flex: 1 0 50%;
					"
				>
					<div
						style="
							min-width: 3em;
							margin: 0;
							padding: 1em;
							color: #fff;
							font-size: 14px;
							font-family: monospace;
							line-height: 1.4;
							border-right: 1px solid white;
							text-align: right;
						"
					>${lines.map((_, l) => {
						return xm`<div class="prism-editor-linenumber">${l + 1}</div>`;
					})}</div>
					<${ContentArea}
						value=${value}
						renderSource=${renderSource}
						selectionRange=${selectionRange}
						style="
							display: block;
							flex: 1 1 auto;
							white-space: pre-wrap;
							white-space: break-spaces;
							word-break: break-all;
							width: 100%;
						"
					>
						<pre
							autocomplete="off"
							autocorrect="off"
							autocapitalize="off"
							contenteditable=${IS_CLIENT && editable}
							spellcheck="false"
						>
							${lines.map((line, l) => {
								const key = keyer.keyAt(index);
								const length =
									line.reduce((length, t) => length + t.length, 0) +
									"\n".length;
								index += length;
								return xm`
									<div class="prism-line" data-line-number=${l + 1} $key=${key}>
										<code>${printTokens(line)}</code>
										<br />
									</div>
								`;
							})}
						</pre>
					<//ContentArea>
				</div>
			</div>
		`;
	}
}

function splitLines(
	tokens: Array<Token | string>,
): Array<Array<Token | string>> {
	const lines = splitLinesRec(tokens);
	// Dealing with trailing newlines
	if (lines.length && !lines[lines.length - 1].length) {
		lines.pop();
	}

	return lines;
}

// @ts-ignore
Prism.manual = true;
function splitLinesRec(
	tokens: Array<Token | string>,
): Array<Array<Token | string>> {
	let currentLine: Array<Token | string> = [];
	const lines: Array<Array<Token | string>> = [currentLine];
	for (let i = 0; i < tokens.length; i++) {
		const token = tokens[i];
		if (typeof token === "string") {
			const split = token.split(/\r\n|\r|\n/);
			for (let j = 0; j < split.length; j++) {
				if (j > 0) {
					lines.push((currentLine = []));
				}

				const token1 = split[j];
				if (token1) {
					currentLine.push(token1);
				}
			}
		} else {
			const split = splitLinesRec(wrapContent(token.content));
			if (split.length > 1) {
				for (let j = 0; j < split.length; j++) {
					if (j > 0) {
						lines.push((currentLine = []));
					}

					const line = split[j];
					if (line.length) {
						const token1 = new Prism.Token(
							token.type,
							unwrapContent(line),
							token.alias,
						);
						token1.length = line.reduce((l, t) => l + t.length, 0);
						currentLine.push(token1);
					}
				}
			} else {
				currentLine.push(token);
			}
		}
	}

	return lines;
}

function wrapContent(
	content: Array<Token | string> | Token | string,
): Array<Token | string> {
	return Array.isArray(content) ? content : [content];
}

function unwrapContent(
	content: Array<Token | string>,
): Array<Token | string> | string {
	if (content.length === 0) {
		return "";
	} else if (content.length === 1 && typeof content[0] === "string") {
		return content[0];
	}

	return content;
}

function printTokens(tokens: Array<Token | string>): Array<Element | string> {
	const result: Array<Element | string> = [];
	for (let i = 0; i < tokens.length; i++) {
		const token = tokens[i];
		if (typeof token === "string") {
			result.push(token);
		} else {
			const children = Array.isArray(token.content)
				? printTokens(token.content)
				: token.content;
			let className = "token " + token.type;
			if (Array.isArray(token.alias)) {
				className += " " + token.alias.join(" ");
			} else if (typeof token.alias === "string") {
				className += " " + token.alias;
			}

			result.push(xm`<span class=${className}>${children}</span>`);
		}
	}

	return result;
}

interface SelectionRange {
	selectionStart: number;
	selectionEnd: number;
	selectionDirection: string;
}

/*** Revise Logic ***/
//async function checkpointEditHistoryBySelection(
//	ctx: Context,
//	editHistory: EditHistory,
//) {
//	const area: any = await new Promise((resolve) => ctx.schedule(resolve));
//	let oldSelectionRange: SelectionRange | undefined;
//	ctx.addEventListener("contentchange", () => {
//		oldSelectionRange = {
//			selectionStart: area.selectionStart,
//			selectionEnd: area.selectionEnd,
//			selectionDirection: area.selectionDirection,
//		};
//	});
//
//	const onselectionchange = () => {
//		const newSelectionRange = {
//			selectionStart: area.selectionStart,
//			selectionEnd: area.selectionEnd,
//			selectionDirection: area.selectionDirection,
//		};
//		if (
//			oldSelectionRange &&
//			(oldSelectionRange.selectionStart !== newSelectionRange.selectionStart ||
//				oldSelectionRange.selectionEnd !== newSelectionRange.selectionEnd ||
//				oldSelectionRange.selectionDirection !==
//					newSelectionRange.selectionDirection)
//		) {
//			editHistory.checkpoint();
//		}
//
//		oldSelectionRange = newSelectionRange;
//	};
//
//	document.addEventListener("selectionchange", onselectionchange);
//	ctx.cleanup(() => {
//		document.removeEventListener("selectionchange", onselectionchange);
//	});
//}
//
//function selectionRangeFromEdit(edit: Edit): SelectionRange | undefined {
//	const operations = edit.operations();
//	let index = 0;
//	let start: number | undefined;
//	let end: number | undefined;
//	for (const op of operations) {
//		switch (op.type) {
//			case "delete": {
//				if (start === undefined) {
//					start = index;
//				}
//
//				break;
//			}
//
//			case "insert": {
//				if (start === undefined) {
//					start = index;
//				}
//
//				index += op.value.length;
//				end = index;
//				break;
//			}
//
//			case "retain": {
//				index += op.end - op.start;
//				break;
//			}
//		}
//	}
//
//	if (start !== undefined && end !== undefined) {
//		return {
//			selectionStart: start,
//			selectionEnd: end,
//			selectionDirection: "forward",
//		};
//	} else if (start !== undefined) {
//		return {
//			selectionStart: start,
//			selectionEnd: start,
//			selectionDirection: "none",
//		};
//	}
//
//	return undefined;
//}
