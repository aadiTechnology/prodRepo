from typing import Optional
from pydantic import EmailStr
from pydantic import BaseModel

# --- StudentDetailResponse for GET by ID ---
class StudentDetailResponse(BaseModel):
    id: str
    name: str
    gender: str
    date_of_birth: str
    mobile: str
    email: Optional[EmailStr] = None
    address: Optional[str] = None
    area: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    class_id: Optional[int] = None
    class_division_id: Optional[int] = None
    is_active: Optional[bool] = None
    parent_id: Optional[int] = None
    parent_name: Optional[str] = None
    parent_mobile: Optional[str] = None
    admission_no: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import Optional, List, Dict, Any

# --- Add ParentCreateRequest before StudentUpdateRequest ---
class ParentCreateRequest(BaseModel):
    parent_name: str
    mobile_number: str

# --- Add StudentUpdateRequest for PATCH/PUT ---
class StudentUpdateRequest(BaseModel):
    student_name: Optional[str] = None
    gender: Optional[str] = None
    date_of_birth: Optional[str] = None
    mobile_number: Optional[str] = None
    email: Optional[EmailStr] = None
    address: Optional[str] = None
    area: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    class_id: Optional[int] = None
    class_division_id: Optional[int] = None
    is_active: Optional[bool] = None
    parent: Optional[ParentCreateRequest] = None

class StudentListItem(BaseModel):
    id: str
    name: str
    gender: Optional[str]
    mobile: Optional[str]
    class_: Optional[str] = Field(None, alias="class")

    model_config = {
        "populate_by_name": True,
        "from_attributes": True,
    }
    status: str


class Pagination(BaseModel):
    page: int
    limit: int
    total: int

class StudentListResponse(BaseModel):
    data: List[StudentListItem]
    pagination: Pagination



class StudentCreateRequest(BaseModel):
    student_name: str
    gender: str
    date_of_birth: str
    mobile_number: str
    email: Optional[EmailStr] = None
    address: Optional[str] = None
    area: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    class_id: int
    class_division_id: int
    is_active: bool = True
    parent: ParentCreateRequest
    tenant_id: int

# --- Add StudentCreateResponse ---
class StudentCreateResponse(BaseModel):
    message: str
    student_id: int
