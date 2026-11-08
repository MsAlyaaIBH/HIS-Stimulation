# HIS Simulator — Lecturer Guide

This guide is in the public repository. **Keep the answer key separate.**

## Learning outcomes covered

| Lecture outcome | Where students apply it |
|---|---|
| 01 Define an HIS, its components and the three Malaysian tiers | Cases 1, 8; tier switch; every module; test Q1–4 |
| 02 Describe drug dispensing and its safeguards | Cases 2, 4, 5, 10, 12; test Q5–6 |
| 03 Explain computerisation of pharmacy services, PhIS and inventory | Cases 2–6, 10, 11; test Q7–8 |
| 04 Outline prescriptions and e-prescribing, advantages and challenges | CPOE in CIS; Cases 7, 9, 10; test Q9–10 |

## Running a 2-hour lab before the lecture

Students have not had the lecture yet, so the lab works as **experience first, theory later**. A short briefing gives them just enough vocabulary to start; the debrief and later lecture make the concepts explicit. A briefing deck accompanies this simulator.

| Time | Activity |
|---|---|
| 0–10 min | **Hook.** Show a handwritten prescription: “The patient is allergic to penicillin. Who would notice, and how?” Pairs discuss for 2 minutes. |
| 10–25 min | **Mini-briefing** (HIS, modules, tiers, Konsep 5B, your role today). Students open the link, register and take the **pre-test**. |
| 25–40 min | **Live demo of Case 1** on the projector while students follow on their own screens. Show role switching, the Cases panel and the Glossary. |
| 40–95 min | **Pairs work** on their track's cases: one drives, one reads the steps and checks. Core target: Cases 2–6 (pharmacist) or 5, 6, 10, 11 (pharmacy assistant). |
| 95–110 min | **Debrief** (see questions below). |
| 110–120 min | **Post-test** and **Download report**. |

Remaining cases (7–9, 12) work well as homework or for fast pairs.

### Debrief questions

1. What did the system catch that a paper process might miss? (allergy, renal, dose, expired stock)
2. Which alerts needed action, and which only needed counselling?
3. What could the system **not** check for you?
4. What changed when you switched from THIS to BHIS?
5. Pharmacy assistants: when did you refer, and why not decide yourself?

### Facilitation tips

- Walk the room during the first 10 minutes of pair work: most problems are “I can't find the module” (wrong role) or “nothing happened” (they skipped the Verify step).
- If many pairs stall on the same step, pause the class and demo it.
- Ask fast pairs to switch tier to BHIS and redo Case 3 to see the difference.

## Tracks

| Track | Assigned cases |
|---|---|
| Pharmacy assistant (Diploma) | 1, 5, 6, 7, 8, 9, 10, 11, 12 |
| Pharmacist (Degree) | 1–9 |
| All cases | 1–12 |

The pharmacy assistant track focuses on transcription, referral, ward supply, inventory, labelling and dispensing. Assistants can open the pharmacist cases as optional; they cannot verify or intervene, which reinforces the boundary of their role.

## Assessment

- **Pre/post test:** the report shows both scores and which questions improved. Useful as class-level evidence of learning gain, or for a teaching-and-learning study (get ethics approval first if you plan to publish).
- **Reflections (graded):** suggested rubric: links to the lecture (2), correct reasoning (2), clear writing (1).
- **Activity log:** shows every transcription, referral, intervention, override and access-denied attempt. Overrides of major alerts mean a student verified an unsafe order.

## Customising

All scenario data is in `js/data.js`:

- `DRUGS`, `INTERACTIONS`, `LAB_TESTS`
- `seed()`: patients, notes, orders, labs, inventory, audit entries, paper prescriptions, ward requests
- `CASES`: titles, track, steps, hints, reflections and quizzes
- `TEST`: the 10 pre/post questions
- `GLOSSARY`: terms and definitions

Case tick rules are in `CHECKS` in `js/app.js`. After editing seed data, increase `VERSION` in `data.js`.

## Ideas for extending

- Online pharmacy case: classify fictional online listings as licensed or illegal.
- Clinical pharmacokinetics (TDM) case with a gentamicin level.
- MTAC follow-up for Encik Tan's warfarin.
- Outpatient queue and counter workflow, or medicines-by-post services.
