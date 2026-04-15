from collections.abc import Iterator
from pathlib import Path

from app.config import settings


class LLMService:
    _instance = None

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def __init__(self):
        self._llm = None
        self._mode = "fallback"
        model_path = Path(settings.model_path)
        if model_path.exists():
            try:
                from llama_cpp import Llama

                self._llm = Llama(
                    model_path=str(model_path),
                    n_ctx=settings.model_n_ctx,
                    n_threads=settings.model_n_threads,
                    n_gpu_layers=0,
                    verbose=False,
                )
                self._mode = "llama"
            except Exception:
                self._mode = "fallback"

    def generate_stream(self, system_prompt: str, user_message: str) -> Iterator[str]:
        if self._llm is None:
            text = self._fallback_answer(system_prompt, user_message)
            for token in text.split(" "):
                yield token + " "
            return

        prompt = f"<s>[INST] <<SYS>>\n{system_prompt}\n<</SYS>>\n\n{user_message} [/INST]"
        stream = self._llm(
            prompt,
            max_tokens=settings.model_max_tokens,
            temperature=settings.model_temperature,
            top_p=settings.model_top_p,
            stream=True,
            stop=["</s>", "[INST]"],
        )
        for chunk in stream:
            token = chunk["choices"][0]["text"]
            if token:
                yield token

    def _fallback_answer(self, system_prompt: str, user_message: str) -> str:
        context_start = system_prompt.find("=== OPERATIONAL CONTEXT ===")
        context = system_prompt[context_start:] if context_start >= 0 else ""
        if "No recent operational events match this query." in context:
            return "I could not find relevant recent operational events for that question."
        lines = [line for line in context.splitlines() if line.startswith("[")]
        summary = "\n".join(lines[:4]) if lines else "Context is available but sparse."
        return f"Here is what I found from recent operations:\n{summary}"

