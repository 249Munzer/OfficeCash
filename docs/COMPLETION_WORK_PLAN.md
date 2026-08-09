# خطة العمل التنفيذية — إكمال مشروع OfficeCash

**الغرض:** خطة عمل قابلة للتنفيذ لإغلاق كل البنود المتبقية والوصول بنسبة الإنجاز من **83% → 95%+**.
**المرجع:** `docs/PROFESSIONAL_REPORT_v3.md` (حالة المشروع الكاملة).
**المعايير:** كل مهمة تنتهي بالتحقق التلقائي (`npm run lint` ثم `npm run build`) + اختبار يدوي وفق معيار القبول.

---

## المرحلة P0 — إصلاحات حرجة (أولوية قصوى، قبل أي شيء آخر)

### P0.1 🔴 سدّ ثغرة "تبديل الموظف بلا PIN"
- **الموقع:** `src/components/EmployeePortal.tsx` (~سطر 424، نداء `onSelectEmployee`)
- **المشكلة:** الموظف المسجّل دخوله يستطيع اختيار حساب أي موظف آخر من داخل البوابة دون إعادة تحقق.
- **المطلوب:**
  1. تحويل تبديل الموظف داخل البوابة إلى فتح `AuthModal` بإعادة إدخال PIN للموظف المستهدف (تحقق عبر `loginAsEmployee`).
  2. إن كان الدور `admin` يُسمح بالتبديل بحرية (كما اليوم).
- **معيار القبول:** الموظف "أ" لا يستطيع تسجيل معاملة باسم الموظف "ب" إلا بإدخال PIN صحيح للموظف "ب".

### P0.2 🔴 إصلاح النصوص المشوّهة (Mojibake)
- **المواقع:**
  - `src/components/TransactionsTable.tsx:346` — `'â€”'` → `'—'`
  - `src/components/ReportsScreen.tsx:411` — `'â€”'` → `'—'`
  - `src/components/PrintableReport.tsx:147` — `'â€”'` → `'—'`
  - `src/components/Header.tsx:128` — `'âœ•'` → `'✕'`
- **المطلوب:** استبدال المحارف المشوّهة بالمحرف العربي/المقابل الصحيح، أو نقلها لمفاتيح i18n.
- **معيار القبول:** `rg "â€|âœ"` لا يُرجع أي نتائج، و`npm run build` ناجح.

### P0.3 🔴 إزالة الكود والحزم الميتة
- **الملفات:** `src/lib/storage.ts` (لا مستوردات)، `validation.ts` (سيُرتبط لاحقاً)، دوال legacy في `crypto.ts` (`hashPin`/`verifyPin`/`isPlainPin`/`generateRandomPin` إن لم تعد مستخدمة بعد ربط auth).
- **الحزم:** `express`، `@google/genai`، `dotenv` من `package.json` (إن لم تُستخدم في `electron/`).
- **معيار القبول:** `npm run build` ناجح بعد الحذف، وحجم الحزمة انخفض.

### P0.4 🔴 إتمام أول Commit في Git
- **الموقع:** الجذر (الفرع `main` بلا أي commit)
- **المطلوب:**
  1. إضافة `.gitignore` يحوي `dist/` و`dist-electron/` و`node_modules/` و`.env` و`*.db` (مهم: `dist-electron` مضافة حالياً — إبقاؤها خارجه لأنها مخرجات).
  2. `git add` للمصدر والوثائق فقط، ثم commit أول.
- **معيار القبول:** `git log` يعرض commit واحداً نظيفاً لا يحتوي مخرجات البناء.

---

## المرحلة P1 — استكمال الوظائف (أسبوع 1)

### P1.1 🟡 إكمال بيانات `package.json`
- إضافة `description`، `author`، `license`، و`version` مناسب (2.0.0).

### P1.2 🟡 ربط `validation.ts` بالنماذج
- **الموقع:** نماذج إضافة/تعديل الموظف، الخدمة، المصروف، والإعدادات.
- **المطلوب:** استدعاء `validateAmount`/`validatePin`/`validateName`... بدل الفحوصات المضمّنة اليدوية غير المتناسقة، مع توحيد "المبلغ يجب أن يكون > 0".
- **معيار القبول:** إدخال مبلغ 0 أو سالب يُرفض برسالة موحّدة عربية/إنجليزية.

### P1.3 🟡 مفتاح `autoLockClosedDays` في الإعدادات
- **الموقع:** `src/components/SettingsManager.tsx` + `i18n.ts` (مفتاحان عربي/إنجليزي).
- **المطلوب:** تبديل UI يعكس القيمة ويحفظها عبر `saveSettings`.
- **معيار القبول:** تعطيل القفل يسمح للمدير بالإدخال في يوم مغلق من FastEntryModal.

### P1.4 🟡 إصلاح تبويب "الشهري" في التقارير
- **الموقع:** `src/components/ReportsScreen.tsx`
- **المطلوب:** تبويب "التسوية/الشهري" يستخدم دائماً نطاق الشهر الحالي (أو يعرض نطاقاً واضحاً)، بغضّ النظر عن `dateFilter`.
- **معيار القبول:** اختيار "اليوم" ثم فتح التبويب الشهري يعرض بيانات الشهر كاملاً.

