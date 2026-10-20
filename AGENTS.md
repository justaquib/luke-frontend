# Frontend UI consistency

Before changing or creating a frontend page, tab, sidebar item, link, or flow:

- Inspect the existing Chat, Trainer, and System Admin views and reuse their navigation, page shell, spacing, typography, colors, controls, and responsive patterns.
- Keep navigation inside the existing Angular app using the router. A new route should feel like another view in the same product, not a separate website.
- Prefer shared components and existing design tokens/styles when available. If a reusable pattern is missing, add or extend it before introducing a one-off visual system.
- Keep page structure and interactions predictable: preserve the common sidebar/header behavior, show the active route or tab, and provide clear labels and focus/hover states.
- Make new and updated views work on narrow screens and maintain accessible names, semantic landmarks, and keyboard operation.
- Do not introduce a new color palette, typography system, layout shell, or interaction pattern without a clear product need. If one is needed, document the shared pattern and apply it consistently to related views.
- When the request is to fix a page that feels disconnected, align its shell and navigation with the neighboring views while preserving the page’s purpose and content.

When a package or runtime dependency changes, follow the repository-level `AGENTS.md` requirement to update the System Overview package list and explanations in the same change.
