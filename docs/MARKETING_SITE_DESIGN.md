# OfficeCash — Marketing Site Design Specification

**8 sections · Mid Editorial Hero · Arabic-first (RTL) · Offline-first product**

A premium, conversion-aware marketing site reference for **OfficeCash** (نظام إنجاز المالي والإداري) — the local, offline cash & expense system for small offices and companies. This document is the full art-direction package: locked palette, typography, and a per-section layout reference (composition anchor, background mode, CTA, component, copy) that a developer or coding model can build directly.

---

## 0. Global commitments (locked across all 8 sections)

| Dial | Value |
|---|---|
| Section count | 8 (one horizontal reference image per section) |
| Hero Scale | **Mid Editorial** — trust-driven, product-framed |
| Theme Paradigm | **Deep Dark Mode** — ink navy canvas, one paper-lite beat |
| Typography Character | Geometric Arabic grotesk display (Cairo) + refined sans body (IBM Plex Sans Arabic) + tabular mono numerals |
| Hero Architecture | Editorial Offset (giant headline bottom-start, floating product card top-end) |
| Section System | Alternating editorial blocks, Swiss-led ledger discipline |
| Narrative Spine | **Tool / precision instrument** — the ledger as a machined instrument; "day closing" as the moment of truth |
| Motion-Implied | **Pinned day-closing narrative** + **staggered float-up** |
| Second-Read Moment | One oversized tabular numeral (day-closing total) anchoring the Product Showcase |
| Composition anchors | Bottom-start overlay · Stacked center · Top-left lead · Caption + two-thirds visual · Bottom-start over duotone · Centered statement · Off-grid offset · Centered low |
| Background modes | Full-bleed navy · Paper texture · Solid + grid · Radial vignette + product · Duotone photo · Micro-noise · Flat gold block · Cinematic tonal gradient |

### 0.1 Palette (one controlled world)

| Token | Hex | Role |
|---|---|---|
| `--oc-ink` | `#0B1329` | Page canvas (deep ink navy) |
| `--oc-navy` | `#0F172A` | Card / surface |
| `--oc-navy-2` | `#172554` | Sub-panel / raised surface |
| `--oc-line` | `#1E293B` | Hairline border (dark) |
| `--oc-line-2` | `#334155` | Stronger border / inputs |
| `--oc-paper` | `#F1F5F9` | Paper section (the one light beat) |
| `--oc-text` | `#F8FAFC` | Primary text on dark |
| `--oc-text-2` | `#CBD5E1` | Secondary text |
| `--oc-text-3` | `#94A3B8` | Muted / captions |
| `--oc-gold` | `#F59E0B` | **Accent / primary CTA** (cash highlight) |
| `--oc-gold-deep` | `#D97706` | Gold hover / pressed |
| `--oc-blue` | `#3B82F6` | Supporting tone (trust, LAN, links) |
| `--oc-indigo` | `#6366F1` | Secondary tone (admin / management) |
| `--oc-emerald` | `#10B981` | Status only: closed / matched ✓ (sparing) |
| `--oc-rose` | `#F87171` | Errors only (never decorative) |

Rules: gold is the single action color; blue is for informational/trust; emerald appears only on "مطابق / متصل" states; gradients are low-chroma palette-matched (ink→graphite, navy→indigo wash), never rainbow/neon.

### 0.2 Typography

| Role | Font / Weight | Spec |
|---|---|---|
| Display XL (hero) | Cairo 900 | `clamp(2.75rem, 7vw, 5.5rem)`, lh 1.05, tracking 0 |
| Display L (section title) | Cairo 800 | `clamp(1.75rem, 3.5vw, 3rem)`, lh 1.15 |
| Card title | Cairo 700 | 1.25rem |
| Body | IBM Plex Sans Arabic 400 | 1rem, lh 1.75 |
| Caption / muted | IBM Plex Sans Arabic 400 | 0.875rem, `--oc-text-3` |
| Label | 700 | 0.75rem, letter-spacing 0.08em (Latin only) |
| Numerals (money, counts) | IBM Plex Mono 600 | tabular, gold for totals, `--oc-text` otherwise |

