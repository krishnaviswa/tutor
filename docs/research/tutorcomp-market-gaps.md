# TutorComp and tutoring-ops market gaps

Research date: 31 October 2026.

## 1. What this note is / is not

This file is **market research**. It is not a requirement, not a spec, and not a screen list.

TutorOS is a subject-neutral remote tutoring workspace. Biology / NEET / NCERT in this repository is an **example tenant**, not the domain. Nothing below asks for a syllabus database, a sixth login role, or student WhatsApp turned on by default. Those would conflict with product non-negotiables; they are called out where a competitor does something adjacent.

No catalog screen id is invented here. Existing ids are named only as seeds that already exist in `catalog/screens.json`. An in-progress UX pass (Outlook-style week calendar, a fuller attendance roll, a prefilled demo week, a seeded faculty-admin grant) is treated as **not shipped**.

Sources are public pages only: marketing site, terms, indexed reviews, and public GitHub READMEs. No login, no private API, no portal behind an account.

**Fact** means a public page or README states it. **Judgment** means an operations reading of those facts against how a tutoring company actually runs. The two are labeled in sections 6 and 7.

## 2. TutorComp — what the public product appears to be

TutorComp (Tutorcomp Infotech (India) Private Limited, Kochi) sells **live, mostly one-to-one online tutoring** to families, with the parent treated as the paying customer. The public site aims at K-12 and university learners on named school programs (IGCSE, A Level, IB, CBSE/ICSE, SABIS, US, Australian, Canadian, and others) plus test prep (SAT, ACT, IELTS, TOEFL, and entrance exams including JEE and NEET as **their** catalog, not a reason for TutorOS to grow a board database). Offices are listed in India, Dubai, the United States, and Oman; the homepage says parents in 25+ countries. The commercial motion is a free demo, an academic team that matches a tutor, then an **upfront hour package** on their own classroom (whiteboard, voice, and video), not a tool a coaching institute installs. Starting prices on the homepage sit around $17–$18; a GCSE landing page advertises “buy 4 hours, get 4 free.” That geography-and-package picture is from the site. Whether the matching and scheduling software is as self-serve as a designer’s case study claims is **not** confirmed on the pages fetched here (see scheduling, below).

## 3. TutorComp feature inventory

Each bullet is one feature. “Seen on public site” means a TutorComp page stated it in this pass. “Inferred from reviews” means a public review described it and the marketing page did not.

### Acquisition and trial

- Free demo / trial class as the enroll call to action. Seen on public site. https://www.tutorcomp.com/ and https://www.tutorcomp.com/gcse-online-tutoring
- Enquiry form, then an academic team proposes a plan before a tutor is assigned. Seen on public site. https://www.tutorcomp.com/about-us
- Seven-step journey on a program landing page: assessment, learning plan, tutor match, feedback, progress reports, plan adjustment, new goals. Seen on public site. https://www.tutorcomp.com/gcse-online-tutoring
- Tutor assigned from subject choice after the family buys a package; a channel partner may quote the price. Seen on public site. https://www.tutorcomp.com/tnc
- Tutor hiring page (“Become a Tutor”) plus terms that describe credential screening, which may be delegated to a third party. Seen on public site. https://www.tutorcomp.com/teacherjobapplication and https://www.tutorcomp.com/tnc
- Referral program: both sides receive tutoring hours (not cash) after the new customer buys a minimum package, with monthly caps and expiry. Seen on public site. https://www.tutorcomp.com/tnc (section 14). The referral URL itself mostly rendered curriculum menus: https://www.tutorcomp.com/referral
- Named academic coordinator who answers parents quickly. Inferred from reviews. https://www.trustpilot.com/review/www.tutorcomp.com and https://www.smartcustomer.com/reviews/tutorcomp.com

### Scheduling

