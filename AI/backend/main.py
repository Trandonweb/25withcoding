from typing import Any

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from ai import ask_ai


app = FastAPI()


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://25withcoding.kr",
        "https://www.25withcoding.kr",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


class ChatRequest(BaseModel):
    message: str
    history: list[dict[str, Any]] = Field(default_factory=list)
    context: Any = None
    projectContext: Any = None
    uiInstructions: dict[str, Any] | None = None
    usageKnowledge: dict[str, Any] | None = None
    toneSettings: dict[str, Any] | None = None


@app.get("/")
def home():
    return {
        "status": "online",
        "name": "Coby AI",
        "version": "0.2"
    }


@app.post("/chat")
def chat(request: ChatRequest):
    context = request.projectContext if request.projectContext is not None else request.context

    answer = ask_ai(
        request.message,
        history=request.history,
        context=context,
        ui_instructions=request.uiInstructions,
        usage_knowledge=request.usageKnowledge,
        tone_settings=request.toneSettings,
    )

    return {
        "answer": answer
    }
