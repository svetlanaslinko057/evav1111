{
  "project": {
    "name": "EVA‑X / ATLAS DevOS — Mobile (<768px) Blueprint",
    "goal": "Add production-grade mobile responsiveness without touching business logic or breaking existing tablet/desktop responsive.css (>=768px).",
    "non_goals": [
      "Do not change dark/light theme tokens or palette semantics",
      "Do not refactor 96 pages individually",
      "Do not introduce heavy navigation libraries"
    ]
  },
  "mobile_breakpoint_strategy": {
    "principle": "Mobile-first CSS layer applies only below 768px; desktop/tablet remains owned by existing responsive.css. Use a single mobile.css imported AFTER responsive.css so it wins on <768px only.",
    "breakpoints": {
      "base_320": {
        "range": "320–374",
        "intent": "iPhone SE floor; prioritize legibility + tap targets; avoid multi-column UI.",
        "changes": [
          "Sidebar fully off-canvas (drawer only)",
          "Bottom nav uses 4 items (avoid 5 on 320 unless icons-only)",
          "Tables always card-stack; no horizontal table by default",
          "Forms: single column, full-width inputs, sticky footer CTA"
        ]
      },
      "bp_375": {
        "range": "375–413",
        "intent": "Most iPhones; allow 5-item bottom nav if labels are short.",
        "changes": [
          "Bottom nav can be 5 items with 1-line labels",
          "KPI grids can become 2-up only if cards are short (otherwise 1-up)"
        ]
      },
      "bp_414": {
        "range": "414–479",
        "intent": "Plus/Max phones; allow denser cards and 2-up KPI where safe.",
        "changes": [
          "KPI cards: 2 columns for compact stats",
          "Card-stack rows can show 2 secondary fields inline"
        ]
      },
      "bp_480": {
        "range": "480–639",
        "intent": "Small landscape / foldables inner screens; allow split header rows.",
        "changes": [
          "Top bar can show optional page title",
          "Some tables may use horizontal scroll wrapper (.app-table-scroll) instead of card-stack if user explicitly needs column comparison"
        ]
      },
      "bp_640": {
        "range": "640–767",
        "intent": "Large phones / small tablets in portrait; prepare for md=768 handoff.",
        "changes": [
          "Optional: show mini-sidebar rail only if you already have it (otherwise keep drawer)",
          "KPI grids: 2 columns default",
          "Landing hero can reintroduce side-by-side only if it was designed for it (but keep vertical as default)"
        ]
      },
      "handoff_768": {
        "range": ">=768",
        "intent": "Stop applying mobile overrides; let existing responsive.css + Tailwind md+ handle.",
        "changes": [
          "Drawer disabled; fixed sidebar returns",
          "Bottom nav hidden",
          "Tables return to normal table layout"
        ]
      }
    }
  },
  "navigation_pattern": {
    "top_bar": {
      "anatomy": [
        "Left: hamburger button (opens drawer)",
        "Center: compact logo / current role label",
        "Right cluster: notifications bell + theme toggle"
      ],
      "behavior": [
        "Sticky at top on scroll (but avoid double-sticky with page headers)",
        "Height: 56px (min), 60px on >=414px",
        "Safe-area: padding-top via .app-safe-top",
        "Hamburger toggles body scroll lock when drawer open"
      ],
      "testing": {
        "data_testids": {
          "hamburger": "mobile-topbar-hamburger-button",
          "logo": "mobile-topbar-logo",
          "notifications": "mobile-topbar-notifications-button",
          "theme_toggle": "mobile-topbar-theme-toggle"
        }
      }
    },
    "drawer": {
      "structure": [
        "Header: role switch (optional) + close button",
        "Primary nav list (same as desktop sidebar, but grouped)",
        "Secondary: Settings/System links",
        "Footer: theme toggle (duplicate), profile summary, sign out"
      ],
      "interaction": [
        "Slide-in from left; backdrop click closes",
        "Focus trap if you already have Dialog component; otherwise keep minimal and ensure ESC closes",
        "Swipe-to-close optional (only if easy; otherwise omit for reliability)"
      ],
      "testing": {
        "data_testids": {
          "drawer": "mobile-drawer",
          "drawer_close": "mobile-drawer-close-button",
          "drawer_theme_toggle": "mobile-drawer-theme-toggle",
          "drawer_signout": "mobile-drawer-signout-button"
        }
      }
    },
    "bottom_nav": {
      "principle": "Bottom nav is for 4–5 highest-frequency routes per role. Everything else stays in drawer.",
      "layout": [
        "Fixed bottom, height 64px",
        "Safe-area padding-bottom via env(safe-area-inset-bottom)",
        "Icons + short labels; active state uses signal color",
        "Hide on screens >=768px"
      ],
      "role_mapping": {
        "Admin": [
          {"label": "Dashboard", "route": "/admin/dashboard", "icon": "LayoutDashboard", "testid": "bottomnav-admin-dashboard"},
          {"label": "Workflow", "route": "/admin/workflow", "icon": "Kanban", "testid": "bottomnav-admin-workflow"},
          {"label": "Finance", "route": "/admin/finance", "icon": "Wallet", "testid": "bottomnav-admin-finance"},
          {"label": "Team", "route": "/admin/team", "icon": "Users", "testid": "bottomnav-admin-team"},
          {"label": "Profile", "route": "/admin/profile", "icon": "User", "testid": "bottomnav-admin-profile"}
        ],
        "Client": [
          {"label": "Home", "route": "/client/home", "icon": "Home", "testid": "bottomnav-client-home"},
          {"label": "Projects", "route": "/client/projects", "icon": "FolderKanban", "testid": "bottomnav-client-projects"},
          {"label": "Inbox", "route": "/client/inbox", "icon": "Inbox", "testid": "bottomnav-client-inbox"},
          {"label": "Profile", "route": "/client/profile", "icon": "User", "testid": "bottomnav-client-profile"}
        ],
        "Developer": [
          {"label": "Dashboard", "route": "/dev/dashboard", "icon": "LayoutDashboard", "testid": "bottomnav-dev-dashboard"},
          {"label": "Workspace", "route": "/dev/workspace", "icon": "Terminal", "testid": "bottomnav-dev-workspace"},
          {"label": "Earnings", "route": "/dev/earnings", "icon": "Coins", "testid": "bottomnav-dev-earnings"},
          {"label": "Profile", "route": "/dev/profile", "icon": "User", "testid": "bottomnav-dev-profile"}
        ],
        "Tester": [
          {"label": "Hub", "route": "/tester/hub", "icon": "Radar", "testid": "bottomnav-tester-hub"},
          {"label": "Queue", "route": "/tester/queue", "icon": "ListChecks", "testid": "bottomnav-tester-queue"},
          {"label": "Profile", "route": "/tester/profile", "icon": "User", "testid": "bottomnav-tester-profile"}
        ]
      },
      "notes": [
        "On 320px: prefer 4 items (Admin can drop Team into drawer) OR use icons-only with accessible labels (aria-label + sr-only).",
        "Active indicator: 2px top border or small dot; avoid gradients."
      ]
    }
  },
  "typography_mobile_scale": {
    "rule": "Keep input font-size >=16px to prevent iOS zoom (already enforced in responsive.css). Use clamp() for headings between 320 and 767.",
    "clamp_tokens": {
      "h1": "clamp(1.75rem, 1.15rem + 2.2vw, 2.5rem)",
      "h2": "clamp(1.25rem, 1.05rem + 1.2vw, 1.6rem)",
      "h3": "clamp(1.05rem, 0.98rem + 0.6vw, 1.25rem)",
      "body": "clamp(0.95rem, 0.92rem + 0.25vw, 1.0rem)",
      "small": "clamp(0.8rem, 0.78rem + 0.2vw, 0.875rem)",
      "kpi_value": "clamp(1.4rem, 1.1rem + 1.6vw, 2.0rem)"
    },
    "usage": {
      "page_title_class": ".m-h1",
      "section_title_class": ".m-h2",
      "card_title_class": ".m-h3",
      "body_class": ".m-body",
      "small_class": ".m-small"
    }
  },
  "touch_interaction_primitives": {
    "tap_targets": {
      "minimum": "44x44px",
      "css": [
        ".tap-44 { min-height: 44px; min-width: 44px; }",
        ".tap-pad { padding: 10px 12px; }"
      ]
    },
    "states": {
      "hover_fallback": "On touch devices, rely on active/pressed states instead of hover. Use :active for press feedback.",
      "focus": "Always show visible focus ring for keyboard users; use existing token ring color (signalBorder) and 2px outline.",
      "pressed_motion": "Buttons: scale(0.98) on active; duration 120–160ms; no transition: all."
    },
    "scroll": {
      "rules": [
        "Use -webkit-overflow-scrolling: touch for horizontal scrollers",
        "Use overscroll-behavior: contain on main to reduce rubber-band issues",
        "Avoid nested scroll areas unless necessary (tables/kanban)"
      ],
      "swipe_gestures": [
        "KPI comparison rows: horizontal swipe with snap points",
        "Kanban: horizontal board scroll with momentum",
        "Bottom sheet: optional drag-to-dismiss (only if stable)"
      ]
    }
  },
  "table_to_card_stack_pattern": {
    "goal": "Replace wide admin tables with readable card rows on <768px without rewriting each page.",
    "pattern": {
      "approach": "CSS-driven: hide table header, convert rows to cards, show each cell as label/value using data-label attributes when available. If data-label not present, fall back to nth-child label mapping per table type via utility classes.",
      "required_markup_optional": "Best: add data-label on <td> (non-breaking). If you cannot, add a table-level class like .m-table--payouts and define labels in CSS using nth-child selectors.",
      "375px_example": {
        "layout": [
          "Each <tr> becomes a card with padding 12–14px",
          "Primary field (e.g., user/project) at top, bold",
          "Secondary fields in 2-column grid if space allows",
          "Actions row pinned at bottom with full-width buttons"
        ]
      },
      "1280px_behavior": "No change; table remains table (mobile CSS is scoped to max-width:767.98px)."
    },
    "css_selectors": {
      "apply_to": [
        ".app-table (table wrapper class you can add once in shared table component)",
        ".app-table-scroll (already exists for tablet overflow)"
      ],
      "core_rules": [
        "@media (max-width: 767.98px) {\n  .m-table { width: 100%; border-collapse: separate; border-spacing: 0 10px; }\n  .m-table thead { display: none; }\n  .m-table tbody, .m-table tr, .m-table td { display: block; width: 100%; }\n  .m-table tr { background: var(--t-surface, #16161A); border: 1px solid var(--t-border-default, rgba(255,255,255,0.10)); border-radius: 14px; padding: 12px; box-shadow: var(--t-shadow-sm); }\n  .m-table td { padding: 8px 0; border: 0; }\n  .m-table td::before { content: attr(data-label); display: block; font-size: 0.8rem; color: var(--t-text-muted); margin-bottom: 2px; }\n  .m-table td[data-primary=\"true\"] { padding-top: 0; }\n  .m-table td[data-primary=\"true\"]::before { display:none; }\n}\n"
      ],
      "actions": [
        "Use a td with data-actions=true and style it as a button row",
        "Ensure buttons are full-width on 320–375"
      ]
    }
  },
  "bottom_sheet_pattern": {
    "use_cases": [
      "Mobile modals/dialogs",
      "Filters/sort",
      "Quick approve/deny payout",
      "Inline edit forms"
    ],
    "anatomy": [
      "Backdrop (scrim)",
      "Sheet container (rounded top 16–20px)",
      "Drag handle (visual only unless implementing drag)",
      "Header row: title + close",
      "Body: scrollable content",
      "Optional sticky footer actions"
    ],
    "motion": {
      "enter": "translateY(100%) -> 0 with cubic-bezier(0.2, 0.8, 0.2, 1), 220ms",
      "exit": "reverse, 180ms",
      "backdrop": "opacity 0 -> 1, 160ms"
    },
    "css_scaffold": {
      "selectors": [
        ".m-sheet-backdrop",
        ".m-sheet",
        ".m-sheet__handle",
        ".m-sheet__header",
        ".m-sheet__body",
        ".m-sheet__footer"
      ],
      "rules": "@media (max-width: 767.98px) {\n  .m-sheet-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.45); backdrop-filter: blur(2px); z-index: 60; }\n  .m-sheet { position: fixed; left: 0; right: 0; bottom: 0; max-height: min(78dvh, 720px); background: var(--t-surface, #16161A); border-top-left-radius: 18px; border-top-right-radius: 18px; border: 1px solid var(--t-border-subtle); box-shadow: var(--t-shadow-lg); transform: translateY(100%); transition: transform 220ms cubic-bezier(0.2,0.8,0.2,1); z-index: 61; padding-bottom: max(env(safe-area-inset-bottom), 10px); }\n  .m-sheet[data-open=\"true\"] { transform: translateY(0); }\n  .m-sheet__handle { width: 44px; height: 4px; border-radius: 999px; background: var(--t-border-strong); margin: 10px auto 8px; }\n  .m-sheet__header { display:flex; align-items:center; justify-content:space-between; padding: 8px 14px 10px; }\n  .m-sheet__body { padding: 0 14px 14px; overflow:auto; -webkit-overflow-scrolling: touch; }\n  .m-sheet__footer { position: sticky; bottom: 0; background: color-mix(in srgb, var(--t-surface) 92%, transparent); padding: 10px 14px; border-top: 1px solid var(--t-border-subtle); }\n}\n"
    },
    "testing": {
      "data_testids": {
        "backdrop": "bottom-sheet-backdrop",
        "sheet": "bottom-sheet",
        "close": "bottom-sheet-close-button",
        "primary_action": "bottom-sheet-primary-action"
      }
    }
  },
  "form_mobile_pattern": {
    "layout": [
      "Single column stack; gap 12–16px",
      "Labels above inputs; helper/error text directly below",
      "Inputs full width; min-height 44px",
      "Use sticky footer CTA for multi-step forms"
    ],
    "sticky_footer_cta": {
      "behavior": [
        "Appears when form has primary action (Save/Submit/Next)",
        "Stays above bottom nav (add bottom padding to main content)",
        "Includes secondary action as ghost button"
      ],
      "css": "@media (max-width: 767.98px) {\n  .m-form { display:flex; flex-direction:column; gap: 14px; }\n  .m-form input, .m-form textarea, .m-form select { width: 100%; min-height: 44px; }\n  .m-form-footer { position: sticky; bottom: 0; z-index: 40; padding: 10px 12px; background: color-mix(in srgb, var(--t-bg, #0F0F11) 88%, transparent); border-top: 1px solid var(--t-border-subtle); padding-bottom: calc(10px + max(env(safe-area-inset-bottom), 0px)); }\n  .m-form-footer .m-cta { width: 100%; min-height: 48px; }\n}\n"
    },
    "testing": {
      "data_testids": {
        "form": "mobile-form",
        "primary": "mobile-form-primary-cta",
        "secondary": "mobile-form-secondary-cta",
        "error": "mobile-form-error-text"
      }
    }
  },
  "landing_page_mobile_relayout": {
    "hero": {
      "rules": [
        "Stack: headline -> subcopy -> primary CTA -> demo card",
        "Reduce 5xl heading to ~3xl equivalent via clamp token",
        "Keep typewriter animation but reduce speed slightly and ensure it wraps (no overflow)"
      ]
    },
    "sections": {
      "execution_pipeline": "Convert side-by-side to vertical; keep animated card full width; allow horizontal swipe for steps if multiple.",
      "stats_grid": "4 stats become 2x2 grid at >=375, 1x4 stack at 320.",
      "describe_widget_cta": "CTA card becomes full-width with sticky-ish CTA button inside section (not global sticky).",
      "portfolio": "Use horizontal scroll carousel with snap; each card min-width 78vw.",
      "footer": "Accordion groups for links; keep legal + socials at bottom."
    }
  },
  "must_have_mobile_ux_details": {
    "ios_safari": [
      "Safe-area padding for top bar and bottom nav",
      "Avoid fixed elements overlapping keyboard: prefer position: sticky for form CTA where possible",
      "Ensure inputs are >=16px (already handled)",
      "Use 100dvh (already handled via .h-screen override)"
    ],
    "performance": [
      "No heavy gesture libs; keep drawer + bottom nav minimal",
      "Avoid backdrop-filter on low-end Android if perf issues; provide fallback"
    ],
    "accessibility": [
      "All icon-only buttons must have aria-label",
      "Focus visible rings; do not remove outline",
      "Color contrast: signal on graphite must meet AA; use token signalInk for text on signal fills"
    ]
  },
  "centralized_css_selectors_and_classnames": {
    "strategy": "Target layout shell classes already present (.app-sidebar, .app-main). Add only a few global utility classes that pages can opt into without refactor.",
    "selectors": {
      "hide_sidebar_mobile": "@media (max-width: 767.98px) { aside.app-sidebar { display:none !important; } }",
      "main_padding_for_bottom_nav": "@media (max-width: 767.98px) { main.app-main { padding-bottom: calc(84px + max(env(safe-area-inset-bottom), 0px)); } }",
      "mobile_topbar_slot": ".m-topbar { position: sticky; top: 0; z-index: 50; height: 56px; display:flex; align-items:center; justify-content:space-between; padding: 0 12px; background: color-mix(in srgb, var(--t-bg) 92%, transparent); border-bottom: 1px solid var(--t-border-subtle); }",
      "mobile_bottomnav_slot": ".m-bottomnav { position: fixed; left: 0; right: 0; bottom: 0; z-index: 50; height: 64px; padding-bottom: max(env(safe-area-inset-bottom), 0px); background: color-mix(in srgb, var(--t-surface) 92%, transparent); border-top: 1px solid var(--t-border-subtle); }",
      "kpi_single_column": "@media (max-width: 767.98px) { .stats-grid, .kpi-grid { grid-template-columns: 1fr !important; } }",
      "horizontal_swipe_row": ".m-swipe-row { display:flex; gap: 12px; overflow-x:auto; scroll-snap-type:x mandatory; -webkit-overflow-scrolling: touch; padding-bottom: 6px; } .m-swipe-row > * { scroll-snap-align: start; min-width: 78vw; }",
      "auth_cards": "@media (max-width: 767.98px) { .auth-card { width: 100% !important; max-width: 420px; margin: 0 auto; padding: 16px; } }"
    },
    "naming": {
      "prefix": "m- (mobile)",
      "examples": ["m-topbar", "m-bottomnav", "m-table", "m-sheet", "m-form", "m-swipe-row"]
    }
  },
  "component_path": {
    "shadcn_ui_primary": [
      "/app/frontend/src/components/ui/button.js",
      "/app/frontend/src/components/ui/sheet.js (if exists) OR dialog.js",
      "/app/frontend/src/components/ui/tabs.js",
      "/app/frontend/src/components/ui/dropdown-menu.js",
      "/app/frontend/src/components/ui/sonner.tsx (toast usage only; app is JS but component exists)"
    ],
    "icons": "lucide-react"
  },
  "instructions_to_main_agent": [
    "Create /app/web/src/mobile.css and import it AFTER responsive.css in /app/web/src/index.css (or wherever responsive.css is imported).",
    "Implement two small JS components: MobileTopBar.js and MobileBottomNav.js. Render them only when window.matchMedia('(max-width: 767.98px)') matches (or via CSS + always-render but hidden on md+).",
    "Drawer: prefer shadcn Sheet if present; otherwise implement minimal div + backdrop with aria-modal and focus management best-effort.",
    "Add data-testid to all interactive elements in these new components and to key info labels (notification count, active route label).",
    "For tables: introduce a shared wrapper class .m-table on table elements in shared table component (one place). Optionally add data-label attributes to td in shared row renderer.",
    "Do not change existing >=768 styles; scope all overrides under @media (max-width: 767.98px)."
  ],
  "image_urls": {
    "note": "No new imagery required; this is a SaaS dashboard + existing landing. If you need subtle textures, use CSS noise overlay instead of images.",
    "categories": [
      {
        "category": "noise_texture",
        "description": "CSS-only noise overlay for hero/landing accents (max 20% viewport).",
        "urls": []
      }
    ]
  },
  "appendix_general_ui_ux_design_guidelines": "<General UI UX Design Guidelines>  \n    - You must **not** apply universal transition. Eg: `transition: all`. This results in breaking transforms. Always add transitions for specific interactive elements like button, input excluding transforms\n    - You must **not** center align the app container, ie do not add `.App { text-align: center; }` in the css file. This disrupts the human natural reading flow of text\n   - NEVER: use AI assistant Emoji characters like`🤖🧠💭💡🔮🎯📚🎭🎬🎪🎉🎊🎁🎀🎂🍰🎈🎨🎰💰💵💳🏦💎🪙💸🤑📊📈📉💹🔢🏆🥇 etc for icons. Always use **FontAwesome cdn** or **lucid-react** library already installed in the package.json\n\n **GRADIENT RESTRICTION RULE**\nNEVER use dark/saturated gradient combos (e.g., purple/pink) on any UI element.  Prohibited gradients: blue-500 to purple 600, purple 500 to pink-500, green-500 to blue-500, red to pink etc\nNEVER use dark gradients for logo, testimonial, footer etc\nNEVER let gradients cover more than 20% of the viewport.\nNEVER apply gradients to text-heavy content or reading areas.\nNEVER use gradients on small UI elements (<100px width).\nNEVER stack multiple gradient layers in the same viewport.\n\n**ENFORCEMENT RULE:**\n    • Id gradient area exceeds 20% of viewport OR affects readability, **THEN** use solid colors\n\n**How and where to use:**\n   • Section backgrounds (not content backgrounds)\n   • Hero section header content. Eg: dark to light to dark color\n   • Decorative overlays and accent elements only\n   • Hero section with 2-3 mild color\n   • Gradients creation can be done for any angle say horizontal, vertical or diagonal\n\n- For AI chat, voice application, **do not use purple color. Use color like light green, ocean blue, peach orange etc**\n\n</Font Guidelines>\n\n- Every interaction needs micro-animations - hover states, transitions, parallax effects, and entrance animations. Static = dead. \n   \n- Use 2-3x more spacing than feels comfortable. Cramped designs look cheap.\n\n- Subtle grain textures, noise overlays, custom cursors, selection states, and loading animations: separates good from extraordinary.\n   \n- Before generating UI, infer the visual style from the problem statement (palette, contrast, mood, motion) and immediately instantiate it by setting global design tokens (primary, secondary/accent, background, foreground, ring, state colors), rather than relying on any library defaults. Don't make the background dark as a default step, always understand problem first and define colors accordingly\n    Eg: - if it implies playful/energetic, choose a colorful scheme\n           - if it implies monochrome/minimal, choose a black–white/neutral scheme\n\n**Component Reuse:**\n\t- Prioritize using pre-existing components from src/components/ui when applicable\n\t- Create new components that match the style and conventions of existing components when needed\n\t- Examine existing components to understand the project's component patterns before creating new ones\n\n**IMPORTANT**: Do not use HTML based component like dropdown, calendar, toast etc. You **MUST** always use `/app/frontend/src/components/ui/ ` only as a primary components as these are modern and stylish component\n\n**Best Practices:**\n\t- Use Shadcn/UI as the primary component library for consistency and accessibility\n\t- Import path: ./components/[component-name]\n\n**Export Conventions:**\n\t- Components MUST use named exports (export const ComponentName = ...)\n\t- Pages MUST use default exports (export default function PageName() {...})\n\n**Toasts:**\n  - Use `sonner` for toasts\"\n  - Sonner component are located in `/app/src/components/ui/sonner.tsx`\n\nUse 2–4 color gradients, subtle textures/noise overlays, or CSS-based noise to avoid flat visuals.\n</General UI UX Design Guidelines>"
}
