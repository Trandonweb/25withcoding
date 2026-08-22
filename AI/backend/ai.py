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

COBY 전용 답변 마크업을 사용할 수 있다.
***텍스트*** = 굵게 강조
<<<내용>>> = 복사 가능한 블록
[[[내용]]] = 경고/주의
{{{내용}}} = 성공/완료
(((내용))) = 팁
--- = 구분선
마크업 기호 자체를 설명문으로 노출하지 않는다.
코드나 복사할 내용에는 <<< >>>를 사용한다.
사용자가 이전 대화 내용을 언급하면 제공된 대화 기록을 참고해 자연스럽게 이어서 답한다.
""".strip()


API_URL = "https://router.huggingface.co/v1/chat/completions"
DEFAULT_MODEL = "Qwen/Qwen2.5-7B-Instruct-1M"


def get_model():
    """Render 환경변수가 있으면 사용하되, 현재 지원되지 않는 구형 기본값은 교체한다."""
    model = os.getenv("HF_MODEL", DEFAULT_MODEL).strip()
    if model == "Qwen/Qwen2.5-7B-Instruct":
        return DEFAULT_MODEL
    return model or DEFAULT_MODEL


def _clean_history(history):
    if not isinstance(history, list):
        return []

    cleaned = []
    for item in history[-24:]:
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
    """Hugging Face Inference Providers의 OpenAI-compatible API로 Coby의 답변을 생성한다."""

    api_key = os.getenv("EXAONE_API_KEY", "").strip()

    if not api_key:
        print("Coby error: EXAONE_API_KEY is not configured")
        return "Coby의 AI API 키가 서버에 설정되지 않았어요. Render 환경변수를 확인해주세요."

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    system_parts = [SYSTEM_PROMPT]

    if isinstance(ui_instructions, dict):
        system_parts.append(
            "COBY UI 지침:\n" + str(ui_instructions.get("system", ""))
        )

    if isinstance(usage_knowledge, dict):
        system_parts.append(
            "COBY 서비스 사용 지식:\n" + str(usage_knowledge)
        )

    if isinstance(tone_settings, dict):
        system_parts.append(
            "사용자가 설정한 답변 스타일:\n" + str(tone_settings)
        )

    if context:
        system_parts.append(
            "현재 프로젝트/작업 맥락:\n" + str(context)[:12000]
        )

    messages = [{"role": "system", "content": "\n\n".join(system_parts)}]
    messages.extend(_clean_history(history))
    messages.append({"role": "user", "content": message})

    model = get_model()
    payload = {
        "model": model,
        "messages": messages,
        "temperature": 0.4,
        "max_tokens": 2048,
    }

    try:
        print(
            f"Coby: requesting Hugging Face model={model}, "
            f"history={len(messages) - 2}, message_length={len(message)}"
        )

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
