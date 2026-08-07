from fastapi import FastAPI

app = FastAPI()

@app.get("/")
def home():
    return {
        "status": "online",
        "name": "Coby AI",
        "version": "0.1"
    }
