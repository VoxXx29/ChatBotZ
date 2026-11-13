# RIFF: AI on the user's device

RIFF uses the open-source Qwen 2.5 Instruct model with WebLLM in a dedicated Web Worker. There are no cloud inference requests and no API keys. Model files and compiled runtime libraries are downloaded from Hugging Face and GitHub on first activation. These downloads are not inference services. Application hosting is still provided by Figma Make.

## Requirements

- A secure context (HTTPS or localhost).
- A browser and GPU with WebGPU support, such as a recent Chrome or Edge with hardware acceleration enabled.
- Approximately 1.1 GB of available GPU memory for the 0.5B option or 1.9 GB for the 1.5B option. Actual memory and download sizes vary.
- Internet for initial downloads. Browser caching is best-effort; RIFF does not guarantee full offline startup.
- Embedded previews can restrict WebGPU or storage. Try the published application in a separate tab if necessary.

Activate the chosen model manually. Loading progress and failures are displayed in the engine panel. Release the model before switching to the other option. Chat streams locally; Stop interrupts generation. A single engine generates one response at a time, even across sessions.

If a GPU does not honor Stop within 1.5 seconds, RIFF terminates the worker and releases the model; activate it again to continue. A two-minute generation stall also releases the model and displays a recoverable error instead of blocking the page.

## What “Ajari RIFF” does

The Local Lab saves user-authored notes in this browser's localStorage. Relevant notes are retrieved with a lightweight lexical search and supplied as reference context with the conversation. No notes, chats, or prompts are sent to the model host or stored in Payload.

This is retrieval-augmented prompting, **not model-weight training, fine-tuning, or a model trained from scratch**. Semantic retrieval is limited: use descriptive titles and specific terminology in notes and questions. Context is bounded; long conversations and notes are shortened. Smaller models may not reliably follow every reference or instruction.

- Up to 40 notes; titles up to 100 characters; note content up to 3,000 characters.
- Import `.txt` (split into short chunks) or the exported version-1 JSON format.
- Imports add notes without replacing the current dataset.
- Export JSON for backups. Site-data removal or a different browser/origin does not preserve the notes.
- Chats remain in memory until the page is closed/reloaded. Export Log downloads the current session.

No Payload collections were added. Model options, prompt suggestions, and interface copy are presentational code; user data is deliberately device-local.

## Checks

```sh
pnpm exec tsc --noEmit
node --experimental-strip-types --test tests/local-ai.test.mjs
figma make verify-deploy
```

Do not treat headless/UI tests as proof of on-device inference: actual model generation requires a working WebGPU adapter, model download access, and sufficient device memory. Verify a free-form question, a follow-up referencing the earlier answer, a taught local fact, and Stop on a compatible device.

For the deterministic browser-flow suite, use a dedicated Chromium test profile with remote debugging enabled on port 9222, then run `node tests/browser-flow.mjs`. `TEST_APP_URL` defaults to `http://localhost:3000` and `CDP_ENDPOINT` to `http://localhost:9222`. This suite replaces the Worker and GPU APIs in that test tab only; it verifies streaming, Markdown, note context, follow-ups, retry, session switching, and forced Stop. It does not validate the neural model's answers. Use a disposable browser profile: the suite installs a test knowledge note on its test origin.
