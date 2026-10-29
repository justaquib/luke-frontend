# Frontend UI consistency

The binding rule is **Design system (strict rule)** in `../CODE_STANDARDS.md`.
Read it before changing any page. In short:

- The Luke brain page (`src/app/brain/`) is the reference. Copy its
  density, tokens, card rows, header and typography, not a new look.
- Use `app-shell` + `app-sidebar` + `app-top-bar`. A page has no header,
  description or actions band of its own: the top bar names the page and its
  scope from route metadata, and the page's title, description, state and
  secondary controls live in the shared info panel, registered through
  `PageInfoService` and a `<ng-template appPageInfoActions>`. A page's one
  primary action (the brain's Train button) registers a
  `<ng-template appTopBarActions>` and is drawn before the frame controls.
  Do not copy a sidebar, brand mark, top bar, page header or actions row into
  a page.
- The sidebar is one shared state in `DesignService` (`open`, `mode` push /
  overlay / full, `side` left / right); pages never own a toggle. `app-shell`
  and the chat frame draw the shared `app-top-bar` in every state in three
  zones: brand with the primary-sidebar toggle on the left; page name, accent
  dot and scope in the middle; and the page's primary action plus info,
  settings and details controls on the right. Neither the sidebar nor the page
  body carries a toggle.
- Page identity is route metadata (`pageInfoForUrl`); `PageInfoService` reads
  it from router events. The top bar shows the route's name and scope (they can
  differ from the panel title: `Luke brain` / `Neural engine`). The info
  control shows the page's title, description, registered facts and controls,
  and the engine facts; the details control shows the page's registered
  details. Facts register through `appPageInfoFacts`, actions through
  `appPageInfoActions`, and the top action through `appTopBarActions`; each
  clears with the page.
- The right panel is content-aware: in info mode it shows the current page's
  info and engine facts, in details mode the page's registered details, and it
  pins a running background task below the active mode's content. The task
  section appears only while a task runs; a task also shows at the bottom of
  the open primary sidebar, and the app root polls while signed in. The panel
  and its scrim start below the top bar, so the frame controls stay reachable
  while it is open. Navigating in overlay mode closes the sidebar, and at
  680px or less it floats, starts folded, and the page stays in one
  full-width column.
- `/dashboard/design` is the frame's control room: palettes, icons, card
  min/max and corners, dialog width, sidebar width/side/mode and overlay
  strength. Change frame values there (or in the shared tokens), never on a
  page.
- One dialog and one message channel: every popup uses `app-modal` (directly,
  through `app-card-info`, or through `UiService.confirmDialog`), and every
  transient success or failure goes through `UiService` to `app-toasts`. No
  native `alert`/`confirm`, no page-local popup.
- Use the tokens in `src/styles.css`. One accent, neutral surfaces, no
  gradients, glows, blurs or drop shadows, no page-local hex palette.
- Colour: tokens only; accent is interaction, ok/warn/bad are measured states;
  surfaces are bg -> surface -> surface-2; borders 1px.
- Buttons: icon-only for routine row, toolbar and one-shot actions; the name
  lives in `aria-label` and `title`. A visible icon + label is allowed only for
  the Train action and for test decisions (start a mock or final exam, pass or
  fail an answer, pass the grade or keep learning). Primary accent, secondary
  surface-2, quiet, destructive; square 32px default / 28px compact / 24px
  xsmall for icon buttons; 6px radius; hover, focus and disabled states always
  defined; one primary action per view. Tabs, filter inputs, selectable choice
  cards, confirmation-dialog decisions and text links keep their label; a
  dialog decision states the decision.
- Icons: inline stroke SVG 14–18px, 1.8 stroke, round caps, currentColor. No
  emoji, `+`/`×`/`→` glyphs, icon fonts or Material icons. Every action is an
  icon with `aria-label`, `title` (the visible tooltip) and a 28px target; a
  button without a tooltip is incomplete. Add new icons to
  `src/app/shared/app-icon.ts` and reuse them.
- Cards: `--surface`, 1px border, 8px radius, 12px padding, 8px inner gap,
  equal heights in a grid with 240px columns, metric tiles 72px high. Content
  column max 1080px centered. Never nest a card in a card or fix a card height.
- Fonts: one active family for the whole product, inherited from `body` and
  chosen in Settings (Sans default, Serif, Mono are the only three, resolved
  from `--font-family-base`). Never declare a literal stack; use `var(--mono)`
  for measurements and `var(--font-family-base)` only to reset inside a mono
  block. 20px title, 13px UI, 14px conversation body, 12/11px compact labels;
  mono tabular for every measurement.
- Consistency: shared layer first; 16px page padding, 12px card padding, 8px
  surface radius, 6px control radius, 8px row gap, 24px section gap; never add
  a local size, radius, colour or font size that the shared layer does not
  define.