- Sessions are timed from tutor availability and the student’s requested time; the company may cancel or move a class and says it will notify the family. Seen on public site. https://www.tutorcomp.com/tnc
- Reschedule request by email or on their platform, at least 24 hours ahead, only inside the tutor’s availability calendar and the package rules. A no-notice miss is not covered by the cancellation policy, and missed or rescheduled classes are not refunded. Seen on public site. https://www.tutorcomp.com/tnc
- If the teacher cannot teach, the company reschedules or supplies another teacher. A family can ask for a different tutor; terms say they will try within 48 hours. Replacement can follow lateness, absence, or performance complaints, investigated by an academic associate. Seen on public site. https://www.tutorcomp.com/tnc
- Families describe schedule changes as flexible. Inferred from reviews. https://www.smartcustomer.com/reviews/tutorcomp.com
- A public design case study describes family self-booking (“flexi” single slots and recurring weekly slots), tutors marking a repeating week plus date overrides, conflict blocking, and remaining hours shown while booking. **Not confirmed on tutorcomp.com in this pass.** Direct fetch of https://shabanmohammed.com/tutorcomp-NEW returned 404; a search index still summarizes that page. Treat as unverified secondary material, not as a live-site feature.

### Live class

- Built-in shared whiteboard plus voice and video; the join link is issued ahead of time and opened after login with credentials the company provides. Seen on public site. https://www.tutorcomp.com/about-us and https://www.tutorcomp.com/tnc
- Default is one student per session unless the enrolment says group. Seen on public site. https://www.tutorcomp.com/tnc
- Student and tutor may record; quality-control staff may watch or record. Parents may watch live or the recording. Seen on public site. https://www.tutorcomp.com/tnc and https://www.tutorcomp.com/about-us
- Late entry is refused and the hour is not refunded or moved. The terms disagree with themselves: one clause says more than 15 minutes late, another says login after 10 minutes. Seen on public site. https://www.tutorcomp.com/tnc (sections 3.2 and 6.6)
- Login about 10 minutes early is expected. Seen on public site. https://www.tutorcomp.com/tnc
- Reviewers mention a simple classroom with whiteboard and working on papers online, plus occasional tutor-side bandwidth trouble and a technical team that helps when a student is late to join. Inferred from reviews. https://www.smartcustomer.com/reviews/tutorcomp.com
- A Chrome Web Store search snippet describes a TutorComp extension “to record and stream desktop over call.” Direct fetch of the store item returned “not available.” Unverified; not counted as a confirmed feature. https://chromewebstore.google.com/detail/tutorcomp/lelaodglfjcjedhlafokgednigdclcio

### Academic ops

- Learning plan fitted to the student’s level, time, and goals, then regular sessions. Seen on public site. https://www.tutorcomp.com/about-us
- A short check of understanding every three sessions, described on the homepage as a weekly progress update. Seen on public site. https://www.tutorcomp.com/ and https://www.tutorcomp.com/about-us
- Doubt clearing inside the lesson, and homework answers compared in class, show up in site testimonials. Seen on public site (testimonial), not as a tracked homework product. https://www.tutorcomp.com/
- Practice tests, past-paper discussion, and a named “SATLab” practice area are marketed for test prep. Seen on public site. https://www.tutorcomp.com/
- A place aggregator snippet says a tutor re-tests the previous class’s topics. Inferred from reviews (aggregator, not opened in Google’s own UI). https://exa.ai/library/place/x2l21rhpnk1

### Parent

- The paying parent or guardian is bound by the terms even when the student is under 18. Seen on public site. https://www.tutorcomp.com/tnc
- Regular parent communication and progress reports so the family is not waiting for school exam results. Seen on public site. https://www.tutorcomp.com/about-us and https://www.tutorcomp.com/gcse-online-tutoring
- Parents praise coordinators who notice a learner’s anxiety and talk to the parent privately about weaknesses. Inferred from reviews. https://www.trustpilot.com/review/www.tutorcomp.com
- One reviewer wished the company supplied its own study resources. Inferred from reviews. https://www.trustpilot.com/review/www.tutorcomp.com

### Teacher ops