English fallback: Inter. Numerals are always tabular mono — the "ledger instrument" identity.

### 0.3 Spacing · Radius · Elevation

- Section padding: `clamp(5rem, 12vh, 8rem)` top and bottom, even across sections.
- Container: `max-width 1200px`, 12-col grid, gutter 24px.
- Cards: `rounded-2xl` (16px) · controls/inputs: `rounded-xl` (12px) · chips/CTA: pill.
- Cards on dark: 1px `--oc-line` border + subtle lift (no heavy shadows); gold CTA: soft `rgba(245,158,11,0.25)` glow, restrained.
- Dark canvas dominant; the one paper section reuses the same ink text colors (not a theme swap).

### 0.4 Direction & behavior

- **RTL-first** (Arabic). Text block alignment mirrors to the reading-start side; the layout must collapse cleanly to a single column on mobile.
- All copy in short, believable Arabic (samples below). No "unleash/elevate" slop, no fake brand wordmarks.
- One unmistakable primary action per viewport tier; secondaries are ghost/outline.
- Data viz only where the product needs it (reconciliation rows) — proof is human and concrete.

---

## Section 1 of 8: Hero

**Job:** hook + one obvious action in seconds.

**Composition anchor:** Bottom-start text over full-bleed canvas; floating product card top-end (editorial offset — **not** left/right split).
**Background mode:** Full-bleed ink navy with a faint dotted technical grid (24px field, `rgba(148,163,184,0.05)`) and a low-chroma amber radial vignette at the bottom start.
**CTA:** Classic primary pill (gold) + ghost secondary.
**Aspect:** 16:9 or 21:9.

Layout (12-col, min-height 92vh):
- Top nav: wordmark + two muted links + a small "LAN متصل" emerald pulse chip.
- Headline (Display XL, Cairo 900, bottom-start, ~65% width): **«يومٌ محسوب، وصندوقٌ مطابق.»**
- Sub (body, `--oc-text-2`, max 52ch): *«نظام مالي وإداري يعمل داخل شبكة مكتبك — بلا سحابة، بلا اشتراكات، بلا إنترنت. سجّل المقبوضات والمصروفات وأغلق اليوم بضغطة واحدة.»*
- Primary gold pill: **أنشئ مكتبك الآن** · ghost: **استكشف المزايا**.
- Floating card (top-end, rotated −2°): mini "إقفال اليوم" card — method rows نقداً/شبكة/تحويل + gold total + emerald **«مطابق ✓»**.
- Micro trust row under CTAs: `OFFLINE-FIRST · P2P LAN · 100% على أجهزتك`.

Image direction: dark navy canvas, faint dotted grid, giant Cairo Black Arabic headline anchored bottom-right of frame, small glowing ledger card floating top-left, amber pill CTA, cinematic vignette. 21:9, moody, premium, no blobs.

---

## Section 2 of 8: Trust Bar

**Job:** earned proof beat; a breath of lightness.
**Composition anchor:** Stacked center — mini minimalist, mostly negative space.
**Background mode:** Paper texture (`--oc-paper`, subtle grain) — the one light section.
**CTA:** Underlined inline link with arrow.
**Aspect:** 16:10, short (≈ 40vh).

Layout:
- Centered single statement (Display L, Cairo 800, ink text): **«أداة دقيقة لمن يحتاج رقمه مطابقاً عند الساعة الخامسة تماماً.»**
- Hairline + one row of three quiet capability labels (no fake logos, no three-stat columns): `محاسبة يومية` · `إدارة المصروفات` · `تقارير قابلة للطباعة`.
- Mono tag: `OFFLINE-FIRST / P2P` + inline link **اقرأ قصة النظام** →.

Image direction: light warm paper background, centered dark Arabic headline, thin hairline, three small spaced text labels, one underlined link. Swiss, airy, confident.

---

## Section 3 of 8: Features

