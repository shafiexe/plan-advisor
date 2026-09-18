import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from services.claude import stream_response

router = APIRouter()


@router.websocket("/ws/chat")
async def websocket_chat(websocket: WebSocket):
    """
    Stateless chat endpoint. The frontend sends the full conversation
    history with every message, so each conversation is self-contained
    and the backend holds no session state.
    """
    await websocket.accept()

    try:
        while True:
            raw = await websocket.receive_text()
            data = json.loads(raw)

            user_text = data.get("text", "").strip()
            history: list = data.get("history", [])
            passenger_context: str | None = data.get("passenger_context") or None

            if not user_text:
                continue

            messages = history + [{"role": "user", "content": user_text}]

            extra_system = None
            if passenger_context:
                extra_system = (
                    "The user has the following saved passengers. "
                    "When they refer to a passenger by name, use these details to fill in travel forms or answer questions:\n"
                    + passenger_context
                )

            await websocket.send_json({"type": "typing"})

            async for event in stream_response(messages, extra_system=extra_system):
                # event is {"type": "token"|"tool_start", ...}
                await websocket.send_json(event)

            await websocket.send_json({"type": "done"})

    except WebSocketDisconnect:
        pass
    except Exception as e:
        try:
            await websocket.send_json({"type": "error", "content": str(e)})
        except Exception:
            pass
