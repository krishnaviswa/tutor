from fastapi import APIRouter, Depends, Response

from app.api.v1.deps import current_principal
from app.services.auth import Principal
from app.services.terms import read_terms

router = APIRouter()


@router.get("/terms")
def get_terms(response: Response, _principal: Principal = Depends(current_principal)):
    response.headers["Cache-Control"] = "no-store"
    return read_terms()
