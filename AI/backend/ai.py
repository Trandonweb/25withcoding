import os
import requests


SYSTEM_PROMPT = """너는 25withcoding의 코딩 도우미 Coby다.
Python, HTML, CSS, JavaScript, Entry, GitHub를 다루며 한국어로 답한다.
중학생도 이해하기 쉽게 설명하고, 간단한 질문은 짧게 답한다. 코드는 실행 가능하게 제공한다. 모르면 모른다고 말한다.
이전 대화 기록이 제공되면 자연스럽게 이어서 답한다.
COBY 마크업: ***강조***, <<<복사 블록>>>, [[[주의]]], {{{성공}}}, (((팁))), --- (구분선).
마크업 기호 자체는 설명하지 않는다.""".strip()


# DeepSeek OpenAI-compatible API
API_URL = "https://api.deepseek.com/chat/completions"
DEFAULT_MODEL = "deepseek-v4-flash"


def get_model():
    """Render에서 필요하면 DEEPSEEK_MODEL로 모델을 바꿀 수 있지만 기본값은 V4 Flash다."""
    return os.getenv("DEEPSEEK_MODEL", DEFAULT_MODEL).strip() or DEFAULT_MODEL


def _clean_history(history):
    if not isinstance(history, list):
        return []

    cleaned = []
    for item in history[-10:]:
        if not isinstance(item, dict):
            continue
        role = item.get("role")
        content = item.get("content")
        if role not in {"user", "assistant"} or not isinstance(content, str):
            continue
        content = content.strip()
        if content:
            cleaned.append({"role": role, "content": content[:12000]})
    return cleaned


def ask_ai(
    message: str,
    history=None,
    context=None,
    ui_instructions=None,
    usage_knowledge=None,
    tone_settings=None,
):
    """DeepSeek OpenAI-compatible API로 Coby의 답변을 생성한다."""

    api_key = os.getenv("AI_API_KEY", "").strip()

    if not api_key:
        print("Coby error: AI_API_KEY is not configured")
        return "Coby의 AI API 키가 서버에 설정되지 않았어요. Render 환경변수 AI_API_KEY를 확인해주세요."

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    system_parts = [SYSTEM_PROMPT]

    if isinstance(ui_instructions, dict):
        system_parts.append("COBY UI 지침:\n" + str(ui_instructions.get("system", ""))[:3000])

    if isinstance(usage_knowledge, dict):
        system_parts.append("COBY 서비스 사용 지식:\n" + str(usage_knowledge)[:3000])

    if isinstance(tone_settings, dict):
        system_parts.append("사용자가 설정한 답변 스타일:\n" + str(tone_settings)[:1500])

    if context:
        system_parts.append("현재 프로젝트/작업 맥락:\n" + str(context)[:5000])

    messages = [{"role": "system", "content": "\n\n".join(system_parts)}]
    messages.extend(_clean_history(history))
    messages.append({"role": "user", "content": message})

    model = get_model()
    payload = {
        "model": model,
        "messages": messages,
        "temperature": 0.4,
        "max_tokens": 2048,
        "stream": False,
    }

    try:
        print(
            f"Coby: requesting DeepSeek model={model}, "
            f"history={len(messages) - 2}, message_length={len(message)}"
        )

        response = requests.post(
            API_URL,
            headers=headers,
            json=payload,
            timeout=120,
        )

        print(f"Coby: DeepSeek status={response.status_code}")
        response.raise_for_status()

        data = response.json()
        print(f"Coby: DeepSeek response keys={list(data.keys())}")

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

        usage = data.get("usage")
        if usage:
            print(f"Coby: DeepSeek usage={usage}")

        return answer.strip()

    except requests.HTTPError as error:
        print(f"Coby: DeepSeek API HTTP error: {error}")
        print(f"Coby: DeepSeek API response: {response.text[:2000]}")
        return "Coby의 AI 모델 요청이 거부되었어요. Render 로그를 확인해주세요."

    except requests.RequestException as error:
        print(f"Coby: DeepSeek API request failed: {error}")
        return "Coby의 AI 모델 서버에 연결하지 못했어요. 잠시 후 다시 시도해주세요."

    except (KeyError, IndexError, TypeError, ValueError) as error:
        print(f"Coby: DeepSeek API response parsing failed: {error}")
        return "AI 모델에서 예상하지 못한 응답이 왔어요. Render 로그를 확인해주세요."

    except Exception as error:
        print(f"Coby: unexpected error: {type(error).__name__}: {error}")
        return "Coby에서 예상하지 못한 오류가 발생했어요. Render 로그를 확인해주세요."
