import os
import requests


SYSTEM_PROMPT = """
너는 25withcoding.kr의 코딩 도우미 Coby다.

주요 전문 분야는 Python, HTML, CSS, JavaScript, Entry, GitHub이다.
사용자가 코드를 보여주면 오류를 찾아 수정하고, 필요하면 전체 코드를 제공한다.
설명은 중학생도 이해할 수 있도록 명확하고 단계적으로 한다.
답변은 한국어를 기본으로 한다.
모르는 내용은 아는 척하지 말고 모른다고 말한다.
""".strip()


def ask_ai(message: str):
    """Coby의 실제 AI 모델 호출 함수.

    Render 환경변수에 다음 값을 설정하면 OpenAI 호환 API를 사용한다.
    EXAONE_API_URL  : API의 /v1/chat/completions 주소
    EXAONE_API_KEY  : API 키
    EXAONE_MODEL    : 사용할 EXAONE 모델명

    아직 환경변수가 없으면 기존 테스트 응답을 사용해
    배포된 Coby가 갑자기 깨지지 않도록 한다.
    """

    api_url = os.getenv("EXAONE_API_URL", "").strip()
    api_key = os.getenv("EXAONE_API_KEY", "").strip()
    model = os.getenv("EXAONE_MODEL", "EXAONE-4.0-32B").strip()

    # 실제 모델 API가 아직 설정되지 않은 경우의 안전한 테스트 모드
    if not api_url or not api_key:
        if "파이썬" in message or "python" in message.lower():
            return "현재 Coby의 실제 AI 모델 연결을 준비 중입니다. 파이썬 질문은 정상적으로 받았습니다."

        if "안녕" in message:
            return "안녕하세요! 저는 Coby AI입니다. 이제 실제 AI 모델 연결을 준비하고 있어요."

        return f"질문을 받았습니다: {message}\n현재는 AI 모델 API 설정 전 테스트 모드입니다."

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": message},
        ],
        "temperature": 0.4,
        "max_tokens": 2048,
    }

    try:
        response = requests.post(
            api_url,
            headers=headers,
            json=payload,
            timeout=90,
        )
        response.raise_for_status()
        data = response.json()

        answer = data["choices"][0]["message"]["content"]
        return answer.strip()

    except requests.RequestException as error:
        print(f"EXAONE API request failed: {error}")
        return "Coby의 AI 모델 서버에 연결하지 못했어요. 잠시 후 다시 시도해주세요."

    except (KeyError, IndexError, TypeError, ValueError) as error:
        print(f"EXAONE API response parsing failed: {error}")
        return "AI 모델에서 예상하지 못한 응답이 왔어요. 서버 설정을 확인해주세요."
