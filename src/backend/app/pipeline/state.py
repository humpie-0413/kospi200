import threading
from datetime import datetime, timezone
from typing import Optional

STEP_NAMES = [
    "유니버스 멤버십 확장",
    "OHLCV 수집",
    "기술적 피처 재계산",
    "패널 재구축",
    "뉴스 수집",
    "감성분석",
    "뉴스 집계",
    "ESG 갱신",
    "패널 머지 + Track A",
    "MySQL 리로드",
]


class PipelineState:
    def __init__(self):
        self._lock = threading.Lock()
        self.is_running = False
        self.current_action: Optional[str] = None
        self.started_at: Optional[datetime] = None
        self.last_completed_at: Optional[datetime] = None
        self.last_status: Optional[str] = None
        self.last_message: Optional[str] = None
        # Step tracking
        self.current_step: int = -1
        self.total_steps: int = len(STEP_NAMES)
        self.step_statuses: list = []

    def acquire(self, action: str) -> bool:
        with self._lock:
            if self.is_running:
                return False
            self.is_running = True
            self.current_action = action
            self.started_at = datetime.now(timezone.utc)
            self.current_step = -1
            self.step_statuses = ["pending"] * self.total_steps
            return True

    def release(self, status: str, message: str = ""):
        with self._lock:
            self.is_running = False
            self.last_completed_at = datetime.now(timezone.utc)
            self.last_status = status
            self.last_message = message
            self.current_action = None
            self.started_at = None

    def update_step(self, step: int, status: str):
        """Update step progress (called from pipeline thread)"""
        with self._lock:
            if 0 <= step < self.total_steps:
                self.step_statuses[step] = status
                if status == "running":
                    self.current_step = step

    def to_dict(self) -> dict:
        return {
            "is_running": self.is_running,
            "current_action": self.current_action,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "last_completed_at": self.last_completed_at.isoformat() if self.last_completed_at else None,
            "last_status": self.last_status,
            "last_message": self.last_message,
            "current_step": self.current_step,
            "total_steps": self.total_steps,
            "steps": [
                {"index": i, "name": STEP_NAMES[i], "status": self.step_statuses[i] if i < len(self.step_statuses) else "pending"}
                for i in range(self.total_steps)
            ],
        }


pipeline_state = PipelineState()
