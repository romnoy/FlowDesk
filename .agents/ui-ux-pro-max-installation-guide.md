# מדריך התקנה — Antigravity Kit / UI UX Pro Max Skill

> **מה זה?**
> Antigravity Kit הוא skill לעוזרי AI לכתיבת קוד (Claude Code, Cursor, Windsurf ועוד).
> הוא מוסיף למודל ידע מובנה של עיצוב UI/UX — פלטות צבעים, פונטים, סגנונות, גרפים, הנחיות UX — וכך ה-AI מייצר ממשקים הרבה יותר מקצועיים ועקביים.

---

## שלב 0 — דרישות מקדימות

לפני שמתחילים, יש לוודא שהכלים הבאים מותקנים:

### Python 3.x

הסקריפטים של ה-skill כתובים ב-Python. בדוק אם מותקן:

```bash
python3 --version
```

אם לא מותקן — התקן לפי מערכת ההפעלה:

| מערכת | פקודה |
|-------|-------|
| macOS | `brew install python3` |
| Ubuntu / Debian | `sudo apt update && sudo apt install python3` |
| Windows | `winget install Python.Python.3.12` |

### Node.js + npm

ה-CLI עצמו מותקן דרך npm. בדוק:

```bash
node --version
npm --version
```

אם לא מותקן — הורד מ-[nodejs.org](https://nodejs.org) (גרסה LTS מומלצת).

---

## שלב 1 — התקנת ה-CLI

התקן את `uipro-cli` גלובלית פעם אחת (לא צריך לחזור על זה בכל פרויקט):

```bash
npm install -g uipro-cli
```

בדוק שההתקנה עבדה:

```bash
uipro --version
```

---

## שלב 2 — ניווט לתיקיית הפרויקט

```bash
cd /path/to/your/project
```

> **חשוב:** ה-skill מותקן *בתוך הפרויקט*, לא גלובלית. כל פרויקט שרוצים שיהיה לו ה-skill צריך התקנה נפרדת.

---

## שלב 3 — הרצת פקודת ה-init

בחר את עוזר ה-AI שאיתו אתה עובד:

```bash
# Claude Code
uipro init --ai claude

# Cursor
uipro init --ai cursor

# Windsurf
uipro init --ai windsurf

# Antigravity
uipro init --ai antigravity

# GitHub Copilot
uipro init --ai copilot

# Kiro
uipro init --ai kiro

# כולם ביחד
uipro init --ai all
```

כלים נוספים נתמכים: `codex`, `roocode`, `qoder`, `gemini`, `trae`, `opencode`, `continue`, `codebuddy`, `droid`, `kilocode`, `warp`, `augment`.

---

## שלב 4 — וידוא התקנה

לאחר ההתקנה, תיקיית הפרויקט שלך אמורה להכיל:

**עבור Claude Code:**
```
.claude/
└── skills/
    └── ui-ux-pro-max/
        ├── data/
        ├── scripts/
        └── templates/
```

**עבור Antigravity:**
```
.agent/
.shared/
```

---

## שלב 5 — שימוש

ה-skill מופעל אוטומטית כשמבקשים עבודת UI/UX. פשוט מדברים עם ה-AI בצורה רגילה:

```
"צור לי דף נחיתה לפרויקט SaaS עם פלטת צבעים מקצועית"

"מה צירוף הפונטים המומלץ עבור אפליקציה פיננסית?"

"בחר סגנון UI מתאים לאפליקציית B2B — תסביר את הבחירה"
```

---

## שלב 6 — שימוש ישיר בסקריפט החיפוש (מתקדם)

אפשר לשאול את מנגנון החיפוש ישירות ממסוף הפקודה:

### חיפוש לפי דומיין

```bash
python3 src/ui-ux-pro-max/scripts/search.py "<שאילתה>" --domain <domain> [-n <כמות_תוצאות>]
```

| Domain | תוכן |
|--------|------|
| `product` | המלצות לפי סוג מוצר (SaaS, e-commerce, portfolio) |
| `style` | סגנונות UI + AI prompts ומילות CSS |
| `typography` | שילובי פונטים עם קישורי Google Fonts |
| `color` | פלטות צבע לפי סוג מוצר |
| `landing` | מבנה דפי נחיתה ואסטרטגיות CTA |
| `chart` | סוגי גרפים והמלצות ספריות |
| `ux` | Best practices ו-anti-patterns |

**דוגמאות:**
```bash
python3 src/ui-ux-pro-max/scripts/search.py "minimalism dark mode" --domain style
python3 src/ui-ux-pro-max/scripts/search.py "dashboard analytics" --domain color -n 5
python3 src/ui-ux-pro-max/scripts/search.py "onboarding flow" --domain ux
```

### חיפוש לפי stack

```bash
python3 src/ui-ux-pro-max/scripts/search.py "<שאילתה>" --stack <stack>
```

Stacks זמינים: `html-tailwind` (ברירת מחדל), `react`, `nextjs`, `astro`, `vue`, `nuxtjs`, `nuxt-ui`, `svelte`, `swiftui`, `react-native`, `flutter`, `shadcn`, `jetpack-compose`

```bash
python3 src/ui-ux-pro-max/scripts/search.py "button component" --stack react
python3 src/ui-ux-pro-max/scripts/search.py "hero section" --stack nextjs
```

---

## שלב 7 — תחזוקה ועדכונים (מתקדם)

### עדכון ל-version אחרון

```bash
uipro update
```

### הצגת versions זמינים

```bash
uipro versions
```

### הסרת ה-skill

```bash
# זיהוי אוטומטי של הפלטפורמה
uipro uninstall

# הסרה מפלטפורמה ספציפית
uipro uninstall --ai claude

# הסרה גלובלית
uipro uninstall --global
```

### התקנה ללא חיבור אינטרנט

אם אין גישה ל-GitHub בזמן ה-init:

```bash
uipro init --ai claude --offline
```

### דריסת קבצים קיימים

```bash
uipro init --ai claude --force
```

---

## שינוי קבצים (למי שרוצה להתאים את ה-skill)

> **עיקרון:** `src/ui-ux-pro-max/` הוא ה-Source of Truth. לא עורכים את הקבצים ב-`.claude/` ישירות.

| מה לשנות | איפה לערוך |
|-----------|------------|
| נתוני CSV (צבעים, פונטים, סגנונות) | `src/ui-ux-pro-max/data/*.csv` |
| סקריפטי Python | `src/ui-ux-pro-max/scripts/*.py` |
| תבניות תוכן | `src/ui-ux-pro-max/templates/base/` |
| הגדרות פלטפורמה | `src/ui-ux-pro-max/templates/platforms/` |

אחרי שינוי — סנכרן את תיקיית ה-CLI:

```bash
cp -r src/ui-ux-pro-max/data/* cli/assets/data/
cp -r src/ui-ux-pro-max/scripts/* cli/assets/scripts/
cp -r src/ui-ux-pro-max/templates/* cli/assets/templates/
```

---

## Git Workflow (למי שמפתח את ה-skill עצמו)

לעולם לא מפשים ישירות ל-`main`:

```bash
# יצירת branch חדש
git checkout -b feat/my-feature
# או
git checkout -b fix/bug-description

# Commit + Push
git add .
git commit -m "feat: description"
git push -u origin feat/my-feature

# פתיחת PR
gh pr create
```

---

## פתרון בעיות נפוצות

**`python3: command not found`**
→ Python לא מותקן. ראה שלב 0.

**`uipro: command not found`**
→ ה-CLI לא הותקן גלובלית, או שנתיב npm globals לא בנתיב המערכת. נסה: `npm install -g uipro-cli` שוב ובדוק את `$PATH`.

**ה-skill לא מופעל אוטומטית**
→ ודא שה-init רץ *בתוך* תיקיית הפרויקט הנכונה ושהתיקייה `.claude/skills/ui-ux-pro-max/` קיימת.

**שגיאת Python ב-`--design-system`**
→ ידוע ב-Python 3.11 ומטה. שדרג ל-Python 3.12+.

**Trae**
→ עבור למצב SOLO לפני שימוש ב-skill.

---

*גרסה עדכנית: v2.2.0 | [GitHub](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) | [npm](https://www.npmjs.com/package/uipro-cli)*
