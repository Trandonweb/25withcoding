def ask_ai(message: str):

    # 현재는 테스트 AI
    # 나중에 EXAONE 연결 위치

    if "파이썬" in message or "python" in message.lower():
        return "파이썬은 배우기 쉬운 프로그래밍 언어입니다. 변수, 조건문, 반복문부터 시작하면 좋습니다."

    if "안녕" in message:
        return "안녕하세요! 저는 Coby AI입니다. 코딩을 함께 도와드릴게요."

    return f"'{message}'에 대한 답변을 준비 중입니다."