- Username and password after payment; do not share the login; do not exchange personal contact details with the tutor. Seen on public site. https://www.tutorcomp.com/tnc
- Tutor performance can be reviewed by the academic team and HR; consistent lateness is a replacement reason. Seen on public site. https://www.tutorcomp.com/tnc
- A 2020 review says coordinators and tutors do not communicate, and tutors are often unavailable. Inferred from reviews. https://www.smartcustomer.com/reviews/tutorcomp.com
- A 2026 public LinkedIn post alleges slow tutor pay; the company replied on that thread that payments were made and evidence was shared. The dispute is **unresolved in public**. It is not treated here as proof of non-payment. https://www.linkedin.com/posts/aruna-bk-6259401aa_top-online-tutors-worldwide-book-a-free-activity-7486614345129345024-4K3O

### Billing

- Family picks subjects and a class count, then pays the package up front (card, bank, or other listed methods via a payment aggregator). Services can stop if payment is late. Seen on public site. https://www.tutorcomp.com/tnc
- Homepage price band about $17–$18 and a “4 hours plus 4 free” offer on a program page. The pricing URL did not return a full public rate card in this pass (mostly curriculum lists and testimonials). Seen on public site. https://www.tutorcomp.com/ and https://www.tutorcomp.com/gcse-online-tutoring and https://www.tutorcomp.com/pricing
- A reviewer says packages exist and paid minutes are not dropped. Inferred from reviews. https://www.trustpilot.com/review/www.tutorcomp.com
- Referral hours expire and cannot be cashed out. Seen on public site. https://www.tutorcomp.com/tnc

### Content

- Curriculum and exam menus (school boards, languages, coding topics) are the **sales catalog of this company**. Seen on public site. https://www.tutorcomp.com/pricing and https://www.tutorcomp.com/faq
- “World-class academic materials in every tutoring session” is a marketing line. Seen on public site. https://www.tutorcomp.com/
- Session recordings are for the family’s own revision; the company claims ownership of session content and may use recordings in promotion. Seen on public site. https://www.tutorcomp.com/tnc
- The FAQ URL returned subject lists, not a help article, in this fetch (likely client-rendered). No public help center was found.

### Admin

- Academic team, academic associate, and HR are named in the terms as the people who investigate tutor problems. Seen on public site. https://www.tutorcomp.com/tnc
- Quality monitoring of live sessions by staff who are not the tutor. Seen on public site. https://www.tutorcomp.com/tnc
- Multi-city offices. That is company geography, **not** evidence of a product a customer uses to run several branches. Seen on public site. https://www.tutorcomp.com/about-us
- Account is username/password, not a public description of OTP. Seen on public site. https://www.tutorcomp.com/tnc

## 4. GitHub public products

Star counts are a weak signal. These six have a real operations surface (scheduling, attendance, money, parent visibility, or a live class). Toys and school-wide ERPs were skipped. None of this is a TutorOS requirement.

### AllTrue — multi-branch cram school

https://github.com/jerry200176-png/AllTrue_System

**What it is.** A tutoring-center system the README says runs in production for four Taipei campuses (directors, teachers, front desk, parents). Updated on GitHub into October 2026. Low star count; the product surface is the point.

**Features (from the public README).** Student enrolment per campus; a course contract with rate and sessions remaining; calendar sessions; fixed weekly slots; attendance / sign-in including RFID plus manual front-desk check-in; teacher learning records that a director approves; invoices and tuition alerts; substitute and makeup requests; parent view of schedule, evaluations, and payment status (portal or LINE); branch-scoped data.

**What TutorOS can learn.** The contract (“sessions left”) is the object that scheduling, attendance, and money share. Makeup and a substitute are normal operations, not exceptions. A front desk can mark presence without being a new login if an existing assistant or faculty-admin grant can do it. Multi-campus isolation matters only if a buyer runs branches. LINE-to-parent is their channel; TutorOS already treats WhatsApp as a channel for parents, not the ledger.

### Tutor Pro — tutor back office plus a live room

https://github.com/longtq2501/Tutor-Pro (README links a live site, https://tutorpro.id.vn)

**What it is.** A tutor-built system the README says is in production: bulk scheduling, notifications, WebRTC teaching, and invoicing. Small public repo (about 5 stars in this pass). Claims of production are the author’s, not independently checked.

