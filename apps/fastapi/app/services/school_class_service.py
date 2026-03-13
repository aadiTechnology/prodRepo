from sqlalchemy.orm import Session
from app.models.school_class import SchoolClass

def get_all_classes(db: Session, tenant_id: int = None):
    query = db.query(SchoolClass)
    if tenant_id is not None:
        query = query.filter(SchoolClass.tenant_id == tenant_id)
    return query.filter(SchoolClass.is_deleted == False).all()