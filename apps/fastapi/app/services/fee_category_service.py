from sqlalchemy.orm import Session
from app.models.fee import FeeCategory

def get_all_fee_categories(db: Session, tenant_id: int = None):
    query = db.query(FeeCategory)
    if tenant_id is not None:
        query = query.filter(FeeCategory.tenant_id == tenant_id)
    return query.all()