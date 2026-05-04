import json
import logging
import time
import urllib.error
import urllib.request

logger = logging.getLogger(__name__)


class GeminiError(Exception):
    pass


class GeminiHttpError(GeminiError):
    def __init__(self, status: int, body: str):
        self.status = status
        self.body = body
        super().__init__(f"Gemini HTTP {status}: {body[:500]}")


class GeminiBlockedError(GeminiError):
    def __init__(self, reason: str):
        self.reason = reason
        super().__init__(f"Gemini blocked: {reason}")


class GeminiSchemaError(GeminiError):
    pass


class LLMClient:
    """Raw-HTTP Gemini client with retry and token tracking.

    Mirrors the pattern in scripts/lib/gemini.ts:
      - POST to generativelanguage.googleapis.com/v1beta/models/{model}:generateContent
      - generationConfig forces JSON output
      - Parses candidates[0].content.parts[0].text as inner JSON
    """

    def __init__(self, api_key: str):
        self.api_key = api_key
        self.total_input_tokens = 0
        self.total_output_tokens = 0

    def _endpoint(self, model: str) -> str:
        return (
            f"https://generativelanguage.googleapis.com/v1beta/models/"
            f"{model}:generateContent?key={self.api_key}"
        )

    def call(
        self,
        prompt: str,
        model: str,
        response_schema: dict | None = None,
        temperature: float = 0.4,
    ) -> tuple[dict, dict]:
        """Call Gemini with exponential-backoff retry (3 attempts, base 1s).

        Returns:
            (parsed_json, token_usage) where token_usage is
            {"input_tokens": int, "output_tokens": int}.
        """
        url = self._endpoint(model)
        body: dict = {
            "contents": [{"role": "user", "parts": [{"text": prompt}]}],
            "generationConfig": {
                "responseMimeType": "application/json",
                "temperature": temperature,
            },
        }
        if response_schema is not None:
            body["generationConfig"]["responseSchema"] = response_schema

        data = json.dumps(body, ensure_ascii=False).encode("utf-8")
        req = urllib.request.Request(
            url,
            data=data,
            headers={"Content-Type": "application/json"},
            method="POST",
        )

        last_error: Exception | None = None
        for attempt in range(3):
            try:
                with urllib.request.urlopen(req, timeout=120) as res:
                    text = res.read().decode("utf-8")
                    response_data = json.loads(text)

                # Check for blocking
                block_reason = response_data.get("promptFeedback", {}).get("blockReason")
                if block_reason:
                    raise GeminiBlockedError(block_reason)

                # Extract text from first candidate
                candidates = response_data.get("candidates", [])
                if not candidates:
                    raise GeminiSchemaError(f"No candidates in response: {text[:500]}")
                parts = candidates[0].get("content", {}).get("parts", [])
                if not parts:
                    raise GeminiSchemaError(f"No parts in candidate: {text[:500]}")
                part_text = parts[0].get("text")
                if not part_text:
                    raise GeminiSchemaError(f"No text in part: {text[:500]}")

                # Parse inner JSON
                try:
                    result = json.loads(part_text)
                except json.JSONDecodeError as e:
                    raise GeminiSchemaError(
                        f"Inner JSON parse failed: {e}\n{part_text[:500]}"
                    )

                # Token usage
                usage = response_data.get("usageMetadata", {})
                token_usage = {
                    "input_tokens": usage.get("promptTokenCount", 0),
                    "output_tokens": usage.get("candidatesTokenCount", 0),
                }
                self.total_input_tokens += token_usage["input_tokens"]
                self.total_output_tokens += token_usage["output_tokens"]

                return result, token_usage

            except GeminiError:
                raise  # Do not retry Gemini-level errors (HTTP 4xx, blocks, schema)
            except Exception as e:
                last_error = e
                wait_time = 2 ** attempt  # 1s, 2s, 4s
                logger.warning(
                    f"Gemini call failed (attempt {attempt + 1}/3): {e}. "
                    f"Retrying in {wait_time}s..."
                )
                time.sleep(wait_time)

        raise GeminiError(f"Gemini call failed after 3 attempts: {last_error}")