**Job:** educate the product surface.
**Composition anchor:** Top-left lead (label + heading), support grid fills the rest.
**Background mode:** Solid dark surface with subtle grid; inline assets (gapless bento).
**Signature component:** **Pristine Gapless Bento Grid**.
**CTA:** Classic primary pill (small, secondary to hero).
**Aspect:** 16:10.

Layout (12-col, gapless `--oc-line` hairlines, bento):
- Label `المزايا` · Heading (Display L): **«كل ما يخص صندوقك، في شاشة واحدة.»**
- Bento cells (varied sizes — one large, one tall, one mini):
  1. **تسجيل فوري** (blue chip) — «حركات بلا فواصل: نقداً، شبكة، أو تحويلاً.»
  2. **إقفال اليوم** (gold chip, largest cell, 2-col span) — «مطابقة الصندوق في ثوانٍ مع احتساب الفرق تلقائياً.» + a tiny inline ledger row.
  3. **واجهة الموظف** (indigo) — «كل موظف يرى سجله فقط، ويسجل حركته بنفسه.»
  4. **المصروفات والخدمات** (emerald) — «دليل خدمات وأسعار، وصرف منظم بلا تاه.»
  5. **تقارير وطباعة** (paper-white cell) — «تصفية رسمية جاهزة للاعتماد والطباعة.»
- Small gold pill under grid: **جرّب التسجيل المجاني** →.

Image direction: dark bento grid, gapless cells with subtle hairlines, one oversized gold-rimmed cell, one paper-white cell, icon chips in brand colors, short Arabic labels. Dense but airy.

---

## Section 4 of 8: Product Showcase

**Job:** prove the product; the second-read moment lives here.
**Composition anchor:** Caption on one-third + two-thirds visual (inverted classic — visual is dominant).
**Background mode:** Soft radial gold vignette on navy behind a **Product UI Panel Stack**.
**Signature component:** Product UI Panel Stack + material switch (paper A4 report card).
**Second-read moment:** Oversized tabular numeral — day-closing total at 20× scale behind/inside the front card.
**CTA:** Outline / ghost + caption under visual.
**Aspect:** 16:9.

Layout:
- Left-third caption (RTL: start side): label `كيف يعمل` · Heading: **«من تسجيل الحركة إلى التصفية الرسمية.»** · sub: «ثلاث خطوات، سجل واحد، وصندوق يطابق نفسه.» · outline CTA: **شاهد العرض التوضيحي**.
- Right-two-thirds stack (3 layered cards, −3°/+1° rotations, depth shadows):
  - Back: **سجل الحركات** table — columns # · الوقت · الموظف · الخدمة · المبلغ · الدفع; tabular mono numerals.
  - Front-left: **إقفال اليوم** card — «05:00 م» + three payment-method rows + **الفرق: 0.00** in emerald + gold **«مطابق ✓»** + giant ghost numeral `1,248` at 20× behind the card.
  - Front-right small: printable A4 **التصفية** report sheet (paper-white, the material switch).
- Caption line under the stack: `يعمل على Windows · macOS · Linux`.

Image direction: layered dark UI panels in perspective stack, glowing amber vignette, giant ghost Arabic/ledger numeral, paper-white A4 sheet contrasting the navy, one-third caption. Cinematic product story.

---

## Section 5 of 8: Use Cases

**Job:** role-based empathy; the atmospheric beat.
**Composition anchor:** Bottom-start text over duotone image.
**Background mode:** **Duotone treated image** (ink-navy + gold) of a small office/cashier desk — full-bleed.
**Signature component:** **Hover-Accordion Slice Layout** (3 vertical slices).
**CTA:** Underlined inline link with arrow.
**Aspect:** 21:9.

Layout:
- Full-bleed duotone photo, dark overlay for readability.
- 3 vertical slices (top area) — compressed, expand on hover:
  - **المدير** — «يقفل اليوم ويصادق على المطابقة، بلا أوراق متناثرة.»
  - **الموظف** — «يسجل حركته في ثوانٍ من واجهة بسيطة.»
  - **الصندوق / المحاسب** — «يطابق نقداً وشبكة وتحويلاً، ويطبع التصفية.»
