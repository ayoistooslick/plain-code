# OCR Text Extraction

## Capability

Extracting text from image files with the `ocr` statement, backed by
Tesseract.js.

## Purpose

Let users read text out of images (scans, screenshots, photos) in readable
Plain — without a JavaScript Gateway block or manual Tesseract setup.

## Supported Plain syntax

### 1. Basic extraction

```plain
ocr "scan.png" as text
show text
```

### 2. Language pack

```plain
ocr "brief.pdf.png" as inhalt using "deu"
show inhalt
```

### 3. Multiple languages

```plain
ocr "mixed.png" as words using "deu+eng"
show words
```

### 4. Image path from a variable

```plain
remember shot as "receipts/receipt-01.png"
ocr shot as total
show total
```

## Semantic meaning

- `ocr "<image>" as <variable>` extracts the text of an image file into
  `<variable>` (mirrors `ask "<prompt>" as <name>`).
- The image may be any Plain expression that evaluates to an image path,
  buffer, or URL accepted by Tesseract.js.
- `using "<lang>"` selects the Tesseract language pack: `"eng"` (default),
  `"deu"`, or combinations such as `"deu+eng"`.
- The statement is async like `ask`; the generated code awaits it.

## JavaScript target

The translator must follow this shape:

```js
const { createWorker } = require("tesseract.js");

async function __ocr(imagePath, lang) {
  const worker = await createWorker(lang || "eng");
  try {
    const { data } = await worker.recognize(imagePath);
    return data.text;
  } finally {
    await worker.terminate();
  }
}

let text = await __ocr("scan.png", "eng");
console.log(text);
```

With a language pack:

```js
let inhalt = await __ocr("brief.pdf.png", "deu");
```

## Dependency

`tesseract.js`. The deterministic dependency detector maps `ocr` to it via
`PACKAGE_MAP`, so `plain install` / `plain run` fetch it automatically. The
package name never appears in Plain source.

## Imports / runtime requirements

- Requires the async runtime wrapper (top-level `await`) — provided by the
  Plain runtime.
- Language packs are downloaded on first use; offline environments must
  pre-install them.

## Async behavior

Async. `__ocr` returns a Promise and must be awaited; the worker is created
per call and always terminated.

## Examples

```plain
ocr "scan.png" as text
if text contains "INVOICE"
  show "invoice detected"
done
```

## Invalid forms

- `ocr "scan.png"` without `as <variable>` — the result has nowhere to go.
- `ocr scan as text` where `scan` holds a non-image value.
- `using deu` without quotes — the language pack must be a string.

## Security considerations

- Treat extracted text as untrusted input; never interpolate it into code.
- Do not OCR documents containing secrets into logs or shared output.

## Expected compiler output

```json
{
  "javascript": "let text = await __ocr(\"scan.png\", \"eng\");",
  "dependencies": ["tesseract.js"],
  "imports": [],
  "async": true
}
```

## Tests

- `tests/ocr.test.js` — lexer/parser/generator coverage for both forms,
  language packs, async wrapping inside if blocks and functions, and
  dependency detection mapping to `tesseract.js`.
