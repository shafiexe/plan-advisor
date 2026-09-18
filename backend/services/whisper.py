import os
import io
from openai import AsyncOpenAI


def _get_client() -> AsyncOpenAI:
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise ValueError(
            "OPENAI_API_KEY is not set. It is required for voice transcription fallback."
        )
    return AsyncOpenAI(api_key=api_key)


async def transcribe_audio(audio_bytes: bytes, filename: str = "audio.webm") -> str:
    client = _get_client()
    audio_file = io.BytesIO(audio_bytes)
    audio_file.name = filename

    transcription = await client.audio.transcriptions.create(
        model="whisper-1",
        file=audio_file,
        response_format="text",
    )
    return transcription
