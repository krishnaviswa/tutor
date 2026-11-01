This file is a defect log, not a spec and not a screen list.

## 2026-11-01 — Sign-in still uses a demo persona list

Status: Primary door is username and password (2026-11-01). The persona list remains under Local demo code and is not the sign-in. Phone numbers stay off that list.

The sign-in dropdown shows phone numbers (`+9101t`, `+9101o`, `+9101a`, `+9101s`, `+9101p`). A person should not see those codes.

The control is labeled "Demo Persona Quick-Select". That is a demo aid, not a product sign-in.

Choosing a person from a list does not scale. A workspace can have hundreds of faculty. Sign-in must be the person entering their own identity. The user expects a username and password later. Today's product sign-in is the one-time code, not a password. The list is the defect. The later replacement is one person typing their own identity. Username and password is the intended direction. This pass does not build that replacement.

The list exists today for the local demo only, so a reviewer can enter as owner, teacher, assistant, student, or parent without memorizing a code. OTP remains `000000` in that demo. This must not ship as the real door.
