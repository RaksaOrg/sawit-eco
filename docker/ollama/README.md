# Ollama Local Service (Reasoning + Vision)

Service Docker untuk menjalankan model Meta secara lokal via Ollama:

- Reasoning: `llama3.2` (default, 3B) atau `llama3.3` (70B)
- Vision: `llama3.2-vision` (default, 11B)

## Cara Menjalankan

```bash
# Build dan jalankan dengan model default (llama3.2 + llama3.2-vision)
docker compose up -d --build ollama

# Pantau proses download model (otomatis ditarik saat startup pertama)
docker compose logs -f ollama
```

Model disimpan di named volume Docker `ollama-models` sehingga tidak perlu download ulang saat restart.

## Mengganti Model

Set environment variable sebelum up:

```bash
# Contoh: ganti reasoning ke Llama 3.3 70B
OLLAMA_MODEL=llama3.3 VISION_MODEL=llama3.2-vision docker compose up -d --build ollama
```

## Verifikasi Service

```bash
# Cek apakah Ollama sudah siap
curl -s http://localhost:11434/api/tags

# Cek endpoint OpenAI-compatible
curl -s http://localhost:11434/v1/models
```

## Env aplikasi

```env
# Reasoning
META_INFERENCE_ENDPOINT="http://localhost:11434/v1/chat/completions"
META_MODEL="llama3.2"
META_INFERENCE_TIMEOUT_MS="120000"

# Vision
VISION_INFERENCE_ENDPOINT="http://localhost:11434/v1/chat/completions"
VISION_MODEL="llama3.2-vision"
VISION_TIMEOUT_MS="180000"

# Ollama ignores auth but app requires non-empty key
MODEL_API_KEY="ollama-local"
INFERENCE_API_KEY="ollama-local"
```

## SAM 3.1 dan Whisper ASR

Ollama tidak menyediakan SAM maupun endpoint audio transcription. SAM tetap
memakai `SAM_INFERENCE_ENDPOINT` terpisah dan ASR memakai server Whisper
OpenAI-compatible. Jika kosong, SAM berjalan dalam mode simulasi, ASR fallback ke teks.
