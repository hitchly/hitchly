# Usability Testing Report — Team workload

Split of **remaining work** after the document scaffold. Everyone should read **Section 3 (Introduction)** and **Section 8 (Metrics)** once so sessions are run consistently.

---

## Swesan (Trip module, recurring trips)

**Done in repo (baseline):** UT-2, UT-3, and optional **UT-2R** in [`sections/06_task_scenarios.tex`](sections/06_task_scenarios.tex) use current in-app labels (\textbf{FIND A RIDE}, \textbf{SEARCH FOR RIDES}, \textbf{Post a Ride}, \textbf{PUBLISH RIDE}, etc.). [`05_methodology.tex`](sections/05_methodology.tex) includes a **Trip and recurring flows (configuration)** checklist. [`09_results.tex`](sections/09_results.tex) has **Trip-related tasks** bullets; [`10_discussion_and_recommendations.tex`](sections/10_discussion_and_recommendations.tex) has a **Trip recommendations** table shell.

**Status (latest):** Section 5 documents **two Android phones**, **Render** API, **Neon** database, **account deletion** reset, **UT-2R out of scope**, and **$N=10$ simulated** walkthroughs. Sections 9--10 contain **illustrative** metrics and quotes (not external human-subject data). If the course requires real participants later, replace simulated blocks with authentic logs and adjust the methodology disclaimer.

---

## Sarim (Admin dashboard, survey work)

**Owns**

- **[`sections/07_questions_and_surveys.tex`](sections/07_questions_and_surveys.tex)** — Final **moderator script**: pre-session (Q1–Q4), post-task (PT1–PT4), post-session (PS1–PS4). Align wording with any **survey** you already drafted for the course.
- **[`sections/11_appendix.tex`](sections/11_appendix.tex)** — Expand **Consent** from outline to **final script**; keep **SUS** as-is unless the course requires changes; finalize **Likert** items and add a **short background questionnaire** if used (referenced from methodology).
- **[`sections/08_metrics_and_quantification.tex`](sections/08_metrics_and_quantification.tex)** — Confirm how **post-task ease (1–7)** and optional Likert blocks are **aggregated** (mean per item, any composite).
- **[`sections/09_results.tex`](sections/09_results.tex)** — **Participant summary** ($N$, role mix, build version string), **SUS** mean $\pm$ SD, **post-task / survey** aggregates.
- **[`sections/01_revision_history.tex`](sections/01_revision_history.tex)** — Row when survey appendix and questions are frozen.

**Also**

- Print or digital **pack** for moderators: consent + SUS + Likert + session log fields.

---

## Hamza (Matchmaking)

**Owns**

- **[`sections/06_task_scenarios.tex`](sections/06_task_scenarios.tex)** — **UT-4 (matching / trip follow-up):** exact steps for **browsing matches, accept/decline, confirmed state** as implemented; seed data or moderator setup so a match exists when needed.
- **[`sections/04_goals_of_testing.tex`](sections/04_goals_of_testing.tex)** — Tighten **goal 4 (matching and trip state)** if UT-4 scope changes.
- **[`sections/08_metrics_and_quantification.tex`](sections/08_metrics_and_quantification.tex)** — Any **extra metrics** for match discovery (e.g. mis-clicks, back-navigation count) if you want them quantified.
- **[`sections/09_results.tex`](sections/09_results.tex)** — **UT-4** quantitative + qualitative blocks.
- **[`sections/10_discussion_and_recommendations.tex`](sections/10_discussion_and_recommendations.tex)** — Recommendations for **matching UI / scoring comprehension**.

**Also**

- Document **test data** setup (accounts, pre-created trips/matches) for moderators in [`05_methodology.tex`](sections/05_methodology.tex) or a shared doc Sarim uses for the script.

---

## Burhan (Safety module, reporting)

**Owns**

- **[`sections/06_task_scenarios.tex`](sections/06_task_scenarios.tex)** — Add **UT-6 (optional):** locate **safety / complaint reporting** flow and complete or attempt report (define success if submission is out of scope for testers). Alternatively extend **UT-5** if reporting lives under profile/settings.
- **[`sections/07_questions_and_surveys.tex`](sections/07_questions_and_surveys.tex)** — **PS4** and debrief probes on **safety, trust, and reporting** clarity; align with appendix Likert trust items.
- **[`sections/05_methodology.tex`](sections/05_methodology.tex)** — **Ethics:** note if reporting flows touch **sensitive content**; remind moderators **not** to have participants file real reports against real users—use **test accounts** only.
- **[`sections/09_results.tex`](sections/09_results.tex)** — **UT-6** (or safety slice of UT-5) results and **trust / safety** themes from open responses.
- **[`sections/10_discussion_and_recommendations.tex`](sections/10_discussion_and_recommendations.tex)** — **Safety and reporting** rows in the recommendations table.

---

## Everyone (shared)

- Agree **sample size $N$**, **session order** (fixed vs counterbalanced), and **moderator rotation**; record in **05** and **09**.
- After sessions: each person drafts their **09 / 10** slices; **one person** merges voice for **10 (Interpretation + Traceability)** so the report reads as one narrative.
- Update **[`01_revision_history.tex`](sections/01_revision_history.tex)** after major merges and final submission.

---

## Appendix format (repo convention)

The usability appendix now matches the VnV report style: **`\section*{Appendix --- …}`** with **`\newpage`** and **`\phantomsection\label{sec:appendix}`** so cross-references still resolve. There is no numbered “Appendix A” in the PDF title; the TOC lists numbered sections only (appendix is unlisted, same idea as VnV reflection appendix).

Build: `cd docs/UsabilityTesting && make`
