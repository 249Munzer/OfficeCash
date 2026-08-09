# OfficeCash — نظام إدارة المقبوضات والمصروفات

نظام مكتبي محلي 100% (Offline-first) لإدارة الإيرادات اليومية، المصروفات، إغلاق الصندوق، والتقارير المالية. يعمل على Electron Desktop مع مزامنة LAN (P2P) بين أجهزة المكتب دون أي اعتماد على السحابة.

**🖥️ متوفر لنظام Windows (x64).**

[⬇️ تحميل OfficeCash-Setup-2.0.0.exe](https://github.com/249Munzer/OfficeCash/releases/latest)

## ✨ المميزات الرئيسية

| الميزة | الوصف |
|----------|-------|
| **💰 تسجيل المعاملات السريعة** | واجهة `FastEntry` (< 5 ثوانٍ) مع اختصار `F2`، اختيار الموظف/الخدمة/الدفع، مبلغ تلقائي من الخدمة |
| **👥 إدارة الموظفين** | حسابات بمعرف دخول (username) + PIN، ألوان مميزة، تتبع إيرادات يومي/كلي، تفعيل/تعطيل |
| **📋 دليل الخدمات والأسعار** | خدمات بتصنيفات قابلة للتخصيص (8 أقسام افتراضية مترجمة AR/EN + أقسام مخصصة)، سعر افتراضي، حالة نشط/معطل |
| **💸 المصروفات اليومية** | تصنيف حر، بيان، مبلغ، تصدير CSV، تخصم من صافي الربح |
| **🔐 إغلاق ومطابقة اليوم (Day Closing)** | تجميع نقد/شبكة/تحويل، مطابقة الصندوق الفعلي، فائض/عجز، محاسب مسؤول، ملاحظات، طباعة تقرير |
| **💼 نظام الاستحقاقات والتصفية** | عقد لكل موظف (نسبة 25/40/50/مخصص)، يوم عمل موثّق (دخول/استراحة/خروج)، تصفية يومية تلقائية، تأكيد مزدوج (صرف + استلام)، سجل تصفيات | 
| **📊 تقارير مالية شاملة** | تبويبات: ملخص، أداء موظفين، تحليل خدمات، جدول تصفية شهري — طباعة/تصدير CSV |
| **🔄 مزامنة LAN (P2P)** | ربط أجهزة المكتب عبر رمز `P2P-XXXX-XXXX`، بث تلقائي، يعمل دون إنترنت |
| **🛡️ أمان محلي** | PINs مشفرة بـ SHA-256 (Web Crypto API)، ترقية تلقائية لـ PINs قديمة، تحقق قوة PIN |
| **🔓 استرداد كلمة المرور** | أسئلة أمان (حتى 5) تُعرَّف عند إنشاء المكتب أو من الإعدادات، استرداد رمز المدير المنسي من شاشة الدخول |
| **🚪 تسجيل خروج واضح** | زر «تسجيل الخروج» في الإعدادات، والعودة دائماً للوحة التحكم بعد أي دخول |
| **🌐 دعم لغوي كامل** | عربية (RTL) / إنجليزية (LTR) — واجهة، رسائل تحقق، تواريخ، عملات |
| **🎨 واجهة حديثة** | Tailwind CSS 4، Motion/React للانتقالات، Lucide للأيقونات، Dark/Light mode |

---

## 🚀 التثبيت والتشغيل (للمستخدم النهائي)


1. **حمّل** أحدث إصدار من صفحة **[Releases](https://github.com/249Munzer/OfficeCash/releases/latest)** — ملف `OfficeCash-Setup-2.0.0.exe`.
2. **شغّل** الملف واتبع معالج التثبيت خطوة بخطوة:
   نبذة عن التطبيق ← الشروط والأحكام ← اختيار مكان التثبيت ← شريط التقدم ← الإنهاء (خيار تشغيل التطبيق).
3. **افتح** OfficeCash من اختصار سطح المكتب أو قائمة ابدأ وأنشئ مكتبك.

### 🗑️ إلغاء التثبيت يحمي بياناتك
- عند إلغاء التثبيت تبقى بيانات مكتبك (`office_cash.db`) محفوظة افتراضياً.
- إن اخترت «عدم الحفاظ على البيانات» يُحذف كل شيء نهائياً — كن حذراً.

---

## 📁 هيكل المشروع

```
OfficeCash/
├── src/
│   ├── App.tsx                      # نقطة الدخول، Lazy-loaded screens
│   ├── main.tsx                     # Bootstrap React
│   ├── types.ts                     # واجهات TypeScript مشتركة
│   ├── hooks/                       # 9 Custom Hooks
│   │   ├── useAppState.ts           # حالة التطبيق العامة
│   │   ├── useAuth.ts               # مصادقة (admin/employee + PIN)
│   │   ├── useP2PSync.ts            # مزامنة LAN (BroadcastChannel)
│   │   ├── useNavigation.ts         # تنقل + تحقق صلاحيات
│   │   ├── useEntries.ts            # CRUD الحركات المالية
│   │   ├── useExpenses.ts           # CRUD المصروفات
│   │   ├── useEmployees.ts          # CRUD الموظفين
│   │   ├── useServices.ts           # CRUD الخدمات
│   │   └── useDayClosings.ts        # CRUD إغلاق اليوم
│   ├── components/                  # مكونات رئيسية (شاشات + نوافذ + أدوات)
│   │   ├── Dashboard.tsx            # لوحة التحكم + إحصائيات حية
│   │   ├── FastEntryModal.tsx       # تسجيل معاملة < 5 ثوانٍ
│   │   ├── TransactionsTable.tsx    # جدول قابل للتصفية/ترقيم/تصدير
│   │   ├── ExpensesManager.tsx      # إدارة المصروفات
│   │   ├── EmployeesManager.tsx     # كادر المكتب + حسابات + عقود الاستحقاق
│   │   ├── ServicesManager.tsx      # دليل الخدمات + تصنيفات
│   │   ├── DayClosingManager.tsx    # إغلاق/مطابقة + سجل تاريخي
│   │   ├── ReportsScreen.tsx        # 4 تبويبات تقارير + طباعة
│   │   ├── SettingsManager.tsx      # إعدادات المكتب/أسئلة الأمان/نسخ احتياطي/خروج
│   │   ├── SettlementsScreen.tsx    # سجل التصفيات + تأكيد الصرف/الاستلام
│   │   ├── EmployeePortal.tsx       # بوابة الموظف (تسجيل/يوم موثّق/عرض شخصي)
│   │   ├── AuthModal.tsx            # بوابة الدخول + ربط LAN
│   │   ├── LandingPage.tsx          # تسجيل دخول/تسجيل مكتب/انضمام LAN
│   │   ├── PrintableReport.tsx      # معاينة طباعة احترافية
│   │   ├── auth/                    # AdminLoginForm, EmployeeLoginForm, OfficeRegistrationForm, ForgotPasswordModal
│   │   └── ui/                      # Toast, ConfirmModal, LegalModal, DangerZoneModal, ErrorBoundary, etc.
│   └── lib/
│       ├── auth/                    # credentials, registration, session
│       ├── i18n.ts                  # i18n كامل (~1200 سطر، AR/EN)
│       ├── validation.ts            # التحقق الموحد (مبلغ، PIN، اسم، مستخدم، هاتف، تاريخ)
│       ├── formatters.ts            # تنسيق تواريخ/أوقات/عملات/CSV
│       ├── crypto.ts                # تشفير/فك تشفير PINs (Web Crypto)
│       ├── syncCode.ts              # توليد/تحقق رموز P2P
│       ├── electron-storage.ts      # SQLite مشفر (better-sqlite3)
│       └── audio.ts                 # تأثيرات صوتية اختيارية
├── electron/
│   └── main.js                      # عملية Electron الرئيسية
├── public/                          # أصول ثابتة
├── docs/                            # وثائق المشروع
│   ├── COMPLETION_WORK_PLAN.md      # خطة عمل تنفيذية مع معايير قبول
│   ├── PROFESSIONAL_REPORT_v3.md    # تقرير حالة مفصل
│   ├── TASK_BOARD.md                # لوحة مهام محدثة
│   └── AUTH_SYNC_RESTRUCTURE_PLAN.md
├── vitest.config.ts                 # إعداد Vitest (jsdom + RTL)
├── vite.config.ts                   # Vite + manualChunks + build config
├── tsconfig.json                    # TypeScript صارم
└── package.json
```

---

## 🧪 الاختبارات

```bash
# تشغيل كل الاختبارات
npm test

# مراقبة مستمرة
npm run test:watch
```

**التغطية الحالية:** 203 اختبار / 18 ملف
- `lib/auth/credentials.test.ts` — تحقق/ترقية/رفض PINs
- `lib/auth/registration.test.ts` — تسجيل مكتب (أسئلة أمان + موافقة قانونية، بلا موظفين)
- `lib/auth/securityQuestions.test.ts` — قائمة الأسئلة، التطبيع، hash/verify، عدّاد المحاولات
- `lib/auth/session.test.ts` — جلسات admin/employee + انتهاء + تعارض
- `lib/settlement.test.ts` — احتساب العمولة، بناء التصفية اليومية، محفظة الموظف
- `lib/attendance.test.ts` — دخول/استراحة/انتهاء دوام
- `lib/formatters.test.ts` — تواريخ عربية، عملات، CSV
- `lib/i18n.test.ts` — مفاتيح متطابقة AR/EN، ترجمة رموز التحقق
- `lib/syncCode.test.ts` — صيغة `P2P-XXXX-XXXX`، عدم تكرار
- `lib/validation.test.ts` — كل دوال التحقق
- `components/SettingsManager.test.tsx` — قفل تلقائي، أسئلة أمان، زر خروج، تحقق اسم مكتب
- `components/ReportsScreen.test.tsx` — تبويب شهري مستقل + مسار طباعة
- `components/EmployeePortal.test.tsx` — بطاقات الإجماليات + فلترة + تبديل
- `components/Dashboard.test.tsx` — ملخصات لوحة التحكم
- `components/auth/AdminLoginForm.test.tsx` — دخول + استرداد كلمة المرور
- `components/auth/ForgotPasswordModal.test.tsx` — خطوات الاسترداد والأخطاء
- `auth/AuthProvider.test.tsx` — إنشاء المكتب + إعادة تعيين PIN بأسئلة الأمان

---

## 🔧 الإعدادات المدعومة (SettingsManager)

| الإعداد | الوصف |
|----------|-------|
| **معلومات المكتب** | الاسم، الترخيص، الرقم الضريبي، الهاتف، العملة، العنوان |
| **PIN المدير** | رمز الدخول للوحة الحساسة وتعديل الموظفين |
| **أسئلة الأمان** | حتى 5 أسئلة (من 10 معرّفة) تُستخدم لاسترداد رمز المدير المنسي |
| **رمز المزامنة (P2P)** | قراءة فقط + زر نسخ، يربط أجهزة LAN |
| **التنبيهات الصوتية** | تفعيل/تعطيل صوت عند حفظ معاملة سريعة |
| **قفل الأيام المغلقة** | عند التفعيل: يمنع الإدخال في يوم مغلق (ما عدا المدير إذا عُطل) |
| **اللغة/المظهر** | AR/EN + Light/Dark (محفوظ في localStorage) |
| **نسخ احتياطي** | تصدير/استعادة JSON كامل، إعادة بيانات تجريبية، مسح كامل |

---

## 📦 البناء من المصدر (للمطورين)

```bash
# بناء كامل (يتضمن build الواجهة + electron-builder)
npm run electron:build
```

**المخرجات في `dist-electron/`:**
- `OfficeCash-Setup-2.0.0.exe` — مثبت NSIS (معالج خطوات) + `blockmap` للتحديثات

> المستخدم النهائي لا يحتاج كل هذا — المثبّت الجاهز متاح في صفحة **[Releases](https://github.com/249Munzer/OfficeCash/releases/latest)**.

**خطوات معالج التثبيت (NSIS):**
1. الترحيب + نبذة عن التطبيق (عربي/إنجليزي حسب لغة النظام)
2. الشروط والأحكام (إلزامية — `installer/license_*.txt`)
3. اختيار مكان التثبيت
4. شريط تقدم التثبيت
5. الإنهاء مع خيار تشغيل التطبيق

**معالج إلغاء التثبيت يحمي بيانات المكتب المالية:** الافتراضي «احتفظ ببيانات المكتب وقاعدة بياناته» (`office_cash.db` في `%APPDATA%\OfficeCash`)؛ وإلغاء تحديده يحذف المجلد بالكامل.

**ملاحظات البناء:**
- `vite.config.ts` يحدد `manualChunks`: `react-vendor`، `motion`، `lucide`
- الكود الرئيسي ~164KB (gzipped 47KB) — لا تحذيرات chunk
- أيقونة التطبيق: استبدل `public/icon.ico` و `public/icon.png` قبل البناء

---

## 🌐 المزامنة المحلية (P2P LAN)

1. في الجهاز **الرئيسي**: اذهب إلى **الإعدادات** → انسخ **رمز المزامنة** (مثل `P2P-AB12-CD34`)
2. في الجهاز **الفرعي**: شاشة البداية → تبويب **"ربط الشبكة (LAN)"** → ألصق الرمز → **ربط الجهاز**
3. المزامنة فورية عبر `BroadcastChannel` + `localStorage` events — تعمل دون إنترنت، داخل نفس الشبكة الفرعية

---

## 🛡️ الأمان المحلي

- **PINs**: لا تُخزن نصية — تُحفظ كـ `sha256$salt$hash` (Web Crypto API `SubtleCrypto.digest`)
- **ترقية تلقائية**: PINs قديمة (نصية) تُهاشح عند أول دخول ناجح
- **تحقق القوة**: يرفض `1234`، `0000`، `1111`، التسلسلات (`1234`/`4321`)، الأرقام المكررة
- **قاعدة البيانات**: SQLite محلي (`electron-storage.ts`)، ملف واحد في `userData`، لا سحابة

---

## 🤝 دليل المطور

### إضافة ميزة جديدة
1. **الأنواع**: أضف واجهات في `src/types.ts`
2. **المنطق**: دوال نقية في `src/lib/` (قابلة للاختبار بوحدات)
3. **Hook**: إن احتجت حالة مشتركة، أنشئ `useXxx.ts` في `hooks/`
4. **المكون**: في `components/`، استخدم `makeT(settings.language)` للنصوص
5. **الاختبار**: أضف `*.test.ts` أو `*.test.tsx` بجانب الملف
6. **التوثيق**: حدّث `docs/COMPLETION_WORK_PLAN.md` و `docs/TASK_BOARD.md`

### معايير الكود
- **TypeScript صارم** (`strict: true`، `noUncheckedIndexedAccess`)
- **ESLint عبر `tsc --noEmit`** — صفر أخطاء قبل commit
- **i18n إلزامي** — لا نصوص صريحة في المكونات، استخدم `t('key')`
- **التحقق الموحد** — `validateAmount`/`validatePin`/... من `lib/validation.ts`
- **Lazy load** للشاشات الثقيلة — راجع `App.tsx` نمط `React.lazy + Suspense`

### إضافة ترجمة جديدة
1. أضف المفتاح في قسم `ar` في `lib/i18n.ts`
2. أضف نفس المفتاح في قسم `en` (النظام يفرض التطابق عبر الاختبار)
3. استخدم `t('key', { vars })` في المكون

---

## 📄 الترخيص

MIT — راجع `package.json` → `license`.

---

## 🙋‍♂️ الدعم

للأسئلة التقنية أو الإبلاغ عن مشاكل، افتح **Issue** في المستودع. للنشر الرسمي راجع قسم **البناء للإنتاج** أعلاه.

---

**OfficeCash** — نظام محلي سريع، آمن، ومصمم للمكاتب العربية.  
*الإصدار 2.0.0 — أغسطس 2026*
