FROM ollama/ollama:latest

ENV OLLAMA_HOST=0.0.0.0:11434 \
    OLLAMA_MODEL=llama3.2 \
    VISION_MODEL=llama3.2-vision \
    OLLAMA_KEEP_ALIVE=30m

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 11434

HEALTHCHECK --interval=10s --timeout=5s --start-period=300s --retries=60 \
  CMD ollama list >/dev/null 2>&1 || exit 1

ENTRYPOINT ["/entrypoint.sh"]
