# Hospital Information System (HIS) Simulator

A browser-based teaching simulation for **PHD 111 · ICT for Pharmacy** (Faculty of Pharmacy, UiTM).
Students work in **Hospital Bertam**, a fictional teaching hospital. They log in as different staff and apply the lecture *Pharmacy and the Development of IT* in hands-on cases, with a pharmacist track and a pharmacy assistant track.

![Screenshot of the pharmacy screening screen](docs/screenshot.png)

> **Fictional and simplified.** All patients, staff, products and the hospital are invented. Clinical rules, doses and poison groups are simplified for teaching. Do not use them for real patient care. Scopes of practice vary by setting; follow your institution's policies.

---

## For students

1. Open the simulator link your lecturer gave you.
2. Enter your name, matric number, group and **track** (your lecturer will tell you which).
3. Do the **pre-test** (10 questions, about 5 minutes). Guessing is fine.
4. Click **Cases** and work through the cases for your track. Ticks appear automatically.
5. Stuck on a term? Click **Glossary**.
6. Write a short reflection for each case.
7. Take the **post-test**, then click **Download report** and submit the `.html` file.

Progress is saved **in your browser only**. Use the same device and browser, and avoid private/incognito windows.

See [docs/STUDENT_GUIDE.md](docs/STUDENT_GUIDE.md).

## What students practise

| Module | What it simulates |
|---|---|
| **PMS** Patient Management | Registration, MRN, admission |
| **CIS** Clinical & e-Prescribing | Notes, lab/imaging orders, CPOE with prescriber alerts |
| **LIS** Laboratory | Analyser results, validation, release |
| **PhIS** Pharmacy | Prescription entry from paper; allergy, interaction, dose, renal and stock screening; referral and interventions; Konsep 5B dispensing; ward requests (indents); inventory and re-ordering; drug information (DICE) |
| **NIS** Nursing & MAR | Medication administration record |
| **RIS/PACS** Radiology | Images and reports (THIS only) |
| **FIS** Finance | Automatic billing (THIS only) |
| **EMR** | One Individual, One Record timeline with role-based access |
| **Audit trail** | Who accessed what; spot suspicious access |
| **Downtime procedures** | Paper forms and back-entry |

The **BHIS / IHIS / THIS** switch changes which modules exist and whether records are hybrid or paperless.

## Cases and tracks

| # | Case | Track |
|---|---|---|
| 1 | Register and admit a new patient | Core |
| 2 | Allergy alert on an antibiotic order | Pharmacist |
| 3 | Lab results reach the pharmacy | Pharmacist |
| 4 | Dose check for an older patient | Pharmacist |
| 5 | Dispense with Konsep 5B, then give the dose | Core |
| 6 | Pharmacy inventory control | Core |
| 7 | Downtime drill | Core |
| 8 | Compare the three HIS tiers (quiz) | Core |
| 9 | Privacy and the audit trail | Core |
| 10 | Transcribe a paper prescription and refer | Pharmacy assistant |
| 11 | Supply a ward stock request (indent) | Pharmacy assistant |
| 12 | Label and counselling check (quiz) | Pharmacy assistant |

- **Pharmacist track:** Core + Pharmacist cases (1–9).
- **Pharmacy assistant track:** Core + Pharmacy assistant cases (1, 5–12).
- **All cases:** everything. Students can also open optional cases outside their track.

## Pre-test and post-test

The same 10 questions are asked before and after. Students see no answers on the pre-test. After the post-test they see both scores and an explanation for every question. Both scores and per-question results are included in the downloaded report.

---

## For lecturers: publish with GitHub Pages

1. Create a new **public** repository on GitHub, e.g. `his-simulator`.
2. Upload every file in this folder, keeping the folders (`css/`, `js/`, `docs/`). Use **Add file → Upload files** and drag the whole folder in.
3. Go to **Settings → Pages**. Under *Build and deployment*, choose **Deploy from a branch**, branch **main**, folder **/ (root)**, then **Save**.
4. After about a minute, the link appears at the top of the Pages settings, e.g. `https://<your-username>.github.io/his-simulator/`.
5. Share that link with students.

No server, database or login is needed.

### Customising

- **Patients, drugs, interactions, cases, test questions, glossary:** edit `js/data.js`.
- **After changing seed data,** increase `VERSION` in `js/data.js` so browsers load the new data.
- **Case tick rules:** `CHECKS` in `js/app.js`.
- **Lecturer notes and lab plan:** [docs/LECTURER_GUIDE.md](docs/LECTURER_GUIDE.md).

The answer key is **not** in this repository, because a public repo is visible to students.

### Limitations

- Progress lives in the student's browser (localStorage). Clearing site data or switching devices starts over.
- Ticks and test answers are checked in the browser, so a determined student could read the source. Grade the reflections, the activity log and the discussion, not only the ticks.
- Google Fonts load from the internet; offline, the page uses system fonts.

## Files

```
index.html          the app
css/style.css       styles (light and dark mode)
js/data.js          patients, drugs, cases, test, glossary  ← edit this
js/app.js           application logic
docs/               student guide, lecturer guide, screenshot
```
