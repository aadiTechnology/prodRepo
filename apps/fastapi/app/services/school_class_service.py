from sqlalchemy.orm import Session
from app.models.academic import ClassModel

def get_all_classes(db: Session, tenant_id: int = None):
    query = db.query(ClassModel)
    if tenant_id is not None:
        query = query.filter(ClassModel.tenant_id == tenant_id)
    return query.filter(ClassModel.is_deleted == False).all()