from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.v1.deps import current_principal, require_roles
from app.db import get_db
from app.models.tables import FeatureFlag, Workspace
from app.services.auth import Principal
from app.services.quota import ALWAYS_ON
from app.services.seed import SLICE_MODULES

router = APIRouter()


class WorkspaceIn(BaseModel):
    slug: str
    name: str
    kind: str = "exam-prep"


class WorkspacePatch(BaseModel):
    name: str | None = None
    student_whatsapp: int | None = None


def _out(ws: Workspace) -> dict:
    return {
        "id": ws.id,
        "slug": ws.slug,
        "name": ws.name,
        "kind": ws.kind,
        "student_whatsapp": bool(ws.student_whatsapp),
    }


@router.post("/workspaces")
def create_workspace(
    body: WorkspaceIn,
    db: Session = Depends(get_db),
    principal: Principal = Depends(require_roles("owner")),
):
    if db.query(Workspace).filter(Workspace.slug == body.slug).first():
        raise HTTPException(status.HTTP_409_CONFLICT, "slug taken")
    ws = Workspace(slug=body.slug, name=body.name, kind=body.kind)
    db.add(ws)
    db.flush()
    db.add(FeatureFlag(workspace_id=ws.id, modules=list(SLICE_MODULES)))
    return _out(ws)


@router.get("/workspaces/current")
def get_current(principal: Principal = Depends(current_principal), db: Session = Depends(get_db)):
    ws = db.get(Workspace, principal.workspace_id)
    if not ws:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "workspace")
    return _out(ws)


@router.patch("/workspaces/current")
def patch_current(
    body: WorkspacePatch,
    db: Session = Depends(get_db),
    principal: Principal = Depends(require_roles("owner")),
):
    ws = db.get(Workspace, principal.workspace_id)
    if not ws:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "workspace")
    if body.name is not None:
        ws.name = body.name
    if body.student_whatsapp is not None:
        ws.student_whatsapp = 1 if body.student_whatsapp else 0
    flags = db.query(FeatureFlag).filter(FeatureFlag.workspace_id == ws.id).first()
    if flags:
        modules = set(flags.modules)
        for m in ALWAYS_ON:
            modules.add(m)
        flags.modules = list(modules)
    return _out(ws)