- Bottom-start caption (Display L): **«كل دور له واجهته، وصندوق واحد مشترك.»** + inline link **مناسب لك؟** →.

Image direction: duotone office photography in deep navy + amber, three vertical hover-slices with titles, bottom-anchored Arabic headline, full-bleed, atmospheric.

---

## Section 6 of 8: Testimonials

**Job:** human proof — calm beat.
**Composition anchor:** Centered statement.
**Background mode:** Micro-noise gradient over solid navy (subtle tactile depth).
**CTA:** Ghost link (secondary).
**Aspect:** 16:10.

Layout:
- Label `آراء العملاء` · one strong quote, centered, Display L serif-free Cairo: **«أقفل صندوق اليوم في ثلاث دقائق بدلاً من نصف ساعة — والأرقام تطابق بالضبط.»**
- Attribution: avatar chip (initial) + **مدير عمليات — مكتب خدمات، الرياض**.
- Ghost link: **المزيد من قصص العملاء**.
- No star spam, no three-quote columns.

Image direction: centered single quote on textured navy, one avatar chip, hairline dividers, quiet and premium.

---

## Section 7 of 8: Pricing

**Job:** decisive, honest cost.
**Composition anchor:** Off-grid editorial offset (featured plan pulled, others aligned).
**Background mode:** Solid dark + one flat gold color-block accent behind the featured plan.
**CTA:** Classic primary pill (featured) + outline (secondary).
**Aspect:** 16:10.

Layout:
- Label `الأسعار` · Heading: **«اشتراك واحد، لمرة واحدة.»**
- Two plans, one featured (offset −1rem, gold block behind):
  - **ابدأ مجاناً** — جهاز واحد · 30 يوماً · كل المزايا · outline CTA **بدء تجربة**.
  - **رخصة المكتب** (featured) — `1,499 ر.س` / مرة واحدة · كل الأجهزة · مزامنة P2P · تحديثات مجانية · gold pill **اشترِ الرخصة**.
- Note row (mono, muted): `لا رسوم شهرية · بياناتك على أجهزتك · بلا سحابة`.

Image direction: dark page, two pricing cards, featured card offset on a gold block, mono pricing numerals, hairline dividers, restrained.

---

## Section 8 of 8: Closing CTA

**Job:** close the funnel with one action + trust cue.
**Composition anchor:** Centered low statement.
**Background mode:** Cinematic tonal gradient (ink → graphite) with faint amber floor glow.
**CTA:** Oversized headline + banner-width gold pill; footer micro-strip.
**Aspect:** 16:9.

Layout:
- Headline (Display XL, centered): **«يومك القادم، مُحاسَب.»**
- Sub: «ثبّت النظام، اربط أجهزتك، وابدأ أول إقفال.»
- Banner gold pill: **حمّل النسخة الآن** (full-width, max 420px).
- Trust cue row: `يعمل بدون إنترنت · Windows · macOS · Linux`.
- Footer micro-strip: wordmark + «جميع البيانات محفوظة محلياً © 2026» + mono `OFFLINE-FIRST`.

Image direction: near-black navy gradient, centered giant Arabic headline, wide amber CTA pill, thin footer line, cinematic and final.

---

## Build order & implementation notes

1. `index.css`: tokens (§0.1), font imports (Cairo 700/800/900, IBM Plex Sans Arabic 400/500/700, IBM Plex Mono 500/600), radius + spacing utilities.
2. Layout primitives: container, 12-col grid, section spacing, RTL logical properties (`inset-inline-start`, `text-align: start`).
3. Components in order: TopNav → HeroCard (floating day-closing card) → TrustBar → BentoGrid → PanelStack (table + closing card + report sheet) → AccordionSlices → QuoteBlock → PricingCards → ClosingCta.
4. Motion: pins on §4/§5 narrative; staggered float-up on §1 and §3.
5. Responsive: all sections collapse to one column; bento becomes single column; PanelStack becomes stacked static cards; slices become stacked rows.
6. States: gold CTA `hover → gold-deep`; emerald only for `مطابق/متصل`; `prefers-reduced-motion` disables pins/parallax.