### P1.5 🟡 توحيد العملة الافتراضية
- **المواقع:** `AuthProvider.tsx` (ر.ق)، `electron-storage.ts` (ر.ق)، `storage.ts` (ر.س)، `formatters.ts` (ر.س)، `validation.ts` (صيغة سعودية فقط).
- **المطلوب:** ثابت واحد `DEFAULT_CURRENCY` يُستورد من مكان واحد؛ جعل تحقق الهاتف مرناً أو حسب إعداد الدولة.
- **معيار القبول:** مكتب جديد والوضع الافتراضي يعرضان نفس رمز العملة.

### P1.6 🟡 تعديل كامل في `TransactionsTable`
- **المطلوب:** نافذة التعديل تحرّر الموظف والخدمة والتاريخ والوقت إضافةً للمبلغ/الدفع/البيان.
- **معيار القبول:** تعديل تاريخ معاملة ينقلها بين أيام التقارير بشكل صحيح.

### P1.7 🟡 رسائل مصروفات ثنائية اللغة
- **الموقع:** `ExpensesManager.tsx` (سطر 71 و253) — نقل الرسائل الثابتة إلى `i18n.ts`.

### P1.8 🟡 إخفاء `networkSyncCode` من التحرير اليدوي
- **الموقع:** `SettingsManager.tsx` — عرض رمز المزامنة للقراءة فقط مع زر نسخ، ومنع الكتابة اليدوية.

---

## المرحلة P2 — الجودة والاختبارات (أسبوع 2-3)

### P2.1 ✅ بناء حزمة اختبارات أساسية
- **الأداة:** Vitest + React Testing Library (متوافقة مع Vite 6 مباشرة).
- **تم التنفيذ:** `vitest.config.ts` (jsdom + setup)، سكربت `npm test`/`test:watch`، و9 ملفات اختبار:
  - `credentials.ts` — تحقق/ترقية/رفض (plain, sha256$salt$hash, صيغة غريبة) ✅
  - `registration.ts` — كل رموز الأخطاء الحقلية ✅
  - `session.ts` — صلاحية المدير/الموظف + انتهاء + تعارض مكتب ✅
  - `formatters.ts` — تواريخ/عملات/CSV ✅
  - `syncCode.ts` — الصيغة `P2P-XXXX-XXXX` وعدم التكرار العشوائي ✅
  - `validation.ts` (كل الدوال)، `i18n.ts` (ترجمة رموز الخطأ + تطابق اللغتين) ✅
  - `SettingsManager` (قفل تلقائي + نسخ رمز المزامنة + تحقق اسم المكتب) ✅
  - `ReportsScreen` (تبويب monthly مستقل عن dateFilter + مسار الطباعة) ✅
- **معيار القبول:** `npm test` أخضر ✅ — **120 اختباراً / 9 ملفات** (يتجاوز >= 40 وحدة دالة).

### P2.2 ✅ تحسين أداء الحزمة
- **المشكلة:** 587KB JS (تحذير Vite).
- **تم التنفيذ:**
  - `React.lazy` + `Suspense` لجميع الشاشات الثقيلة في `App.tsx` (`Dashboard`، `ReportsScreen`، `TransactionsTable`، `SettingsManager`، `DayClosingManager`، `EmployeesManager`، `ServicesManager`، `ExpensesManager`، `EmployeePortal`، `AuthModal`، `FastEntryModal`، `PrintableReport`) مع fallback تحميل.
  - `manualChunks` في `vite.config.ts`: `react-vendor` (react/react-dom/client)، `motion`، `lucide`.
- **معيار القبول:** حجم الـ JS الرئيسي **163KB** (gzip 47KB) بعد تقسيم الشيفرة — أقل من 300KB ✅، وبلا تحذير chunk.

### P2.3 ✅ عناصر واجهة ناقصة
- **تم التنفيذ:**
  - زر "تفريغ الحقول" (Reset) إلى جانب زر الإلغاء في `FastEntryModal` يصفّر المبلغ/الموظف/الخدمة/الدفع/البيان ويعيد التركيز للمبلغ. ✅
  - عرض "بواسطة: —" افتراضياً عند عدم وجود محاسب (`closedBy || '—'`) في سجل `DayClosingManager`. ✅
  - ترقيم صفحات (Pagination) في `TransactionsTable` (50 معاملة/صفحة) مع عدّاد `عرض x–y من z` وأزرار السابق/التالي وترقيم مضغوط بنقاط `…`، ويعود للصفحة الأولى عند تغيير أي فلتر، والتصدير CSV يبقى لكامل النتائج. ✅
  - تحقق من تكرار username في `EmployeesManager` عبر `isUsernameTaken` المستخرجة من `registration.ts` (إضافة/تعديل، تجاهل الحالة والمسافات، باستثناء الموظف نفسه عند التعديل). ✅
  - فئات خدمات قابلة للتخصيص والترجمة في `ServicesManager`: القائمة الافتراضية انتقلت إلى `i18n.ts` (`serviceCategories`) مع ترجمة إنجليزية، والاختيار أصبح حقل إدخال + `datalist` يدعم إدخال قسم مخصص جديد، وتظهر الأقسام المخصصة المستخدمة في الفلترة. ✅