**Features (from the public README).** Generate a month of sessions for a whole roster in one action, with conflict checks; instant notices when a session moves, a grade posts, or an exam is assigned; PDF invoices with a local bank QR (VietQR) so reconciliation is not a chat thread; live room with shared whiteboard, device-failure handling, and in-browser recording of screen, camera, and audio.

**What TutorOS can learn.** Bulk “fill the term from the weekly pattern” is what an office actually does on Monday. A payment instruction that sits on the invoice matters more than a new checkout brand while ports stay mock. Live video inside the product is **their** choice; TutorOS already points at Meet or Teams and keeps the record on the timeline. Do not copy an in-app media stack from this README.

### CogNote — lesson studio with a family link

https://github.com/andresjmorales/cognote (homepage linked from the README: https://cognote.studio)

**What it is.** Open-source back office a working piano studio says it runs daily. Music is the subject; the operations are the same as paid 1-on-1 tutoring. About 8 stars, MIT, active contributors.

**Features (from the public README).** Family CRM (siblings share one portal); recurring weekly slots with timezone-stable times; tap-to-mark attendance as attended, teacher cancel, student cancel, or no-show, including how much notice the student gave; makeup credits computed from that status and a studio policy (window, which statuses earn credit, expiry), each makeup tied to the cancellation that created it; family-facing lesson note emailed and posted to the portal; invoices drafted from attendance and rates; prepaid packs such as “10 × 30-minute lessons,” with the portal showing credits left and an expiry; optional card checkout, manual pay by default; one unguessable family link for schedule, notes, practice, and invoices (no parent password).

**What TutorOS can learn.** This is the clearest public picture of “reschedule without chaos” and “parent trust without opening chat.” Four attendance outcomes beat a bare present/absent if no-shows and teacher cancels must bill differently. The no-login link is **their** auth choice. TutorOS already has a parent role and `parent-link`; the lesson is the **contents** of that hub (hours left, last note, next class), not a second identity system. Drag-and-drop is not what this README describes; it is a week list you tap.

### Sentra Smartboard — session is the payroll source

https://github.com/drferdii/Smartboard-learning

**What it is.** An Indonesian tutoring-centre (bimbel) application. The README calls it a private product candidate in active development, built so schedules, attendance, evaluations, tutor honor, and payroll cannot drift apart. The author lists six personas. That is **their** access model. It is not a proposal to add roles in TutorOS.

**Features (from the public README).** Recurring or one-off sessions kept in sync when the template changes; tutor check-in/out and student presence, plus catch-up and substitutes; evaluations with a parent-safe note and a separate internal note; human verification before an evaluation is published; tutor honor from verified sessions (rate, transport, substitution, overtime); payroll periods that lock, with immutable corrections after close and a slip the tutor can see; owner approval queue; reports across operations and money.

**What TutorOS can learn.** Pay the teacher from the same session that attendance and the parent note already verified. Honor slips answer the public pay disputes in this market better than a spreadsheet. “Academic admin” and “finance” here are jobs an owner, an assistant, or a faculty-admin grant can hold. Do not add a sixth login to copy this table. Parent-safe versus internal notes is a useful split on `record` and `timeline`.

### Coaching MS — batch institute CRM

https://github.com/qtecsolution/coaching-management (README links https://coaching-ms.qtecsolution.com/)

**What it is.** A coaching-institute package: admin and teacher access, batches, fees, attendance, messages, and leads. The README is the source. A later fetch of the repo page did not repeat the long feature list, so the bullets below follow the README text indexed in search, not a private demo.

**Features (from that public README).** Leads; students with batch assignment and custom fields; batch timetable (day, teacher, start, end); fee collection by batch and by milestone; weekly class rows generated from the batch; teacher marks attendance; admin can watch that; in-app messages.

**What TutorOS can learn.** A lead that is not yet a roster student is how demo classes become paid batches. TutorOS cohorts already cover the batch once the learner exists. Milestone fees are another way to sell a pack, beside CogNote’s lesson credits and TutorComp’s hour bundles. Messaging stays a channel.

### Tutora — parent sees fees and attendance

https://github.com/suvrat007/tutora (README links https://tutor-a.vercel.app)

**What it is.** A small CRM for a solo tutor or a little institute: attendance, batches, fees, and a parent site. Zero or near-zero stars; included because the parent surface is concrete, not because it is a large product.

