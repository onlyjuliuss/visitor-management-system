# Draft: Chapter 4 — Results and Findings  
# Draft: Chapter 5 — Conclusion  

*Project: **acity-PASS** — digital visitor sign-in / sign-out for hostel administration.*  
*Stack (as implemented in this repository): React 18 + Vite + React Router (frontend); Go REST API + PostgreSQL (backend); optional Vercel SPA rewrites for production hosting.*  

Use this file as a starting point: replace bracketed notes, add your institution’s numbering, figures, and references to match Chapters 1–3.

---

## Chapter 4 — Results and Findings

### 4.1 Overview of implementation outcomes

The acity-PASS system was implemented as a full-stack web application. The public-facing layer provides a landing entry point, a visitor sign-in flow, and a post–sign-in confirmation route. Administrative functions are grouped behind authentication: a dedicated login route, a dashboard with summary information, dedicated pages for visitor lists and reports, settings, and a staff-facing sign-out desk. Visitor state is shared across the client through a central context provider that synchronises with the backend on load and after mutating operations.

On the server side, a Go application exposes REST endpoints for visitor registration, listing and retrieval, sign-out, aggregate statistics, filtering by status, and reminder-related operations. Static resources for visitor photos and QR artefacts are served under predictable URL prefixes. A background notification component periodically evaluates whether same-day visitors remain signed in and, at a configured evening hour, attempts outbound reminders via the integrated messaging path.

Taken together, these outcomes show that the design described in the methodology chapter was realised as a working prototype suitable for end-to-end demonstration: data persists in a relational database, the SPA consumes the API using a configurable base URL, and administrative routes are protected on the client; sensitive API operations are intended to align with token-based administrative authentication on the server.

**[Add:** one paragraph on *where* you ran the system during development and testing—local Vite + local API, or deployed frontend URL + API URL. **]**

### 4.2 Functional results — visitor experience

**Sign-in.** Visitors can complete a structured registration path capturing identity and visit metadata consistent with the domain model (for example name, contact details, purpose of visit, host, and optional photo reference). Successful registration results in persisted records and navigation to a confirmation view keyed by visitor identifier.

**Sign-out.** Sign-out is positioned as a controlled desk operation: the sign-out interface is reachable from the authenticated administrative area rather than as an anonymous public endpoint, which matches a hostel scenario where staff verify departure. The client supports sign-out requests that identify the visitor by numeric identifier or by QR code string, in line with the backend contract.

**Findings.** During iterative development and debugging in this environment, the visitor flows demonstrated stable round-trips between form submission, API handling, and UI updates when the API base URL and database were correctly configured. **[Add:** specific issues you fixed—e.g. CORS, field naming, image upload path, auth token storage—and how you verified the fix. **]**

### 4.3 Functional results — administration

**Authentication.** Administrative users authenticate through a dedicated login flow; the application uses JSON Web Token (JWT) validation on protected API paths and client-side route guards so that dashboard, visitors, reports, settings, and the sign-out desk are not exposed without a valid session.

**Dashboard and monitoring.** The administrative dashboard is fed by the same visitor dataset as the rest of the app, enabling counts and lists of current and recent activity. **[Add:** whether you wired stats explicitly to `/api/visitors/stats` and what numbers you observed in a sample session. **]**  

**Reporting and visitor management.** Separate routes exist for full visitor listing and reporting views, supporting operational review without mixing those concerns into the public landing page.

**Findings.** The separation of public visitor actions from authenticated staff actions was straightforward to test: unauthenticated navigation to protected URLs is redirected appropriately, and with a valid token the full admin surface becomes available. **[Add:** screenshot references as Figure 4.x.**]**

### 4.4 Technical results — integration and architecture

**API integration.** The frontend centralises HTTP access through a small helper that builds absolute URLs from an environment-configured API base (`VITE_API_BASE_URL`), which avoids hard-coding deployment-specific hosts and supports switching between local and hosted backends during testing.

**Data contract.** Field names returned by the Go API use conventional JSON snake_case; the client maps these to camelCase for components. This pattern reduced friction during debugging because network traces could be compared directly to database column semantics.

**Persistence and domain model.** Visitors are stored with sign-in timestamps, optional sign-out timestamps, status flags distinguishing signed-in from signed-out visitors, and identifiers for QR-related artefacts where applicable. This structure supports statistics, status filters, and reminder selection logic without ad hoc client-only state.

**Notifications.** The server runs a scheduler that wakes on a fixed interval and, when the wall-clock hour matches the configured reminder window (implemented as an 8 PM check in the current codebase), queries for visitors who signed in on the current calendar day and remain in the “signed in” state, then dispatches SMS-style reminders. **[Add:** whether you verified reminders only via logs, test endpoints, or live SMS; state any provider constraints or test mode.**]**

**Deployment.** The repository includes a single-page application rewrite rule so that client-side routes resolve correctly when the static build is served from a host such as Vercel.

**Findings.** The architecture behaved as expected for a coursework- or project-scale system: clear boundaries between UI, HTTP, and database layers made it possible to localise defects during development. The main integration risks observed in practice were **[Add:** e.g. misconfigured `VITE_API_BASE_URL`, database connection strings, or token expiry—whatever you actually hit.**]**

### 4.5 Testing and debugging experience

Most verification was carried out through **[manual exploratory testing / list any automated tests if you added them]** while running the development server and API locally **[or deployed]**. Typical test passes included: create visitor → confirm persistence via list or database → sign out → confirm status flip and timestamps → log out and confirm protected routes are inaccessible.

**[Add:** a short table of test cases vs pass/fail if your programme expects it.**]**  

