---
title: Getting Started
---

## Try Crank
The fastest way to try Crank is via the [playground](/playground).

## Installation
The Crank package is available on [NPM](https://npmjs.org/@b9g/crank).

```shell
$ npm install @b9g/crank
```

```jsx
import {createElement} from "@b9g/crank";
import {renderer} from "@b9g/crank/dom";
renderer.render(<div id="hello">Hello world</div>, document.body);
```

It can also be imported directly from ESM-compatible via CDNs like [unpkg](https://unpkg.com/@b9g/crank?module) or [esm.sh](https://esm.sh/@b9g/crank).

```jsx
import {createElement} from "https://unpkg.com/@b9g/crank?module";
import {renderer} from "https://unpkg.com/@b9g/crank/dom?module";

renderer.render(<div id="hello">Hello world</div>, document.body);
```

### Transforming JSX
The main challenge when setting up Crank is [getting the JSX transform](https://facebook.github.io/jsx/) to work.

```jsx
import {renderer} from "@b9g/crank/dom";
```

### The JSX template tag
If you do not want to use JSX, you can install

## Key Examples
### A Simple Component
```jsx live
import {createElement} from "https://unpkg.com/@b9g/crank/crank";
import {renderer} from "https://unpkg.com/@b9g/crank/dom";

function Greeting({name = "World"}) {
  return <div>Hello {name}</div>;
}

renderer.render(<Greeting />, document.body);
```

### A Stateful Component
```jsx live
import {createElement} from "https://unpkg.com/@b9g/crank/crank";
import {renderer} from "https://unpkg.com/@b9g/crank/dom";

function *Timer() {
  let seconds = 0;
  const interval = setInterval(() => {
    seconds++;
    this.refresh();
  }, 1000);
  try {
    for ({} of this) {
      yield <div>Time elapsed {seconds}s</div>;
    }
  } finally {
    clearInterval(interval);
  }
}

renderer.render(<Timer />, document.body);
```

### An Async Component
```jsx live
import {createElement} from "https://unpkg.com/@b9g/crank/crank";
import {renderer} from "https://unpkg.com/@b9g/crank/dom";

async function RandomQuote() {
  const res = await fetch("https://favqs.com/api/qotd");
  const {quote} = await res.json();
  return (
    <figure>
      <blockquote>{quote.body}</blockquote>
      <figcaption>- <a href={quote.url}>{quote.author}</a></figcaption>
    </figure>
  );
}

renderer.render(<RandomQuote />, document.body);
```

### A Loading Component
```jsx live
/** @jsx createElement */
import {createElement} from "https://unpkg.com/@b9g/crank/crank";
import {renderer} from "https://unpkg.com/@b9g/crank/dom";

async function LoadingIndicator() {
  await new Promise(resolve => setTimeout(resolve, 1000));
  return <div>Fetching a good boy...</div>;
}

async function RandomDog({throttle = false}) {
  const res = await fetch("https://dog.ceo/api/breeds/image/random");
  const data = await res.json();
  if (throttle) {
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  return (
    <img src={data.message} alt="A Random Dog" width="300" />
  );
}

async function *RandomDogLoader({throttle}) {
  for await ({throttle} of this) {
    yield <LoadingIndicator />;
    yield <RandomDog throttle={throttle} />;
  }
}

function *RandomDogApp() {
  let throttle = false;
  this.addEventListener("click", (ev) => {
    if (ev.target.tagName === "BUTTON") {
      throttle = !throttle;
      this.refresh();
    }
  });

  for ({} of this) {
    yield (
      <>
        <div>
          <button>Show me another dog.</button>
        </div>
        <RandomDogLoader throttle={throttle} />
      </>
    );
  }
}

renderer.render(<RandomDogApp />, document.body);
```