**Features (from the public README).** Present / absent / late, saved as the teacher taps, with rules that block future dates and wrong weekdays; attendance percentage from admission date; monthly paid/unpaid fees, history, and overdue marks; parent pages for attendance, fees, and a week schedule (day picker on a phone, grid on a desktop); batches with weekdays and time; the README’s point is that parents should not need a WhatsApp from the tutor to know status.

**What TutorOS can learn.** “Late” as its own mark, and a parent week view, are the missing everyday layer on top of a ledger. Face recognition and a fully separate parent password are **not** the lesson. TutorOS already has `parent` and parent WhatsApp; the gap is a hub that is true before anyone sends a message.

### What these repos do not show

None of the READMEs above describe a drag-and-drop week calendar. They describe week grids, slot picks, and bulk generation. A calendar people can drag is **judgment** (and an unshipped TutorOS UX idea), not a feature copied from these repos or from TutorComp’s public site.

## 5. What reviewers complain about or praise in this market

Public review fetches were incomplete (see the end of this note). Themes below are from Trustpilot snippets indexed in search (about 53 reviews, shown as 4.5), SmartCustomer (19 reviews, shown as 3.7), a place-listing snippet (about 4.7 from about 197 reviews), site testimonials, and one LinkedIn thread. No Reddit thread and no G2 page turned up. No TutorComp app on Google Play or the Apple App Store turned up. Phrases are paraphrased, not copied reviews.

**Praise**

- Grades and confidence moved, including for exam years (IGCSE and similar). Fact, from review snippets and site testimonials.
- The tutor is patient and checks that the student is actually following. Fact, testimonials and reviews.
- Coordinators answer and will talk to the parent about weaknesses, including anxiety the parent had not named. Fact, Trustpilot-indexed review.
- Recorded lessons can be replayed. Fact, Trustpilot-indexed review and place-listing snippet.
- Reschedules are allowed and people describe the company as not rigid. Fact, SmartCustomer and Trustpilot-indexed reviews.
- Packages feel like the paid time is kept. Fact, one Trustpilot-indexed review.
- Scheduling feels flexible and the classroom is easy enough to use. Fact, place-listing snippet and SmartCustomer.

**Complaints and wishes**

- An older review: coordinators do not stay in touch with tutors, apologies do not change anything, and tutors are not available. Fact, SmartCustomer, 2020. One review is not a trend, but it matches the operational risk of a human matching desk.
- Occasional tutor internet trouble, with the technical team involved when a student joins late. Fact, SmartCustomer.
- A wish that the company had its own worksheets, not only the live tutor. Fact, Trustpilot-indexed review. TutorOS already seeds this with `library`, `lesson`, and `qbank`.
- Tutor pay is argued in public; the company disputes the allegation. Fact that the argument exists; **not** a fact that pay was withheld.

**Judgment from those themes.** Families buy the coordinator as much as the whiteboard. They forgive software if someone answers, the replay exists, and the hour is not lost. They get angry when the tutor is missing and nobody owns the reschedule. Teachers get angry when delivered sessions and pay do not match. That split — parent trust on one side, tutor utilization and pay on the other — is the market this note uses. It is judgment, grounded in the themes above plus the GitHub ops systems, not a quote.

## 6. Gaps versus TutorOS

TutorOS already has OTP login; roles owner, teacher, assistant, student, and parent; a workspace; cohorts and 1-on-1; weekly staff availability and date exceptions; a schedule week; session states; attendance present/absent; the timeline as ledger; WhatsApp, email, and push as channels (student WhatsApp owner-gated); practice, tests, doubts, assignments, a content library, and a whiteboard; an owner console; a faculty-admin grant that is not a separate login (010, not Accepted); and mock vendor ports. Billing, invoices, and payouts are largely catalog, with 008 still Draft. 007 (sessions and timetable) is its own spec and not folded into this note as shipped product behavior beyond what the README already states.

Only valuable gaps are listed. Priority is for a later human decision: **now** (a tutoring company feels the hole every week), **next** (after the ledger of hours and attendance is trustworthy), **later** (real only for some buyers).

