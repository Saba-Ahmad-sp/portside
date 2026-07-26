# Task B — Inherit and Improve

**Digital Heroes Qualification Task Kit · Role 04, Full Stack Development**
Saba Ahmad · July 2026

---

> **The brief.** You are handed a working but poorly built codebase with no tests, business logic inside route handlers, direct database calls from the frontend, and secrets in the repo. It serves real customers and cannot go down.

Two things shape everything below.

**"Cannot go down" is the binding constraint, not "poorly built."** Plenty of ugly code makes money. The job is not to make this codebase pretty; it is to stop it hurting anyone while it keeps earning. Every step here has to be shippable on a Tuesday afternoon without a maintenance window.

**"No tests" is why this is hard.** Without tests, every improvement is also a risk. So the first real engineering move is not fixing the bad code — it is building the ability to change code safely. Until that exists, the correct amount of refactoring is zero.

---

## a) Assessment

### Ordered by blast radius, not by how much the code annoys me

The question is not "what is worst?" but **"what is the worst thing that happens if I leave this alone for another quarter?"** That ordering puts a boring config change above an architectural sin.

| # | Issue | Fix by | Risk of leaving it in place |
|---|---|---|---|
| **1** | **Secrets committed to the repo** | **Today** | Every person who has ever cloned this repo — including former staff and any contractor — holds live production credentials. There is no audit trail of who used them. This is not a bug that might bite; it is an unlocked door that is currently open. Worst case is total data loss or a customer data breach with regulatory consequences. |
| **2** | **Frontend queries the database directly** | Week 1 assessment, Month 1 fix | Database credentials are in the browser bundle. Anyone can open devtools, take the key, and issue arbitrary queries. Unless row-level rules exist and are correct, this is read/write access to every customer's data by anyone who visits the marketing page. Even where rules exist, the schema is now a public API — every column rename becomes a breaking change to clients you cannot deploy. |
| **3** | **No tests** | Week 1 (start), continuous | This is the multiplier on everything else. Every fix below carries an unbounded regression risk, so the team is correctly afraid to change anything, so the code decays further. The cost is not measured in bugs; it is measured in the features that never shipped because nobody dared touch that file. |
| **4** | **Authorisation is ad hoc or missing** | Week 1 audit, Month 1 fix | Related to #2 but distinct, and the one I would personally look at hardest. When permission checks are written inline in each handler, the failure mode is *fail-open*: a new endpoint that simply forgets the check is silently reachable by everyone. Nothing errors. Nothing logs. It looks like it works. I have seen this exact pattern in production — endpoints protected only by "is the user logged in", shipped that way for months without anyone noticing. |
| **5** | **Business logic inside route handlers** | Month 1 → Quarter 1 | Not urgent, but it is the tax on every other item. Logic tangled with HTTP cannot be unit tested, so #3 stays expensive to fix. The same rule appears in three handlers with two of them slightly wrong. Onboarding takes a month instead of a week. |
| **6** | **No error tracking or structured logging** | Week 1 | You do not know your error rate. Customers are your monitoring, which means you learn about breakage from an angry email hours later, and you cannot tell whether last night's deploy made things worse. It also makes every step below unverifiable — you cannot claim an improvement you cannot measure. |
| **7** | **Inconsistent error handling** | Month 1 | Stack traces leak internals to clients; some failures return `200` with an error body so clients cannot detect them; retries hit endpoints that are not idempotent. Individually minor, collectively the reason support tickets are hard to diagnose. |
| **8** | **No CI, no deployment gate** | Week 1 | Nothing stops a broken build reaching customers. Once tests exist, they are worthless unless something enforces them. |

### The judgement call I would defend

**Item 1 gets fixed before I have read the codebase.** Not "first sprint" — first hour, in parallel with everything else, because it is the only item where the damage may already be happening and every hour of delay adds exposure.

**And rotation is the fix. Scrubbing history is not.**