- **معيار القبول:** `npm run lint` 0 أخطاء ✅ — `npm test` أخضر ✅ — **122 اختباراً / 9 ملفات** — `npm run build` ناجح بلا تحذير chunk. ✅

### P2.4 ✅ توثيق
- **تم التنفيذ:**
  - `README.md` شامل: مميزات، تثبيت/تشغيل، أوامر npm، هيكل المشروع، اختبارات، إعدادات، بناء Electron، مزامنة LAN، أمان، دليل مطور، إضافة ترجمة/ميزة.
  - `docs/TASK_BOARD.md` محدث: يعكس الحالة الفعلية (P0→P2.3 مكتملة، P2.4 جارٍ، إحصائيات حالية، مراجع).
  - JSDoc لجميع الملفات الرئيسية:
    - `App.tsx` — نقطة الدخول + lazy loading + hooks
    - 9 Hooks في `hooks/` — useAppState, useEntries, useExpenses, useEmployees, useServices, useDayClosings, useNavigation, useP2PSync, (useAuth عبر AuthProvider)
    - `AuthProvider.tsx` — سياق المصادقة + createOffice + login/logout
    - 14 مكون رئيسي في `components/` — Dashboard, TransactionsTable, EmployeesManager, ServicesManager, DayClosingManager, ReportsScreen, SettingsManager, EmployeePortal, AuthModal, FastEntryModal, Header, Sidebar, LandingPage, PrintableReport
    - UI مشتركة — ToastProvider, ErrorBoundary, ConfirmModal
    - مكتبات `lib/` — i18n, formatters, validation, crypto, electron-storage, auth/credentials, auth/session, auth/registration, syncCode
- **معيار القبول:** `npm run lint` 0 أخطاء ✅ — `npm test` أخضر (203 اختبار) ✅ — `npm run build` ناجح بلا تحذير chunk ✅

---

## المرحلة P3 — نشر رسمي (بعد إغلاق P0-P1)

### P3.1 🟢 أيقونة تطبيق مخصصة
- إنتاج `icon.ico` (256px+) و`icon.png`/`pwa-512.png` موحّدين، وتحديث `main.js` + `build.win.icon`.

### P3.2 🟢 إصدار رسمي
- رفع `version` إلى `2.0.0` ✅، `npm run electron:build` ✅ (يُبنى ويُوقَّع) — التحقق من Installer NSIS (معالج + ترخيص + حماية بيانات).

### P3.3 🔵 مستقبلاً (اختياري)
- تشفير قناة المزامنة (مفتاح مشتق من كود المزامنة).
- فواتير PDF، تقارير Excel/رسوم بيانية، نسخ احتياطي تلقائي.
- Auto-updater.

---

## قائمة التحقق النهائية (قبل الإطلاق)

- [x] `npm run lint` → 0 أخطاء
- [x] `npm run build` → نجاح بلا تحذير chunk (الرئيسي 163KB بعد P2.2)
- [x] `npm test` → أخضر (203 اختباراً / 18 ملفاً)
- [x] لا نصوص مشوّهة (`rg "â€|âœ"` = 0)
- [x] تبديل الموظف يتطلب PIN
- [x] مفتاح القفل التلقائي يعمل من الإعدادات
- [x] `package.json` مكتمل (description/author/license)
- [x] أول commit نظيف في Git
- [x] المثبّت يُبنى ويُوقَّع (`OfficeCash-Setup-2.0.0.exe` + `license` AR/EN + إصلاح أخطاء NSIS 6010/6001)
- [x] الفحص اليدوي للمثبّت على ويندوز ناجح: تثبيت نظيف (6 خطوات + رجوع)، إلغاء افتراضي يُبقي `office_cash.db`، إلغاء كامل يحذفه، إعادة تثبيت بعد الإلغاء، ترقية فوق نسخة سابقة

---

**التقدير الزمني:** P0 (نصف يوم) → P1 (2-3 أيام) → P2 (3-4 أيام) → P3 (يوم واحد).
**مؤشر الإنجاز المتوقع بعد كل مرحلة:** P0 → 88% | P1 → 93% | P2 → 97% | P3 → 99%.

> ✅ **حالة التنفيذ:** P0 → P2.4 كاملة، P3.1 كاملة (أيقونات)، P3.2 كاملة (البناء والتوقيع)، **الفحص اليدوي للمثبّت ناجح** — المشروع جاهز للإطلاق (2026-08-10).

**ملف مقترح للتتبع:** تُحدَّث قوائم التحديد أعلاه بنمط `[x]` بعد إتمام كل بند.
