from sqlalchemy import Column, Integer, String, DateTime, Text
from datetime import datetime, timezone
from app.database import Base


class PipelineLog(Base):
    __tablename__ = "pipeline_logs"
    id = Column(Integer, primary_key=True, autoincrement=True)
    action = Column(String(50), nullable=False)
    status = Column(String(20), nullable=False)  # running, completed, failed
    started_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    finished_at = Column(DateTime, nullable=True)
    message = Column(Text, nullable=True)
    triggered_by = Column(String(50), nullable=True)