The instinct is to reach for `git filter-repo` or BFG and purge the secret from history. That is the wrong first move, and I would push back on anyone who proposed it:

- It **does not undo the compromise.** Anyone who cloned the repo still has the key on their disk. The credential is burned the moment it is pushed.
- It **rewrites every commit hash**, breaking every existing clone, every open pull request, and every deployment pinned to a SHA.
- It creates a **dangerous illusion of safety** — the secret is "gone", so nobody rotates.

The correct order:

1. **Rotate the credential.** The leaked one is dead within the hour. This is the actual fix.
2. **Move to environment variables** and confirm nothing reads the old value.
3. **Add secret scanning to CI** so the next one is caught before merge, plus GitHub push protection.
4. *Optionally, later,* scrub history — as scheduled cleanup with a communicated cost, not as a security measure.

Anyone can order a list. Knowing that step 4 is cosmetic is the part that matters.

---

## b) Migration plan

**No big-bang rewrite.** Not because rewrites are always wrong, but because this one would be: the requirements live in the current code and nowhere else, so a rewrite means rediscovering years of undocumented edge cases while the old system keeps accreting new ones. You end up maintaining two systems and shipping neither.

Three rules hold throughout:

- **Nothing lives on a branch longer than a week.** Long-lived refactor branches die of merge conflicts.
- **Every cutover has a rollback path** that does not require a deploy — a feature flag, not a revert.
- **Characterisation tests come before the code they cover changes.** Always.

### Week 1 — stop the bleeding, gain sight

*Goal: nothing gets worse, and we can see what is happening. Zero behaviour change.*

| Ship | Why now |
|---|---|
| Rotate every credential in the repo; move to environment variables | The open door, closed |
| Secret scanning + push protection in CI | Stops recurrence, which rotation alone does not |
| Error tracking (Sentry or equivalent) + structured logs with a request id | We cannot claim improvement we cannot measure |
| Uptime + error-rate alerting on the two most valuable user journeys | We hear about breakage before the customer does |
| Verify backups **by restoring one** to a scratch database | An untested backup is a hope, not a backup |
| CI running build + lint + typecheck on every push | The gate exists, even before there is much to gate |
| **Two** end-to-end smoke tests: sign in, and the single most valuable transaction | Not coverage — a canary. A red build now means something real |
| A written map of what the system does, from reading the code | Everything below depends on knowing where the seams are |

**Explicitly not this week:** no refactoring, no architecture changes. Week 1 is entirely about turning the lights on.

### Month 1 — build the seam, prove the pattern once

*Goal: one module moved end to end, so the pattern is real rather than a proposal.*

1. **Pick the highest-risk, medium-complexity module.** Not the hardest — the one where a bug is most expensive *and* the shape is representative. It becomes the reference implementation.

2. **Write characterisation tests first.** These do not assert what the code *should* do; they capture what it *does*, quirks included. If the current code returns `200` with an error body, the test asserts that. It is a safety net, not a specification — and it is what turns "I think this refactor is equivalent" into "the tests still pass."

3. **Introduce a service layer behind a feature flag.** New code path beside the old one, the flag chooses. Roll out to internal users, then 5%, then 50%, then all. **Rollback is flipping a flag, not shipping a revert.**

4. **Put an API in front of the frontend's direct database access** for that module only. The frontend switches to the new endpoint; the direct queries stay live but unused for a fortnight before removal. This is the strangler fig pattern: the new system grows around the old until the old can be cut away.

5. **Add a permission gate to every endpoint in that module**, and this is the important part — make it *declarative*, so a missing check is a visible absence rather than a silent one.

6. **Any schema change uses expand–contract:** add the new column → dual-write to both → backfill → read from the new one → stop writing the old → drop it. Five deploys, each independently reversible, no downtime, and at no point do old and new code disagree about the shape of the database.

