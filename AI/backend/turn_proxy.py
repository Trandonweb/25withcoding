import os

import requests
from fastapi import HTTPException

from main import app


@app.get("/turn-credentials")
def turn_credentials():
    api_key = os.getenv("TURN_SERVER", "").strip()
    if not api_key:
        raise HTTPException(status_code=503, detail="TURN_SERVER가 Render 환경변수에 설정되지 않았습니다.")

    try:
        response = requests.get(
            "https://25withcoding.metered.live/api/v1/turn/credentials",
            params={"apiKey": api_key},
            timeout=10,
        )
        response.raise_for_status()
        data = response.json()
        if not isinstance(data, list) or not data:
            raise HTTPException(status_code=502, detail="Metered에서 유효한 TURN 서버 정보를 받지 못했습니다.")
        return data
    except requests.RequestException as error:
        print(f"TURN credential request failed: {error}")
        raise HTTPException(status_code=502, detail="TURN 서버 정보를 가져오지 못했습니다.")
    except ValueError:
        raise HTTPException(status_code=502, detail="TURN 서버 응답을 해석하지 못했습니다.")
