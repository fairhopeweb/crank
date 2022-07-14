import {suite} from "uvu";
import * as Assert from "uvu/assert";

import {createElement, Children, Context, Element} from "../src/crank.js";
import {renderer} from "../src/dom.js";

const test = suite("suspense");

async function Fallback({
	children,
	timeout,
}: {
	children: Children;
	timeout: number;
}): Promise<Children> {
	await new Promise((resolve) => setTimeout(resolve, timeout));
	return children;
}

async function* Suspense(
	this: Context,
	{
		children,
		fallback,
		timeout = 100,
	}: {children: Children; fallback: Children; timeout?: number},
): AsyncGenerator<Children> {
	for await ({children, fallback, timeout = 1000} of this) {
		yield <Fallback timeout={timeout}>{fallback}</Fallback>;
		yield children;
	}
}

async function Child({timeout}: {timeout?: number}): Promise<Element> {
	await new Promise((resolve) => setTimeout(resolve, timeout));
	return <span>Child {timeout}</span>;
}

test.after.each(() => {
	renderer.render(null, document.body);
	document.body.innerHTML = "";
});

test("basic", async () => {
	await renderer.render(
		<Suspense fallback={<span>Loading...</span>} timeout={100}>
			<Child timeout={200} />
		</Suspense>,
		document.body,
	);

	Assert.is(document.body.innerHTML, "<span>Loading...</span>");
	await new Promise((resolve) => setTimeout(resolve, 200));
	Assert.is(document.body.innerHTML, "<span>Child 200</span>");

	await renderer.render(
		<Suspense fallback={<span>Loading...</span>} timeout={100}>
			<Child timeout={200} />
		</Suspense>,
		document.body,
	);

	Assert.is(document.body.innerHTML, "<span>Loading...</span>");
	await new Promise((resolve) => setTimeout(resolve, 100));
	Assert.is(document.body.innerHTML, "<span>Child 200</span>");
});

test("no loading", async () => {
	await renderer.render(
		<Suspense fallback={<span>Loading...</span>} timeout={100}>
			<Child timeout={0} />
		</Suspense>,
		document.body,
	);

	Assert.is(document.body.innerHTML, "<span>Child 0</span>");
	await new Promise((resolve) => setTimeout(resolve, 500));
	Assert.is(document.body.innerHTML, "<span>Child 0</span>");
});

test("suspense with refresh", async () => {
	let ctx!: Context;
	async function* App(this: Context) {
		ctx = this;
		for await (const _ of this) {
			yield (
				<Suspense fallback={<span>Loading...</span>} timeout={100}>
					<Child timeout={200} />
				</Suspense>
			);
		}
	}

	await renderer.render(<App />, document.body);

	Assert.is(document.body.innerHTML, "<span>Loading...</span>");
	await new Promise((resolve) => setTimeout(resolve, 100));
	Assert.is(document.body.innerHTML, "<span>Child 200</span>");
	await ctx.refresh();
	Assert.is(document.body.innerHTML, "<span>Loading...</span>");
	await new Promise((resolve) => setTimeout(resolve, 100));
	Assert.is(document.body.innerHTML, "<span>Child 200</span>");
});

test("suspense with concurrent refresh", async () => {
	let ctx!: Context;
	async function* App(this: Context) {
		ctx = this;
		for await (const _ of this) {
			yield (
				<Suspense fallback={<span>Loading...</span>} timeout={100}>
					<Child timeout={200} />
				</Suspense>
			);
		}
	}

	await renderer.render(<App />, document.body);

	Assert.is(document.body.innerHTML, "<span>Loading...</span>");
	await new Promise((resolve) => setTimeout(resolve, 100));
	Assert.is(document.body.innerHTML, "<span>Child 200</span>");
	const refreshP = ctx.refresh();
	ctx.refresh();
	await refreshP;
	Assert.is(document.body.innerHTML, "<span>Loading...</span>");
	await new Promise((resolve) => setTimeout(resolve, 100));
	Assert.is(document.body.innerHTML, "<span>Child 200</span>");
});

test("suspense with concurrent refresh in timeout", async () => {
	let ctx!: Context;
	async function* App(this: Context) {
		ctx = this;
		for await (const _ of this) {
			yield (
				<Suspense fallback={<span>Loading...</span>} timeout={100}>
					<Child timeout={200} />
				</Suspense>
			);
		}
	}

	await renderer.render(<App />, document.body);

	Assert.is(document.body.innerHTML, "<span>Loading...</span>");
	await new Promise((resolve) => setTimeout(resolve, 100));
	Assert.is(document.body.innerHTML, "<span>Child 200</span>");
	const refreshP = ctx.refresh();
	setTimeout(() => ctx.refresh());
	await refreshP;
	Assert.is(document.body.innerHTML, "<span>Loading...</span>");
	await new Promise((resolve) => setTimeout(resolve, 110));
	Assert.is(document.body.innerHTML, "<span>Child 200</span>");
});

test("suspense with concurrent refresh after refresh fulfills", async () => {
	let ctx!: Context;
	async function* App(this: Context) {
		ctx = this;
		for await (const _ of this) {
			yield (
				<Suspense fallback={<span>Loading...</span>} timeout={100}>
					<Child timeout={200} />
				</Suspense>
			);
		}
	}

	await renderer.render(<App />, document.body);

	Assert.is(document.body.innerHTML, "<span>Loading...</span>");
	await new Promise((resolve) => setTimeout(resolve, 100));
	Assert.is(document.body.innerHTML, "<span>Child 200</span>");
	const refreshP = ctx.refresh();
	ctx.refresh();
	await refreshP;
	Assert.is(document.body.innerHTML, "<span>Loading...</span>");
	await new Promise((resolve) => setTimeout(resolve, 110));
	Assert.is(document.body.innerHTML, "<span>Child 200</span>");
});

test.run();