**What "done" looks like at the end of Month 1:** one module has tests, a service layer, no direct database access from the browser, and enforced authorisation. And the team has seen it happen without an incident — which is what buys permission for the next one.

### Quarter 1 — repeat, and make it structural

*Goal: the pattern spreads, and regression becomes mechanically impossible.*

| Ship | Why |
|---|---|
| Migrate remaining modules, highest-risk first, one per one-to-two weeks | Same recipe. Boring is the goal |
| **A CI test that fails when a new endpoint has no permission decision** | ← the important one, below |
| Delete the last direct-from-frontend database queries; revoke those credentials | The item is not closed until the old path is *gone* |
| Consistent error envelope and status codes across every endpoint | Clients can finally detect failure reliably |
| Coverage floor on changed lines only — not a global percentage | Global targets get gamed with tests of getters |
| Runbooks for the top five incidents; on-call rotation with a real escalation path | Knowledge out of one person's head |
| Performance budget and alerting on the paths that make money | You cannot hold a line you have not drawn |
| A written architecture decision record for each major change | So the next person inherits reasoning, not just code |

**On that CI test.** This is the single highest-leverage thing in the whole plan, and it comes from having watched the alternative fail. In a previous production codebase, the API framework's default was fail-open: an endpoint declaring only "user must be logged in" allowed *any* authenticated user to perform *every* action on it. Several features shipped that way and were silently unprotected for months. Nothing errored. Nothing logged. Code review missed it every time, because the bug was an *absence*, and absences do not appear in a diff.

The fix was not more vigilance. It was a test that enumerates every write endpoint and fails the build if one has not made an explicit permission decision, plus a file listing the pre-existing exceptions. That file may shrink; a CI rule forbids it growing. The backlog became visible, finite and ratcheting, and the class of bug became structurally impossible rather than merely discouraged.

That is the whole philosophy in one artefact: **do not ask people to remember. Make forgetting fail the build.**

---

## c) One refactor, concretely

A realistic handler in the style described — validation, business rules, database access, email and logging all in one place, with no permission check.

### Before

```ts
// app/api/leads/[id]/assign/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";

const db = createClient(
  process.env.SUPABASE_URL!,
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.SERVICE_ROLE_KEY_HERE", // (1)
);

export async function POST(req: Request, { params }: any) {          // (2)
  const body = await req.json();
  const { id } = params;

  if (!body.assigneeId) {                                             // (3)
    return NextResponse.json({ error: "no assignee" });               // (4)
  }

  const { data: lead } = await db.from("leads").select("*").eq("id", id).single();
  const { data: user } = await db
    .from("profiles").select("*").eq("id", body.assigneeId).single();

  await db.from("leads")                                              // (5)
    .update({ assigned_to: body.assigneeId, status: "contacted" })
    .eq("id", id);

  await db.from("lead_activities").insert({                           // (6)
    lead_id: id,
    type: "assigned",
    to_value: body.assigneeId,
  });

  const transport = nodemailer.createTransport({                      // (7)
    host: "smtp.example.com",
    auth: { user: "notifications@acme.com", pass: "hunter2" },
  });
  await transport.sendMail({
    to: user.email,
    subject: "New lead assigned",
    text: `${lead.company} has been assigned to you.`,
  });

  console.log("assigned lead", id, "to", body.assigneeId);            // (8)

  return NextResponse.json({ ok: true, lead });                       // (9)
}
```

**What is wrong, numbered:**

1. **Service-role key hardcoded.** Bypasses every database-level protection, and it is in git.
2. **No authorisation whatsoever.** Any logged-in user — any *unauthenticated* caller — can reassign any lead. This is the fail-open case, and it is invisible: nothing here looks broken.
3. **Hand-rolled validation.** Checks one field, ignores whether `assigneeId` is a real user, whether they are active, whether the lead exists.
4. **Wrong status code.** `200` with an error body. Clients cannot detect failure without parsing prose.
5. **Silent side effect.** Assigning also changes status. Nobody reading the endpoint name would guess that.
6. **Unchecked write.** If the activity insert fails, the assignment silently has no audit record.
7. **SMTP credentials inline**, and a blocking network call in the request path. If the mail server is slow, the user's request hangs.
8. **`console.log` as observability.** No request id, no correlation, unsearchable.
9. **Returns the raw database row**, including every column added later — internal notes, scoring, whatever. A new column is a new data leak.

