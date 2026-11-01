"""Read slide text and pictures out of a PPTX zip. The original file is not rewritten."""

from __future__ import annotations

import base64
import io
import re
import zipfile
from xml.etree import ElementTree as ET

_SLIDE = re.compile(r"ppt/slides/slide(\d+)\.xml$")
_IMAGE = {".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".gif": "image/gif", ".webp": "image/webp"}


def slides_from_pptx(blob: bytes) -> list[dict]:
    try:
        package = zipfile.ZipFile(io.BytesIO(blob))
    except zipfile.BadZipFile:
        return []
    names = []
    for name in package.namelist():
        match = _SLIDE.search(name)
        if match:
            names.append((int(match.group(1)), name))
    names.sort()
    pages = []
    for number, name in names:
        root = ET.fromstring(package.read(name))
        texts = [node.text.strip() for node in root.iter() if node.tag.endswith("}t") and (node.text or "").strip()]
        images = _slide_images(package, name)
        pages.append({"number": number, "texts": texts, "images": images})
    return pages


def _slide_images(package: zipfile.ZipFile, slide_name: str) -> list[dict]:
    rels_name = slide_name.replace("ppt/slides/", "ppt/slides/_rels/") + ".rels"
    if rels_name not in package.namelist():
        return []
    root = ET.fromstring(package.read(rels_name))
    found = []
    for node in root.iter():
        target = node.attrib.get("Target") or ""
        if "media/" not in target:
            continue
        path = "ppt/" + target.replace("../", "")
        if path not in package.namelist():
            continue
        ext = path[path.rfind(".") :].lower()
        mime = _IMAGE.get(ext)
        if not mime:
            continue
        raw = package.read(path)
        if len(raw) > 1_500_000:
            continue
        found.append({"mime": mime, "data_base64": base64.b64encode(raw).decode("ascii")})
    return found