**Limitations of the evaluation.** This chapter reports implementation and informal verification results, not a formal usability study or load test. Concurrency under many simultaneous desk operators, long-term SMS cost, and production security hardening were outside the scope of the debugging sessions described here.

### 4.6 Summary of findings

1. The acity-PASS prototype successfully demonstrates end-to-end visitor lifecycle management with a modern SPA and a Go/PostgreSQL backend.  
2. Administrative JWT protection and client-side protected routes align the software with a realistic operational model.  
3. Extensibility for reminders, photos, and QR-based identification is reflected in the API and persistence design, though the depth of real-world validation varies by feature.  
4. Remaining gaps are primarily about production readiness **[Add:** your list: e.g. rate limiting, audit logging, backup strategy, formal test suite.**]** rather than basic feasibility.

---

## Chapter 5 — Conclusion

### 5.1 Restatement of the problem

Hostel-style residences must know who is on site, why they are there, and when they leave. Paper registers and informal messaging are error-prone and difficult to query. This project addressed that gap by specifying and building **acity-PASS**, a digital sign-in and sign-out portal with an administrative control surface backed by durable storage.

### 5.2 Summary of what was achieved

The delivered work product is a **working web application** comprising:

- a **visitor-facing** path from landing through registration to confirmation;  
- a **staff-facing** authenticated area for monitoring visitors, accessing reports and settings, and performing sign-out;  
- a **REST backend** with relational persistence, statistics and status-oriented queries, file endpoints for photos and QR resources, and scheduled reminder logic;  
- **configuration-driven** deployment considerations for the SPA.

These elements satisfy the core technical objective of replacing ad hoc record-keeping with a **central, queryable** visitor log while preserving a clear separation between public self-service sign-in and staff-mediated sign-out.

### 5.3 Relation to objectives and contribution

Relative to the aims set out in Chapter 1 **[or insert objective list]**, the project **met** the objective of implementing a demonstrable full-stack system with realistic data flow. Objectives involving **[Add:** e.g. “full production rollout,” “integration with campus SSO,” or “large-scale user trials” — mark as partially met or deferred**]** were scoped appropriately for a development-and-debugging cycle centred on this codebase.

The principal **contribution** is practical: a reference implementation and integration pattern (React + Go + PostgreSQL + JWT + optional cloud static hosting) that other student or small-team projects could adapt. The secondary contribution is operational clarity—showing how reminder logic and QR-related identifiers can live alongside core visitor tables without overcomplicating the first release.

### 5.4 Limitations

The conclusions above must be qualified. The evaluation was **developer-led**, not a field trial with actual wardens over a full semester. Automated test coverage may be limited compared to industry practice. SMS reminders depend on external providers and correct clock and timezone configuration on the server. Security measures appropriate for a public internet deployment (hardened headers, rate limits, secret rotation, comprehensive logging) would need further work before institutional sign-off.

### 5.5 Future work

Reasonable next steps, in order of impact, include:

1. **Hardening** — stricter CORS policy than wildcard where possible, HTTPS-only cookies or token storage review, input validation audit, and structured application logging.  
2. **Quality assurance** — automated API and UI tests, seed data scripts, and staging environment parity with production.  
3. **User-centred design** — short usability sessions with hostel staff to refine dashboard density, sign-out desk workflow, and mobile layout.  
4. **Feature depth** — native device camera integration for live capture, richer QR workflows, and export formats aligned with institutional reporting.  
5. **Identity integration** — optional linkage to campus directory or single sign-on if the product moves beyond a standalone prototype.

### 5.6 Closing remarks

acity-PASS shows that a **small, focused** full-stack application can already deliver the main benefit of digital visitor management: **consistent records, staff visibility, and a path toward automated reminders**, within the constraints of a student or early-stage project timeline. The work establishes a credible foundation; realising it as a maintained production service would be chiefly a matter of **process, security, and user validation** rather than rethinking the fundamental architecture.

---

## Suggested figures for Chapter 4 (add your own screenshots)

Each row is **one screenshot** you take in the running app, then paste into the report as Figure 4.x with the caption below (edit captions to match what is actually on screen).

| Figure | Where to capture it (route / page) | Plain meaning | Caption for your report (starter text) |
|--------|-------------------------------------|---------------|----------------------------------------|
| 4.1 | `/` — landing / home | First screen: branding and how visitors start (e.g. Sign In). | Figure 4.1: acity-PASS landing page — public entry to the digital sign-in portal. |
| 4.2 | `/sign-in` — visitor registration | The full sign-in form (fields visible; optional second shot if you show validation errors). | Figure 4.2: Visitor sign-in registration form. |
| 4.3 | `/sign-in/success/…` — after a successful sign-in | The “success” screen right after the server accepts the visitor (not the form page). | Figure 4.3: Confirmation screen after successful visitor sign-in. |
| 4.4 | `/admin` — after logging in at `/admin/login` | Staff dashboard: summary / navigation (proves admin area is separate from the public site). | Figure 4.4: Administrative dashboard (authenticated staff view). |
| 4.5 | `/admin/sign-out-desk` — staff sign-out | Desk tool: how staff find a visitor and complete sign-out (search, list, or QR — whatever your UI shows). | Figure 4.5: Staff sign-out desk — visitor lookup and sign-out. |

**If you skip a figure:** use only the ones you have; renumber (4.1, 4.2, …) so they stay consecutive in the final document.

---

## Notes for Claude (when you expand this draft)

- Paste your **Chapter 1 objectives** and **Chapter 3 methodology** and ask Claude to align every subsection of Chapter 4 to a specific objective or method step.  
- Replace all **[Add: …]** blocks with your real testing notes, URLs (if allowed), bug fixes, and figure file names.  
- If your school forbids first person, ask Claude to convert “we/I” phrasing to passive or “the implementation” voice throughout.
