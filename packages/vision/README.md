# @sawit/vision

Node-only visual regression and design extraction tool. Compares app screenshots against `reference/*` and optionally extracts a Fiori-oriented design spec from an image.

```bash
npm install
npm run vision:clipboard
npm run vision:compare -- --clipboard .artifacts/dashboard.png .artifacts/dashboard-diff.png
npm run vision:extract -- --clipboard .artifacts/dashboard-spec.md
npm run vision:extract -- .artifacts/dashboard.png .artifacts/dashboard-spec.md
npm run vision:frames -- recording.mp4 .artifacts/frames 8
npm run vision:transcribe -- recording.mp4 .artifacts/transcript.txt
```

## Commands

- `clipboard` — read the macOS clipboard image into `.artifacts/clipboard.png` and print metadata
- `compare` — pixel comparison, dimensions, similarity, optional magenta diff image
- `extract` — vision model design spec extraction from an image or `--clipboard` via `VISION_INFERENCE_ENDPOINT`
- `frames` — extract video frames with `ffmpeg`
- `scenes` — detect scene changes or extract scene frames
- `transcribe` — transcribe audio/video via ASR endpoint

## Environment

```bash
VISION_INFERENCE_ENDPOINT=
MODEL_API_KEY=
VISION_MODEL=meta-llama/Llama-3.2-90B-Vision-Instruct
ASR_INFERENCE_ENDPOINT=
ASR_MODEL=whisper-large-v3
```

Never import this package from the React/Next runtime. It is Node-only tooling.