Also: this cannot be unit tested. Testing the permission rule means standing up HTTP, a database and an SMTP server.

### After

```ts
// app/api/leads/[id]/assignment/route.ts
import type { NextRequest } from "next/server";
import { ok, withRoute } from "@/lib/api/responses";
import { readJson, routeId } from "@/lib/api/route-helpers";
import { assignmentSchema } from "@/lib/schemas/lead";
import { requireSession } from "@/lib/server/dal";
import { assignLead } from "@/lib/server/lead-service";

export const PATCH = withRoute(async (request: NextRequest, ctx: Context) => {
  const session = await requireSession();
  const id = await routeId(ctx.params);
  const input = await readJson(request, assignmentSchema);

  return ok(await assignLead(session, id, input));
});
```

```ts
// lib/server/lead-service.ts
export async function assignLead(session: Session, id: string, input: AssignmentInput) {
  const current = await assertCanReach(session, id, "lead:view");

  // The lead is visible, so 403 is the honest answer — not 404.
  if (!can(session.user, "lead:assign", { assignedTo: current.assignedTo })) {
    throw ApiError.forbidden("Only admins can assign leads.");
  }

  if (input.assigneeId && !(await repo.memberExists(session.db, input.assigneeId))) {
    throw ApiError.validation({ assigneeId: ["No active user with that id."] });
  }

  if (current.assignedTo === input.assigneeId) {
    return getLead(session, id); // No-op; do not write a misleading activity row.
  }

  const updated = await repo.updateLead(session.db, id, { assigned_to: input.assigneeId });
  if (!updated) throw ApiError.notFound("Lead not found.");

  await recordActivity({
    leadId: id,
    actorId: session.user.id,
    type: input.assigneeId ? "assigned" : "unassigned",
    fromValue: current.assignedTo,
    toValue: input.assigneeId,
  });

  return updated;
}
```

### What actually improved

**The permission rule became testable in isolation.** `can()` is a pure function. Every combination of role, action and ownership is asserted in milliseconds with no database, no HTTP, no mail server. Before, testing the rule meant standing up the world — which is precisely why nobody did.

**A missing permission check is now visible.** Every service function begins by resolving the session and asking `can()`. An endpoint that skips it is conspicuous in review, and the CI ratchet from the plan above makes it fail the build. Before, the check's absence looked exactly like code that did not need one.

**403 and 404 became meaningful.** `assertCanReach` raises `404` for a lead you may not know exists; the explicit `can()` check raises `403` for one you can see but may not act on. The old code leaked existence to anyone who asked — and would have leaked it just as freely if it *had* checked, by returning `403`.

**The surprise side effect is gone.** Assignment assigns. If the product wants status to advance too, that is a separate, named, tested decision.

**Email left the request path.** It belongs in a queued job with retries. A notification failing must not fail a salesperson's assignment, and a slow mail server must not hold a user's request open.

**The response is a DTO, not a row.** Adding a column to `leads` no longer risks publishing it.

**The handler shrank to five lines.** Not for elegance — because there is now only one place a rule can live, so there is only one place to look, and only one place to get it wrong.

**One rule, one place.** The same `can()` the UI uses to hide the button is the one the server uses to refuse the request. They cannot drift, because they are the same function.

---

## d) Engineering standards, and getting them adopted

### The standards

Deliberately short. A twenty-page document nobody reads is worse than five rules everyone follows.

