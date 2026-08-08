from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from ai import ask_ai


app = FastAPI()


# 25withcoding.kr의 웹 페이지가 Coby 서버에 요청할 수 있도록 허용
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
