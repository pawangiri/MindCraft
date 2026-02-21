"""Claude AI client — supports both Claude Code CLI and Anthropic API backends.

Toggle via AI_BACKEND setting: "cli" (default) or "api".
"""

import json
import logging
import os
import subprocess
from contextlib import contextmanager

from django.conf import settings

logger = logging.getLogger(__name__)

CLI_TIMEOUT = 300  # 5 minutes — CLI has startup overhead

# ---------------------------------------------------------------------------
# Public interface (used by generators.py, chat views, etc.)
# ---------------------------------------------------------------------------


def chat_completion(
    messages: list[dict],
    system: str = "",
    model: str | None = None,
    max_tokens: int | None = None,
    stream: bool = False,
):
    """Send a completion request — routes to CLI or API based on AI_BACKEND.

    Args:
        messages: List of {"role": "user"|"assistant", "content": "..."} dicts
        system: System prompt
        model: Model to use (defaults to AI_MODEL from settings)
        max_tokens: Max response tokens
        stream: Whether to stream the response

    Returns:
        If stream=False: The response message content string
        If stream=True: A streaming context manager with .text_stream
    """
    if settings.AI_BACKEND == "cli":
        return _cli_chat_completion(messages, system, model, stream)
    return _api_chat_completion(messages, system, model, max_tokens, stream)


def chat_completion_stream(
    messages: list[dict],
    system: str = "",
    model: str | None = None,
    max_tokens: int | None = None,
):
    """Stream a chat completion, yielding text chunks."""
    model = model or settings.AI_MODEL_CHAT
    if settings.AI_BACKEND == "cli":
        prompt = _messages_to_prompt(messages)
        with _cli_stream(prompt, system, model) as stream:
            for text in stream.text_stream:
                yield text
    else:
        with _api_chat_completion(messages, system, model, max_tokens, stream=True) as stream:
            for text in stream.text_stream:
                yield text


# ---------------------------------------------------------------------------
# CLI backend — pipes prompt via stdin to avoid arg-length limits
# ---------------------------------------------------------------------------


def _cli_build_env():
    """Build environment for claude CLI subprocess."""
    env = os.environ.copy()
    env.pop("CLAUDECODE", None)
    # Remove placeholder API key so CLI uses OAuth token instead
    api_key = env.get("ANTHROPIC_API_KEY", "")
    if not api_key or api_key.startswith("your-"):
        env.pop("ANTHROPIC_API_KEY", None)
    # Ensure OAuth token is available
    token = os.getenv("CLAUDE_CODE_OAUTH_TOKEN", "")
    if token:
        env["CLAUDE_CODE_OAUTH_TOKEN"] = token
    return env


def _cli_build_cmd(model, system="", stream=False):
    """Build the claude CLI command list (prompt comes via stdin)."""
    cmd = [
        "claude", "-p",
        "--model", model,
        "--no-session-persistence",
        "--tools", "",
    ]
    if system:
        cmd.extend(["--system-prompt", system])
    if stream:
        cmd.extend(["--output-format", "stream-json", "--verbose"])
    return cmd


def _cli_chat_completion(messages, system, model, stream):
    model = model or settings.AI_MODEL
    prompt = _messages_to_prompt(messages)

    if stream:
        return _cli_stream(prompt, system, model)

    cmd = _cli_build_cmd(model, system)

    logger.info("Running claude CLI (model=%s, prompt_len=%d)", model, len(prompt))
    result = subprocess.run(
        cmd,
        input=prompt,
        capture_output=True,
        text=True,
        env=_cli_build_env(),
        timeout=CLI_TIMEOUT,
    )

    if result.returncode != 0:
        err = result.stderr.strip() or result.stdout.strip()
        logger.error("Claude CLI failed (exit %d): stderr=%s stdout=%s", result.returncode, result.stderr[:500], result.stdout[:500])
        raise RuntimeError(f"Claude CLI error: {err}")

    return result.stdout.strip()


class _CLITextStream:
    """Mimics Anthropic's stream.text_stream using claude CLI stream-json output.

    Handles two output formats:
    - Legacy: {"type":"content_block_delta","delta":{"text":"..."}}
    - Verbose (current): {"type":"assistant","message":{"content":[{"text":"..."}]}}
    """

    def __init__(self, process):
        self._process = process

    @property
    def text_stream(self):
        for line in self._process.stdout:
            line = line.strip()
            if not line:
                continue
            try:
                data = json.loads(line)

                # Legacy format: content_block_delta events
                if data.get("type") == "content_block_delta":
                    text = data.get("delta", {}).get("text", "")
                    if text:
                        yield text

                # Verbose format: full assistant message
                elif data.get("type") == "assistant":
                    message = data.get("message", {})
                    for block in message.get("content", []):
                        text = block.get("text", "")
                        if text:
                            yield text

            except json.JSONDecodeError:
                continue

    def close(self):
        self._process.terminate()
        self._process.wait()


@contextmanager
def _cli_stream(prompt, system="", model=None):
    """Run claude CLI with streaming JSON output, piping prompt via stdin."""
    cmd = _cli_build_cmd(model, system, stream=True)

    process = subprocess.Popen(
        cmd,
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        env=_cli_build_env(),
    )
    # Send prompt via stdin and close to signal EOF
    process.stdin.write(prompt)
    process.stdin.close()

    stream = _CLITextStream(process)
    try:
        yield stream
    finally:
        stream.close()


# ---------------------------------------------------------------------------
# API backend (Anthropic SDK)
# ---------------------------------------------------------------------------


def _get_api_client():
    """Get an Anthropic client instance.

    Uses ANTHROPIC_API_KEY if set, otherwise falls back to
    CLAUDE_CODE_OAUTH_TOKEN for OAuth-based auth.
    """
    import anthropic

    api_key = settings.ANTHROPIC_API_KEY
    if not api_key or api_key.startswith("your-"):
        # Fall back to OAuth token
        api_key = os.getenv("CLAUDE_CODE_OAUTH_TOKEN", "")

    if not api_key:
        raise RuntimeError(
            "No Anthropic credentials found. Set ANTHROPIC_API_KEY or CLAUDE_CODE_OAUTH_TOKEN."
        )

    return anthropic.Anthropic(api_key=api_key)


NON_STREAMING_MAX_TOKENS = 8192  # Keep non-streaming calls under SDK timeout limit


def _api_chat_completion(messages, system, model, max_tokens, stream):
    model = model or settings.AI_MODEL
    max_tokens = max_tokens or settings.AI_MAX_TOKENS

    client = _get_api_client()

    kwargs = {
        "model": model,
        "max_tokens": max_tokens,
        "messages": messages,
    }
    if system:
        kwargs["system"] = system

    if stream:
        return client.messages.stream(**kwargs)

    # Cap non-streaming max_tokens to avoid SDK timeout errors
    if kwargs["max_tokens"] > NON_STREAMING_MAX_TOKENS:
        kwargs["max_tokens"] = NON_STREAMING_MAX_TOKENS

    response = client.messages.create(**kwargs)
    return response.content[0].text


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _messages_to_prompt(messages: list[dict]) -> str:
    """Convert a message list to a single prompt string for the CLI."""
    if len(messages) == 1:
        return messages[0]["content"]
    parts = []
    for msg in messages:
        role = msg["role"]
        content = msg["content"]
        if role == "user":
            parts.append(f"User: {content}")
        elif role == "assistant":
            parts.append(f"Assistant: {content}")
    return "\n\n".join(parts)