**1. No secrets in code.** Environment variables only, secret scanning in CI, push protection on. Rotation is the response to a leak; history rewriting is optional cleanup.

**2. Every write endpoint makes an explicit permission decision.** Declarative, in a reviewable place. "Intentionally public" is an acceptable answer — *silence is not*.

**3. Route handlers do HTTP. Services do rules. Repositories do queries.** Business logic in a handler fails review. This is what makes rules testable.

**4. Validate all input at the boundary with a schema.** One schema, shared between client and server. The client's copy is a convenience; the server never trusts it.

**5. Tests on changed lines.** Not a global coverage percentage — those get gamed with tests of getters. Bug fixes ship with a test that fails without the fix.

**6. Consistent errors.** One envelope, honest status codes, no stack traces to clients.

**7. Small, reversible deploys.** Behind flags where behaviour changes. Nothing on a branch longer than a week.

**8. CI is the gate.** Typecheck, lint, tests, build. Red does not merge.

### Getting a resistant team to adopt them

Resistance is usually rational, and it is worth saying so out loud. A team that has been shipping this way is telling you something: the standards you propose have a cost, and they have been paying a different cost successfully. Treating that as ignorance is how you lose the room in week one.

Three things they are actually saying:

- *"This will slow us down"* — often true in month one, and pretending otherwise destroys your credibility when it happens
- *"You will leave and we will maintain this"* — sometimes true, and a fair thing to fear
- *"The last person who tried this made a mess"* — very often true

So:

**Fix the first ten yourself.** Do not announce a standard and hand out work. Migrate the first module, write the first characterisation tests, add the first permission gates, and let people see it in a pull request before it is a rule. Standards proposed by someone who has not touched the code are correctly ignored.

**Make the right way the easy way.** Nobody skips the guard because they enjoy risk; they skip it because it is fifteen lines of boilerplate at 6pm. Ship the reusable helper *before* the rule. Ship the generator, the template, the lint autofix. The correct path must be shorter than the wrong one, or the rule is just a tax on conscientious people.

**Automate enforcement, never police it.** A human reviewer asking "did you add a permission check?" on every PR is a person becoming a bottleneck and a source of resentment. A CI rule that says the same thing is neutral, tireless, and not personal. **Nobody argues with a red build the way they argue with a colleague.**

**Ratchet, do not sprint.** Grandfather everything that exists into a visible list, forbid the list growing, and let it shrink as people touch code anyway. This is what makes the standard survivable: nobody is asked to stop feature work for a month, and the codebase improves as a side effect of ordinary work. A rule that demands a big bang gets abandoned in week three.

**Show the number that made you care.** "We should have tests" is an opinion. "Four incidents last quarter were in the two modules with no tests, and each cost roughly a day of engineering plus a customer apology" is an argument. Instrument first — it is why observability is in Week 1 and not Quarter 1.

**Give it away.** The goal is not for me to be the person who understands the new architecture. Pair on the second migration, let someone else lead the third, and write the ADRs so the reasoning outlives the reasoner. A standard that depends on one person is a bus factor wearing a nice hat.

**Let them change it.** If a rule is wrong, it should lose an argument. A standard nobody may question is a decree, and decrees get followed exactly as far as they are watched. One I have genuinely revised: a global coverage floor sounds rigorous and produces tests of getters. Coverage on changed lines is a better rule, and it came from someone pushing back.

### How I would know it worked

Not "are people following the rules", which measures compliance. These measure whether it helped:

- **Time from merge to production** — trending down
- **Change failure rate** — the share of deploys needing a fix or rollback
- **Time to restore** when something breaks
- **Number of grandfathered exceptions** — must only ever shrink
- **How long a new joiner takes to ship safely** — the honest test of whether the codebase got easier to work in

If the first four improve and the fifth does not, the standards are ceremony. That is worth knowing, and worth changing.

---

<sub>Built for Digital Heroes Training Task — https://digitalheroesco.com</sub>
