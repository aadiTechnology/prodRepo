from datetime import datetime

from sqlalchemy import BigInteger, Boolean, Column, DateTime, ForeignKey, Integer, String, Text

from app.core.database import Base


class AiAssistantSession(Base):
    __tablename__ = "ai_assistant_sessions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=True)
    title = Column(String(200), nullable=False, default="Navigation Assistant")
    is_active = Column(Boolean, nullable=False, default=True)
    last_message_at = Column(DateTime, nullable=True)
    message_count = Column(Integer, nullable=False, default=0)
    impersonated_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    created_by = Column(Integer, nullable=True)
    updated_at = Column(DateTime, nullable=True)
    updated_by = Column(Integer, nullable=True)
    is_deleted = Column(Boolean, nullable=False, default=False)
    deleted_at = Column(DateTime, nullable=True)
    deleted_by = Column(Integer, nullable=True)


class AiAssistantMessage(Base):
    __tablename__ = "ai_assistant_messages"

    id = Column(BigInteger, primary_key=True, index=True, autoincrement=True)
    session_id = Column(
        Integer,
        ForeignKey("ai_assistant_sessions.id", ondelete="CASCADE"),
        nullable=False,
    )
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=True)
    role = Column(String(20), nullable=False)
    message_text = Column(Text, nullable=False)
    is_error = Column(Boolean, nullable=False, default=False)
    input_source = Column(String(30), nullable=True)
    client_message_id = Column(String(64), nullable=True)
    action = Column(String(20), nullable=True)
    menu_id = Column(Integer, nullable=True)
    menu_name = Column(String(200), nullable=True)
    parent_menu_id = Column(Integer, nullable=True)
    parent_menu_name = Column(String(200), nullable=True)
    route = Column(String(500), nullable=True)
    error_type = Column(String(50), nullable=True)
    error_message = Column(String(1000), nullable=True)
    interpret_response_json = Column(Text, nullable=True)
    llm_provider = Column(String(50), nullable=True)
    tokens_prompt = Column(Integer, nullable=True)
    tokens_completion = Column(Integer, nullable=True)
    tokens_total = Column(Integer, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    created_by = Column(Integer, nullable=True)
    is_deleted = Column(Boolean, nullable=False, default=False)
    deleted_at = Column(DateTime, nullable=True)
    deleted_by = Column(Integer, nullable=True)
