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


API_URL = "https://api.friendli.ai/serverless/v1/chat/completions"
MODEL = "LGAI-EXAONE/K-EXAONE-236B-A23B"


def ask_ai(message: str):
    """FriendliAI의 OpenAI-compatible K-EXAONE API로 Coby의 답변을 생성한다."""

    api_key = os.getenv("EXAONE_API_KEY", "").strip()

    if not api_key:
        return "Coby의 AI API 키가 서버에 설정되지 않았어요. Render 환경변수를 확인해주세요."

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    payload = {
        "model": MODEL,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": message},
        ],
        "temperature": 0.4,
        "max_tokens": 2048,
        "chat_template_kwargs": {
            "enable_thinking": True
        },
    }

    try:
        response = requests.post(
            API_URL,
            headers=headers,
            json=payload,
            timeout=90,
        )
        response.raise_for_status()
        data = response.json()

        answer = data["choices"][0]["message"]["content"]

        if not answer:
            return "AI가 빈 응답을 반환했어요. 다시 시도해주세요."

        return answer.strip()

    except requests.HTTPError as error:
        print(f"EXAONE API HTTP error: {error}")
        try:
            print(f"EXAONE API response: {response.text[:2000]}")
        except Exception:
            pass
        return "Coby의 AI 모델 요청이 거부되었어요. API 키나 모델 설정을 확인해주세요."

    except requests.RequestException as error:
        print(f"EXAONE API request failed: {error}")
        return "Coby의 AI 모델 서버에 연결하지 못했어요. 잠시 후 다시 시도해주세요."

    except (KeyError, IndexError, TypeError, ValueError) as error:
        print(f"EXAONE API response parsing failed: {error}")
        return "AI 모델에서 예상하지 못한 응답이 왔어요. Render 로그를 확인해주세요."
