from fastapi import FastAPI
from pydantic import BaseModel

from ai import ask_ai


app = FastAPI()


class ChatRequest(BaseModel):
    message: str


@app.get("/")
def home():
    return {
        "status": "online",
        "name": "Coby AI",
        "version": "0.1"
    }


@app.post("/chat")
def chat(request: ChatRequest):

    answer = ask_ai(request.message)

    return {
        "answer": answer
    }
