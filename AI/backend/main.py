import json
import os
from datetime import datetime
from typing import Any
from zoneinfo import ZoneInfo

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from ai import ask_ai

try:
    import firebase_admin
    from firebase_admin import credentials, firestore
except ImportError:
    firebase_admin = None
    credentials = None
    firestore = None


app = FastAPI()

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
    history: list[dict[str, Any]] = Field(default_factory=list)
    context: Any = None
    projectContext: Any = None
    uiInstructions: dict[str, Any] | None = None
    usageKnowledge: dict[str, Any] | None = None
    toneSettings: dict[str, Any] | None = None


class DisciplineApplyRequest(BaseModel):
    actorId: str = Field(min_length=1, max_length=20)
    targetId: str = Field(min_length=1, max_length=20)
    points: int = Field(ge=1, le=5)
    reason: str = Field(min_length=2, max_length=500)


class CommitteeAssignRequest(BaseModel):
    actorId: str = Field(min_length=1, max_length=20)
    targetId: str = Field(min_length=1, max_length=20)


def get_firestore():
    if firebase_admin is None:
        raise HTTPException(status_code=503, detail="Firebase Admin SDK가 설치되지 않았습니다.")

    try:
        firebase_admin.get_app()
    except ValueError:
        project_id = os.getenv("FIREBASE_PROJECT_ID", "").strip()
        client_email = os.getenv("FIREBASE_CLIENT_EMAIL", "").strip()
        private_key = os.getenv("FIREBASE_PRIVATE_KEY", "").replace("\\n", "\n").strip()

        if project_id and client_email and private_key:
            cred = credentials.Certificate({
                "type": "service_account",
                "project_id": project_id,
                "private_key": private_key,
                "client_email": client_email,
                "token_uri": "https://oauth2.googleapis.com/token",
            })
            firebase_admin.initialize_app(cred)
        else:
            firebase_admin.initialize_app()

    return firestore.client()


@app.get("/")
def home():
    return {
        "status": "online",
        "name": "Coby AI",
        "version": "0.3"
    }


@app.post("/chat")
def chat(request: ChatRequest):
    context = request.projectContext if request.projectContext is not None else request.context

    answer = ask_ai(
        request.message,
        history=request.history,
        context=context,
        ui_instructions=request.uiInstructions,
        usage_knowledge=request.usageKnowledge,
        tone_settings=request.toneSettings,
    )

    return {
        "answer": answer
    }


def coby_check_discipline(reason: str, points: int) -> dict[str, Any]:
    prompt = f"""
너는 코딩 동아리 '코딩과 함께라면'의 상벌관리위원회에서 사용하는 COBY 타당성 심사관이다.
아래 벌점 사유가 실제 동아리 운영에서 벌점을 부여할 만한 구체적인 행동을 설명하는지 공정하게 판단하라.
개인적인 감정, 보복, 모욕, 단순한 비호감, 근거 없는 추측만으로는 승인하지 마라.
사유가 충분히 구체적이고 벌점 사유로 합리적이면 approved=true로 판단한다.
벌점 점수 자체는 1~5 범위인지 확인하되, 점수가 과도하다는 이유만으로 자동 거부하지 말고 사유의 타당성을 중심으로 판단하라.
반드시 JSON 하나만 반환하라. Markdown이나 설명문을 붙이지 마라.
형식: {{"approved": true 또는 false, "reason": "짧은 한국어 판단 이유"}}

벌점: {points}점
사유: {reason}
""".strip()

    answer = ask_ai(
        prompt,
        history=[],
        context="상벌관리위원회장 전용 타당성 심사. 결과는 JSON만 반환해야 한다.",
        ui_instructions={"system": "반드시 JSON 객체 하나만 출력한다. 일반적인 COBY 답변 형식은 사용하지 않는다."},
    )

    try:
        cleaned = answer.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.replace("```json", "", 1).replace("```", "", 1).strip()
        result = json.loads(cleaned)
        return {
            "approved": bool(result.get("approved")),
            "reason": str(result.get("reason", "판단 결과가 반환되지 않았습니다."))[:500],
        }
    except (json.JSONDecodeError, TypeError, ValueError):
        return {
            "approved": False,
            "reason": "COBY의 타당성 판정 결과를 안전하게 확인하지 못했습니다.",
        }