- Labels are 11px uppercase and letter-spaced; counts and measurements use the
  mono tabular font; rows are 1px-bordered with an 8px radius.
- Speak the engine's language: model, engine, training, corpus, measurement,
  held-out. Prefer those over generic headings.
- Page grammar: the top bar's three zones are brand/toggle left, page name +
  accent dot + scope middle, and primary action + info/settings/details right.
  The info panel carries the page's title, description, state and secondary
  controls, followed by the engine facts. A page never repeats a title,
  eyebrow, description or actions row in its body; its first content block is
  `app-engine-facts` (2–4 measured facts) followed by tabs, filters or cards.
  A page's live facts register through `<ng-template appPageInfoFacts>` and
  are drawn at the top of the info panel; Chat is the one view whose facts are
  conversation state, so they live there instead of the body and follow the
  active session. Do not repeat a count in the info panel, a chip and the
  strip. Fact values come from the same tenant-scoped list the rows show, never
  a global count beside per-tenant rows.
- Fold card explanations behind `app-card-info`; keep the heading and controls
  visible. Show provenance as a labelled `Source` line, not a pill.
- Chat: flat answers on the page surface, the session title in the top bar
  (renamed there), and the conversation facts in the info panel, read from the
  active session. An answer's text or info control opens the right panel with
  the question, answer, source, passages and "How this answer was found" — the
  reading, plan and connections the backend stored with that answer. While an
  answer streams, the messages area shows the live pipeline: the words read
  with their dictionary meanings, the question type and plan, and one row per
  source actually consulted. Render a stage only from backend data; a reveal
  may animate an answer that is already complete, never invent a stage, and
  reloaded answers show in full without re-animating. The bubble keeps
  provenance and icon-only feedback.
- Trainer: the corpus facts (trained answers, pending questions, corpus items)
  sit in the shared info panel's facts slot and come from the loaded corpus
  lists; tab counters are plain mono text. The Inbox lists pending questions
  only — answered ones live under Trained answers, so there is no resolved
  toggle or pending/total counter. The Documents tab leads with a dashed upload
  tile wired to the file picker; the uploaded file cards follow it, and the
  tile reports the indexing state while the upload runs. The info panel carries
  only the corpus facts — no upload or refresh controls.
- Brain: the level card shows the whole `0.0.0`→`1.0.0` road in bands, each
  rung passed, ahead, next or locked. Only the rung after the approved level,
  and only when a real test exists for it, can be next; every other rung is
  locked and says that no test has been written yet. Never fill a locked rung
  with a measurement.
- Settings: Model identity (name and starting version), then Engine connection,
  then Live sources, then Appearance (color mode, text size, typeface,
  palette), then the System overview package list; one info button per card.
  The model name from Model identity is
  the name the top bar, greeting and level ladder use. Palettes come from
  `PaletteService` — four immutable built-ins plus custom pairs added on
  `/dashboard/design` — and Settings saves only the palette id. Shared strip
  metrics live in `app-engine-facts.css`.
- Conversation: a greeting, "what is your name", a thank you and a goodbye are
  answered directly from the conversation pairs, which come from the backend
  and use the configured model name; the same pairs are training material. Do
  not hard-code the assistant's name in a component or template.
- Brain: the page reports the **word model**. The training room's Base model tab
  fine-tunes a Hugging Face teacher, and the chat composer picks between Luke
  and an installed teacher. An answer shown as generated must be labelled
  generated, and must not invent a citation, an identity or a measurement.
- Routes: `/chat` is the assistant surface. Every model-trainer and dashboard
  page lives under `/dashboard` (`trainer`, `parenting`, `learner`, `brain`,
  `assessment`, `settings`, `design`), and `/dashboard` redirects to
  `/dashboard/trainer`.
  There is one workspace and no tenant page or selector.
  The public entry pages stay at `/`, `/login`, `/systemadmin`, `/onboarding`.
  Add new builder pages below the guarded `/dashboard` route, never as flat
  routes; old flat paths are redirects only, and every internal link uses the
  namespaced path.
- Keep navigation inside the Angular router and show the active route. Preserve
  accessible names, landmarks, focus states and keyboard operation.
- Every page must fit at 390px without page-level horizontal scroll; wide
  tables scroll inside their own container.
- Never dress a missing number up as a number; follow the honest-measurements
  rule.

Before changing or creating a frontend page, tab, sidebar item, link, or flow,
inspect the existing Luke brain, Chat, Trainer and Lab settings views and reuse
their patterns. If a reusable pattern is missing, add or extend the shared
layer first, then use it.

When a package or runtime dependency changes, follow the repository-level
`AGENTS.md` requirement to update the System Overview package list and
explanations in the same change.