| Enhancement | Why a tutoring company cares | TutorOS seed | Priority |
|---|---|---|---|
| Let a parent see attendance, the last class note, and fees or hours left without opening a chat thread | Parent trust is what keeps the package renewing. TutorComp sells progress every three sessions and recordings; CogNote, Tutora, and AllTrue put schedule, notes, and money on a parent surface. **Fact** that those products do this. **Judgment** that chat-only updates do not scale. | `parent-home` (catalog already describes attendance, fee due, receipts, practice, tests), `payments`, `record`, `timeline`, `reports` | now |
| Sell a prepaid hour or lesson pack, show the balance, and burn a credit on a delivered class or a no-notice miss | TutorComp’s public contract is an upfront package, a 24-hour notice rule, and no refund for a missed class. CogNote bills from attendance and shows credits left. **Fact.** **Judgment:** without a balance, reschedule arguments become accounting arguments. | `billing`, `payments`, `sessions` (scheduled / completed / cancelled), attendance on `record`. 008 is still Draft, so this is a seed, not a finished wallet | now |
| Reschedule inside a notice window, bank a makeup or forfeit the hour, and offer another teacher when the first cannot teach | TutorComp terms and parent reviews are mostly about this. AllTrue has makeup and substitutes. CogNote ties the makeup to the cancellation. **Fact.** **Judgment:** “move a block on the calendar” is not enough if the hour balance and the substitute are decided in chat. | `schedule` (already reschedules and notifies), `availability`, `sessions` (010 handoff is in progress, not Accepted) | now |
| Turn a demo enquiry into a matched tutor and a paid pack | TutorComp’s public motion is demo, academic plan, tutor match, then package. Coaching MS lists leads. **Fact.** **Judgment:** TutorOS starts once people are on the roster, so a company using it still runs the top of the funnel in a sheet. | No lead screen in the closed set. Nearby seeds: `roster`, `sessions`, `messages`, `onboard-kind` (workspace kind, not a family enquiry) | next |
| Let a family book the next open hour on the tutor’s published week | Terms mention a tutor availability calendar and platform reschedule. The flexi/recurring UI is only the unverified case study. CogNote and Tutora show the week to the family; they do not show drag-and-drop. **Fact** for “open times visible”; **judgment** that self-serve booking cuts coordinator load. Drag is not sourced. | `availability`, `schedule`. Parent hub is described as read-only except pay and chat | next |
| Mark attended, teacher-cancel, student-cancel, and no-show, then show which teachers are full and which paid hours were wasted | CogNote’s four statuses and AllTrue’s “today” board are **fact**. TutorComp’s late lockout is **fact** but not a utilization report. **Judgment:** present/absent cannot price a no-show or explain an empty evening. The fuller roll in the current UX pass is not shipped. | Attendance today is present/absent. `teacher-dash`, `owner`, `reports` are the places a fill-rate would show | next |
| Pay teachers from verified delivered sessions, with a statement the teacher can check | Sentra’s whole thesis. TutorOS `payouts` is a catalog statement (name, period, session count) and 008 is Draft. The LinkedIn thread shows the market pain and also shows the company contesting it. **Judgment** that the statement must follow attendance, not a side spreadsheet. | `payouts`, `record`, `owner` | next |
| Show the parent whether assigned work was finished, tied to the class that set it | TutorComp testimonials mention homework compared in class; they do not show a tracker. TutorOS already has assignments and a mentor backlog. **Judgment** that follow-through is what parents mean by “are they doing the work?” | `assign-issue`, `assign-grade`, `mentor`, `parent-home` | next |
| See several branches without mixing their students | AllTrue’s campuses are **fact**. TutorComp’s four offices are geography, not a multi-branch product. **Judgment:** later, and only if a buyer runs more than one center. A workspace is already the tenant wall. | Workspace plus `owner`. Not a new role | later |
| Spot-check a live or recorded class for quality without sitting in every session | TutorComp terms allow quality staff to watch or record. **Fact.** TutorOS stores a video pointer and a session record rather than hosting video. **Judgment:** useful once volume is high, not before hours and attendance are true. | `session-video`, `record`, `owner`, faculty-admin grant (010, not Accepted) | later |