@app.post("/discipline/apply")
def discipline_apply(request: DisciplineApplyRequest):
    reason = request.reason.strip()
    if not reason:
        raise HTTPException(status_code=400, detail="벌점 사유를 입력해야 합니다.")

    db = get_firestore()
    actor_ref = db.collection("users").document(request.actorId)
    target_ref = db.collection("users").document(request.targetId)
    actor_snap = actor_ref.get()
    target_snap = target_ref.get()

    if not actor_snap.exists:
        raise HTTPException(status_code=403, detail="등록되지 않은 사용자입니다.")
    if actor_snap.to_dict().get("role") != "committee_chair":
        raise HTTPException(status_code=403, detail="상벌관리위원회장만 사용할 수 있습니다.")
    if not target_snap.exists:
        raise HTTPException(status_code=404, detail="대상 사용자를 찾을 수 없습니다.")
    if request.targetId == request.actorId:
        raise HTTPException(status_code=400, detail="본인에게 벌점을 부여할 수 없습니다.")

    # '하루'는 한국 시간(Asia/Seoul) 기준으로 계산한다.
    today_key = datetime.now(ZoneInfo("Asia/Seoul")).strftime("%Y-%m-%d")
    daily_ref = db.collection("discipline_daily").document(f"{request.targetId}_{today_key}")
    daily_snap = daily_ref.get()
    daily_data = daily_snap.to_dict() if daily_snap.exists else {}
    awarded_today = int(daily_data.get("points", 0) or 0)
    remaining_today = max(0, 5 - awarded_today)

    if remaining_today <= 0:
        raise HTTPException(
            status_code=400,
            detail="하루 최대 5점입니다. (이미 부여한 점수-5)점만 적용됩니다. 오늘은 추가 적용할 수 있는 벌점이 없습니다."
        )

    # 신청 점수가 오늘 남은 한도를 초과하면 남은 점수까지만 적용한다.
    apply_points = min(request.points, remaining_today)

    assessment = coby_check_discipline(reason, apply_points)
    if not assessment["approved"]:
        return {
            "applied": False,
            "approved": False,
            "reason": assessment["reason"],
            "points": 0,
        }

    record_ref = db.collection("discipline_records").document()
    transaction = db.transaction()

    @firestore.transactional
    def apply_transaction(txn):
        fresh_actor = actor_ref.get(transaction=txn)
        fresh_target = target_ref.get(transaction=txn)
        fresh_daily = daily_ref.get(transaction=txn)

        if not fresh_actor.exists or fresh_actor.to_dict().get("role") != "committee_chair":
            raise ValueError("상벌관리위원회장 권한이 없습니다.")
        if not fresh_target.exists:
            raise ValueError("대상 사용자를 찾을 수 없습니다.")

        fresh_daily_data = fresh_daily.to_dict() if fresh_daily.exists else {}
        fresh_awarded_today = int(fresh_daily_data.get("points", 0) or 0)
        fresh_remaining = max(0, 5 - fresh_awarded_today)

        if fresh_remaining <= 0:
            raise ValueError("하루 최대 5점입니다. (이미 부여한 점수-5)점만 적용됩니다. 오늘은 추가 적용할 수 있는 벌점이 없습니다.")

        actual_points = min(request.points, fresh_remaining)

        txn.update(target_ref, {
            "score": firestore.Increment(-actual_points)
        })

        daily_payload = {
            "targetId": request.targetId,
            "date": today_key,
            "points": fresh_awarded_today + actual_points,
            "updatedAt": firestore.SERVER_TIMESTAMP,
        }
        if fresh_daily.exists:
            txn.update(daily_ref, daily_payload)
        else:
            txn.set(daily_ref, daily_payload)

        txn.set(record_ref, {
            "actorId": request.actorId,
            "targetId": request.targetId,
            "points": -actual_points,
            "requestedPoints": request.points,
            "reason": reason,
            "cobyApproved": True,
            "cobyReason": assessment["reason"],
            "dateKey": today_key,
            "createdAt": firestore.SERVER_TIMESTAMP,
        })

        return actual_points

    try:
        actual_points = apply_transaction(transaction)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error))

    was_capped = actual_points < request.points
    return {
        "applied": True,
        "approved": True,
        "reason": assessment["reason"],
        "points": actual_points,
        "requestedPoints": request.points,
        "dailyLimit": 5,
        "capped": was_capped,
        "message": (
            f"하루 최대 5점입니다. (이미 부여한 점수-5)점만 적용됩니다. {actual_points}점이 적용되었습니다."
            if was_capped else f"{actual_points}점이 적용되었습니다."
        ),
    }


@app.post("/committee/assign")
def committee_assign(request: CommitteeAssignRequest):
    db = get_firestore()
    actor_ref = db.collection("users").document(request.actorId)
    target_ref = db.collection("users").document(request.targetId)
    actor_snap = actor_ref.get()
    target_snap = target_ref.get()

    if not actor_snap.exists or actor_snap.to_dict().get("role") != "president":
        raise HTTPException(status_code=403, detail="회장만 상벌관리위원회장을 지정할 수 있습니다.")
    if not target_snap.exists:
        raise HTTPException(status_code=404, detail="대상 사용자를 찾을 수 없습니다.")
    if request.targetId == request.actorId:
        raise HTTPException(status_code=400, detail="회장 본인을 상벌관리위원회장으로 지정할 수 없습니다.")

    current_chair = db.collection("users").where("role", "==", "committee_chair").limit(1).get()
    batch = db.batch()
    for snap in current_chair:
        if snap.id != request.targetId:
            batch.update(snap.reference, {"role": "student"})
    batch.update(target_ref, {"role": "committee_chair"})
    batch.commit()

    return {"success": True, "role": "committee_chair", "targetId": request.targetId}
