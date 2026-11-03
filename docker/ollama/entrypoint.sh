#!/bin/sh
set -eu

MODEL="${OLLAMA_MODEL:-llama3.2}"
VISION_MODEL="${VISION_MODEL:-}"
SERVER_PID=""

cleanup() {
  if [ -n "$SERVER_PID" ]; then
    kill "$SERVER_PID" 2>/dev/null || true
    wait "$SERVER_PID" 2>/dev/null || true
  fi
  exit 0
}
trap cleanup INT TERM

pull_model() {
  model="$1"
  label="$2"
  if [ -z "$model" ]; then
    return 0
  fi
  if ollama show "$model" >/dev/null 2>&1; then
    echo "$label model '$model' already present. Skipping pull."
  else
    echo "Pulling $label model '$model' (stored in ollama-models volume)..."
    ollama pull "$model"
    echo "$label model '$model' is ready."
  fi
}

echo "Starting Ollama server..."
ollama serve &
SERVER_PID=$!

echo "Waiting for Ollama API..."
attempt=0
until ollama list >/dev/null 2>&1; do
  attempt=$((attempt + 1))
  if [ "$attempt" -ge 120 ]; then
    echo "Ollama API did not become ready in time." >&2
    cleanup
  fi
  sleep 1
done

pull_model "$MODEL" "reasoning"
if [ -n "$VISION_MODEL" ] && [ "$VISION_MODEL" != "$MODEL" ]; then
  pull_model "$VISION_MODEL" "vision"
fi

echo "Ollama is serving reasoning='$MODEL' vision='${VISION_MODEL:-none}' on port 11434."
wait "$SERVER_PID"
