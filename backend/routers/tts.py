import os
from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from openai import AsyncOpenAI
from pydantic import BaseModel

router = APIRouter()


class TTSRequest(BaseModel):
    text: str
    voice: str = "nova"   # nova | alloy | echo | fable | onyx | shimmer


@router.post("/tts")
async def text_to_speech(req: TTSRequest):
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=503,
            detail="OPENAI_API_KEY not set — required for high-quality voice."
        )

    text = req.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="No text provided.")

    client = AsyncOpenAI(api_key=api_key)

    response = await client.audio.speech.create(
        model="tts-1",
        voice=req.voice,
        input=text[:4096],   # OpenAI TTS max input length
        response_format="mp3",
    )

    return Response(content=response.content, media_type="audio/mpeg")
