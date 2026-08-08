import os
import requests


SYSTEM_PROMPT = """
너는 25withcoding.kr의 코딩 도우미 Coby다.

주요 전문 분야는 Python, HTML, CSS, JavaScript, Entry, GitHub이다.
사용자가 코드를 보여주면 오류를 찾아 수정하고, 필요하면 전체 코드를 제공한다.
설명은 중학생도 이해할 수 있도록 명확하고 단계적으로 한다.
답변은 한국어를 기본으로 한다.
간단한 질문에는 짧고 빠르게 답한다.
코드 작성 요청에는 실행 가능한 코드를 제공하고 핵심 사용법을 설명한다.
모르는 내용은 아는 척하지 말고 모른다고 말한다.
""".strip()


# Hugging Face Inference Providers의 OpenAI-compatible router API
API_URL = "https://router.huggingface.co/v1/chat/completions"
# 환경변수로 모델을 바꿀 수 있으며, 기본값은 비교적 가벼운 instruct 모델이다.
MODEL = os.getenv("HF_MODEL", "Qwen/Qwen2.5-7B-Instruct")


def ask_ai(message: str):
    """Hugging Face Inference Providers의 OpenAI-compatible API로 Coby의 답변을 생성한다."""

    # 기존 Render 환경변수 이름(EXAONE_API_KEY)을 그대로 사용한다.
    # 값만 Hugging Face의 새 토큰으로 교체하면 된다.
    api_key = os.getenv("EXAONE_API_KEY", "").strip()

    if not api_key:
        print("Coby error: EXAONE_API_KEY is not configured")
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
    }

    try:
        print(f"Coby: requesting Hugging Face model={MODEL}, message_length={len(message)}")

        response = requests.post(
            API_URL,
            headers=headers,
            json=payload,
            timeout=120,
        )

        print(f"Coby: Hugging Face status={response.status_code}")
        response.raise_for_status()

        data = response.json()
        print(f"Coby: response keys={list(data.keys())}")

        choices = data.get("choices")
        if not choices:
            print(f"Coby: missing choices, response={response.text[:2000]}")
            return "AI 모델이 답변을 반환하지 않았어요. Render 로그를 확인해주세요."

        message_data = choices[0].get("message") or {}
        answer = message_data.get("content")

        if isinstance(answer, list):
            answer = "".join(
                item.get("text", "") if isinstance(item, dict) else str(item)
                for item in answer
            )

        if not isinstance(answer, str) or not answer.strip():
            print(f"Coby: empty content, message={message_data}")
            return "AI 모델이 빈 답변을 반환했어요. 다시 시도해주세요."

        return answer.strip()

    except requests.HTTPError as error:
        print(f"Coby: Hugging Face API HTTP error: {error}")
        print(f"Coby: Hugging Face API response: {response.text[:2000]}")
        return "Coby의 AI 모델 요청이 거부되었어요. Render 로그를 확인해주세요."

    except requests.RequestException as error:
        print(f"Coby: Hugging Face API request failed: {error}")
        return "Coby의 AI 모델 서버에 연결하지 못했어요. 잠시 후 다시 시도해주세요."

    except (KeyError, IndexError, TypeError, ValueError) as error:
        print(f"Coby: Hugging Face API response parsing failed: {error}")
        return "AI 모델에서 예상하지 못한 응답이 왔어요. Render 로그를 확인해주세요."

    except Exception as error:
        print(f"Coby: unexpected error: {type(error).__name__}: {error}")
        return "Coby에서 예상하지 못한 오류가 발생했어요. Render 로그를 확인해주세요."