### Explicit non-goals (conflicts with TutorOS rules)

- **No syllabus or exam-board database.** TutorComp’s IGCSE / IB / CBSE / NEET menus are that company’s sales catalog. TutorOS topics stay tenant taxonomy.
- **No sixth login** for “academic coordinator,” “finance,” or “front desk.” Those jobs in TutorComp and Sentra map to owner, assistant, or the faculty-admin grant.
- **Student WhatsApp stays owner-gated.** Other products push parents on LINE or a click-to-chat fee reminder. Parent and admin channels already exist. That is not a reason to message students by default.
- **No in-app video platform** copied from Tutor Pro. TutorOS already joins Meet or Teams and writes the timeline.
- **Do not replace OTP** with TutorComp’s username and password.

### Intuition check (fact versus judgment)

| Coaching worry | Covered in public sources? |
|---|---|
| Trial class to paid conversion | **Fact** for TutorComp (demo, plan, match, package) and for Coaching MS leads. Weak or absent on the other GitHub READMEs. |
| Teacher utilization and no-show | **Fact** for CogNote’s statuses, AllTrue’s day board, TutorComp’s late lock and forfeit. A fill-rate dashboard is **judgment**; it was not on TutorComp’s marketing pages. |
| Parent trust: attendance, what was taught, fees | **Fact** for CogNote, Tutora, AllTrue, and (partially) TutorComp recordings plus every-three-session updates. TutorComp does not publicly show a parent fee ledger. |
| Reschedule without chaos | **Fact** for TutorComp terms, CogNote makeup policy, AllTrue substitutes. |
| Homework follow-through | **Thin.** Testimonials and TutorOS assignments. A parent done/not-done view is **judgment**. |
| Teacher payout | **Fact** for Sentra. TutorComp marketing is silent; a contested public complaint exists. |
| Multi-branch visibility | **Fact** for AllTrue only. |
| A calendar people can drag | **Not found** on TutorComp or these READMEs. Week views and slot picks are **fact**. Drag is **judgment**. |

## 7. Suggested sequencing for a later human decision

Jobs, not routes and not new screen ids. Stop after these; do not start building from this note.

1. Let a parent see fees, hours left, attendance, and what was taught without opening chat.
2. Let the office sell a pack of hours and have a no-show or a late cancel consume or preserve that hour by a written rule.
3. Let a coordinator move a class inside the notice window, bank a makeup or forfeit the hour, and hand the hour to another teacher when the first cannot teach.
4. Let a demo enquiry become a matched tutor and a paid pack without a side spreadsheet.
5. Let a family book the next open slot on the tutor’s published week without waiting on the office.
6. Let the teacher mark who attended, who cancelled in time, and who did not come, and let the owner see wasted hours and overloaded teachers.
7. Let teacher pay follow those verified sessions, with a statement the teacher can check.
8. Let a parent see whether the work from last class was finished.

## What this pass could not verify

- Trustpilot HTML returned 403. Themes use search-indexed snippets only (about 53 reviews, displayed rating 4.5). https://www.trustpilot.com/review/www.tutorcomp.com
- The scheduling case study URL returned 404 on direct fetch. It is not used as proof of the live product. https://shabanmohammed.com/tutorcomp-NEW
- Chrome Web Store item returned “not available” on direct fetch.
- No TutorComp listing found on Google Play or the Apple App Store. No G2 page. No Reddit thread.
- https://www.tutorcomp.com/faq and https://www.tutorcomp.com/pricing did not return a real FAQ or a full rate card (subject menus and testimonials).
- Google review text was not opened; only an aggregator snippet. https://exa.ai/library/place/x2l21rhpnk1
- No login. The student portal, hour wallet, and coordinator tools behind the account were not seen.
- Tutor Pro’s “in production” claim and AllTrue’s campus claim are README statements.
- `catalog/screens.json` still labels many rows `shell` while 004 is Accepted as wired UI. This note follows the product status in AGENTS.md: wired screens can still be thin, and 008 billing remains Draft.
