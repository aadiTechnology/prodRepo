from __future__ import annotations

from typing import Optional

from pydantic import BaseModel


class StudentSearchItem(BaseModel):
    id: int
    student_name: str
    student_code: Optional[str] = None
    admission_no: Optional[str] = None
    roll_no: Optional[str] = None
    class_id: Optional[int] = None
    class_name: Optional[str] = None

