# خطة إعادة هيكلة: تسجيل الدخول، تسجيل المكتب، وربط الشبكة (LAN/P2P)

أُعدّت بتاريخ 2026-08-05. الغرض: خطة إعادة هيكلة احترافية للمكونات الثلاثة:
**تسجيل الدخول (Auth)**، **تسجيل مكتب جديد (Office Registration)**، و**ربط الشبكة (LAN/P2P Sync)**،
مع منطق احترافي واضح لكل مكوّن، وترتيب تنفيذ واقعي.

المرجعيات من الشيفرة الحالية:
`src/hooks/useAuth.ts`، `src/components/AuthModal.tsx`، `src/components/LandingPage.tsx`،
`src/App.tsx`، `src/lib/electron-storage.ts`، `src/lib/crypto.ts`، `src/lib/syncCode.ts`،
`src/hooks/useP2PSync.ts`، `electron/main.js`.

---

## 0. ملخّص المبادئ العامة

1. **مصدر حقيقة واحد**: حالة الجلسة في مكان واحد (Context)، ومنطق التحقق من الأرقام السرية في خدمة واحدة.
2. **لا واجهة مكررة**: نموذج تسجيل الدخول يُبنى مرة واحدة ويُستخدم في LandingPage و AuthModal.
3. **التحقق قبل التنفيذ**: كل عملية كتابة تتحقق من صحة البيانات وتعيد نتيجة `{ ok, error }` للواجهة.
4. **آلة حالات صريحة**: الانضمام للشبكة حالة مُدارة (idle/joining/joined/failed) وليس متغيراً عاماً.
5. **ترقّي بلا كسر**: كل تغيير في التخزين (hash/deviceId) متوافق مع البيانات القديمة.

---

## 1. المكوّن الأول: تسجيل الدخول (Auth)

### 1.1 الوضع الحالي والمشاكل

| # | المشكلة | الموقع |
|---|---------|--------|
| 1.1 | واجهتا تسجيل دخول متطابقتان (موظف/مدير) بنفس الحالة ونفس مفاتيح i18n، بسلوك متباين | `AuthModal.tsx:182-285` و `LandingPage.tsx:340-493` |
| 2.1 | منطق التحقق من الرقم السري (plain/hashed/ترقية) مكرر ومضمّن داخل دالتين | `useAuth.ts:60-73` و `useAuth.ts:97-105` |
| 3.1 | دالة `isPlainPin` تعتمد طول `length < 20` فقط؛ كلمة مرور نصية بطول 20+ تُعالَج كـ hash فلا تُتحقق أبداً | `crypto.ts:59-63` |
| 4.1 | `hashPin` يستخدم salt ثابت للكل (ديكشنري-attack سهل) ولا يملك saltاً فردياً لكل مستخدم | `crypto.ts:7` |
| 5.1 | الجلسة بلا انتهاء صلاحية ولا ربط بجهاز؛ الحارس الوحيد في App هو مقارنة اسم المكتب | `App.tsx:111-118`، `types.ts:84-90` |
| 6.1 | `handleLoginAsEmployee` يغيّر كائن الموظف المشترك ويحفظ قائمة الموظفين كاملة عند كل تسجيل دخول (write amplification) | `useAuth.ts:67-68` |
| 7.1 | رسالة خطأ مزدوجة: خطأ داخل الـ modal + Toast من الـ hook في نفس الوقت | `useAuth.ts:86-90` + `AuthModal.tsx:60-66` |
| 8.1 | حالة الجلسة منسوخة في مصدرين (useAppState سابقاً + useAuth) حسب `LOGIC_GAPS` فقرة 8 | `LOGIC_GAPS.md:58-60` |

### 1.2 البنية المستهدفة

```
src/lib/auth/
  credentials.ts     // hashCredential / verifyCredential / isUpgradable (ترقية salt فردي)
  session.ts         // createSession / validateSession (انتهاء صلاحية + ربط باسم المكتب)
  AuthProvider.tsx   // Context واحد: session, role, loginAsEmployee, loginAsAdmin, logout, createOffice
src/components/auth/
  EmployeeLoginForm.tsx   // نموذج موظف قابل لإعادة الاستخدام
  AdminLoginForm.tsx      // نموذج مدير قابل لإعادة الاستخدام
  SyncCodePill.tsx        // شارة رمز المزامنة + زر النسخ (مشتركة بين LandingPage و AuthModal)
```

**منطق `credentials.ts` الاحترافي:**
- صيغة التخزين الجديدة: `sha256$<salt>$<hashHex>` حيث salt عشوائي فردي لكل رقم سري.
- `verifyCredential(stored, input)`:
  - صيغة قديمة (plain نصي) → مقارنة مباشرة + `isUpgradable=true` لترقية صامتة عند أول نجاح.
  - صيغة `sha256$salt$hash` → `hash = sha256(salt + input)`.
  - أي صيغة أخرى → `false`.
- `hashCredential(input)` يولّد salt جديداً دائماً (لا يعيد استخدام قديم).

**منطق `session.ts`:**
- `createSession({ role, officeName, employeeId?, employeeName? })` يضيف `issuedAt` و `expiresAt` (افتراضي 12 ساعة للمدير، نهاية اليوم للموظف).
- `validateSession(session, settings)` يتحقق من: وجود الجلسة، تطابق `officeName`، وعدم تجاوز `expiresAt`.
- عند الانتهاء أو التعارض → `clearSession()` وإرجاع المستخدم إلى LandingPage.
- إعادة المصادقة: الدخول إلى صفحات المدير بعد جلسة خاملة (> 4 ساعات) يتطلب إعادة إدخال الرقم السري.

**الترقية الآمنة (تجنّب الكسر):**
- عند أول تسجيل دخول ناجح بصيغة قديمة: `hashCredential(input)` ثم حفظ القيمة الجديدة للـ admin/employee عبر IPC واحد.
- لا تُمسّ البيانات القديمة قبل التحقق الناجح.

### 1.3 الإجراءات

1. إنشاء `src/lib/auth/credentials.ts` و `src/lib/auth/session.ts` ونقل المنطق من `useAuth.ts`.
2. تحويل `useAuth` إلى `AuthProvider` (Context) كـ "use client" leaf، يُستهلك عبر `useAuthContext()`.
3. بناء `EmployeeLoginForm` / `AdminLoginForm` وتشغيلهما في LandingPage و AuthModal (حذف ~300 سطر مكرر ودمج مفاتيح i18n المتطابقة مثل `errWrongEmployeePin`/`lpErrWrongPin`).
4. إزالة فحص `officeName` الوحيد من `App.tsx:111-118` واستبداله بـ `validateSession()` من session.ts.
5. إيقاف حفظ قائمة الموظفين كاملة عند تسجيل الدخول؛ الترقية تحفظ عبر `saveEmployee` الفردي (مع إصلاح delete في Electron حسب `LOGIC_GAPS` فقرة 2).

---

## 2. المكوّن الثاني: تسجيل مكتب جديد (Office Registration)

### 2.1 الوضع الحالي والمشاكل

| # | المشكلة | الموقع |
|---|---------|--------|
| 1.2 | 8 متغيرات حالة مسطّحة لموظفين اثنين فقط، ولا يمكن إضافة ثالث | `LandingPage.tsx:58-64` و `:553-594` |
| 2.2 | أسماء مستخدمين مرمّزة `emp1` / `emp2` (لا تُشتق من الاسم ولا فحص للفردية) | `LandingPage.tsx:166-173` |
| 3.2 | التحقق من وجود النص فقط؛ لا حد أدنى لطول الرقم السري ولا صيغة لرقم الترخيص | `LandingPage.tsx:149-157` |
| 4.2 | حقل الرقم السري للمدير هو `type="text"` وبدون حقل تأكيد | `LandingPage.tsx:538-545` |
| 5.2 | `handleCreateNewOffice` يمسح كل بيانات أي مكتب سابق قبل الحفظ، بلا أي تأكيد، وإن فشل الحفظ تضيع البيانات بلا عودة | `useAuth.ts:135-136` |
| 6.2 | عند فشل الإنشاء لا تعرف الواجهة ذلك، فيظهر Toast نجاح بشكل غير مشروط | `LandingPage.tsx:159-177` |

### 2.2 البنية المستهدفة

```
src/lib/auth/registration.ts
  validateOfficeRegistration(data) -> { ok, errors: Record<field,string>, values? }
src/components/auth/OfficeRegistrationForm.tsx   // بديل تبويب register
src/lib/office-registration.ts                   // createNewOffice(data) -> { ok, error? }
```

**النوع القياسي للإدخال:**
```ts
export interface OfficeRegistrationInput {
  officeName: string;
  licenseNumber: string;
  adminPin: string;
  adminPinConfirm: string;
  employees: Array<{ name: string; username: string; pin: string }>;
}
```

**منطق التحقق (منطق احترافي):**
- `officeName`: مطلوب، 3-40 حرفاً، بدون أصفار قيادية.
- `licenseNumber`: اختياري لكن إن وُجد فبصيغة `^\d{8,12}$` (وفق النمط الحالي `1010XXXXXX`).
- `adminPin`: مطلوب 4-8 أرقام، ويجب أن يطابق `adminPinConfirm`.
- الموظفون: قائمة ديناميكية (إضافة/إزالة صف)، كل صف يتطلب `name` و `pin` (4-8 أرقام)،
  و`username` يُقترح تلقائياً من الاسم (بالإنجليزية/transliteration أو `empN`) مع فحص فريدية داخل القائمة.
- إرجاع خريطة أخطاء حقلية لعرضها تحت كل حقل (وليس رسالة عامة واحدة).

**منطق الإنشاء (`createNewOffice`):**
1. تحقق كامل أولاً، وأي خطأ → `{ ok: false, error }` بلا أي مسح للبيانات.
2. تشفير `adminPin` عبر `hashCredential` فوراً (لا انتظار حفظ لاحق).
3. تشفير أرقام الموظفين، وتوليد `networkSyncCode` عبر `generateSyncCode()`.
4. المسح الضوئي للمكتب السابق ثم الحفظ داخل تسلسل واحد؛ أي فشل → `{ ok: false, error }` يعرضه الـ UI.
5. عند النجاح → `{ ok: true }` ورسالة نجاح واحدة فقط.

**واجهة الاستهلاك:** `LandingPage` تستخدم `OfficeRegistrationForm` (مع إزالة متغيرات الحالة المسطحة)،
و`useAuth.handleCreateNewOffice` يستبدل بنداء `createNewOffice` مع إرجاع النتيجة للواجهة.

---

## 3. المكوّن الثالث: ربط الشبكة (LAN/P2P Sync)

### 3.1 الوضع الحالي والمشاكل

| # | المشكلة | الموقع |
|---|---------|--------|
| 1.3 | `joinPending` متغير عام واحد: إن انضم الجهاز بكود خاطئ ولم تصل لقطة أبداً يبقى `joinPending=true` للأبد، فلا يدفع الجهاز بياناته لاحقاً حتى بعد وضع كود صحيح | `main.js:78, 298, 712-713` |
| 2.3 | `machineId = hostname + random` غير محفوظ؛ يتغير عند كل إطلاق، فيكسر قاعدة المصافحة (المعرّف الأصغر يبادر) ويترك أقراناً مكررين | `main.js:69-75, 378-382` |
| 3.3 | `handleJoinLAN` لا يتحقق من صيغة الكود ولا يعيد نتيجة الفشل، وLandingPage تعرض نجاحاً غير مشروط | `App.tsx:226-241` + `LandingPage.tsx:181-190` |
| 4.3 | ضبط الكود مرتين: `syncJoin` (syncSetState) ثم `updateSettings` → `db:saveSettings` → `syncSetCode`؛ ترتيب سباقي غير محسوم | `App.tsx:230-240` + `main.js:638-650, 712-724` |
| 5.3 | اللقطة = نسخة كاملة من قاعدة البيانات تُرسل عبر WebSocket بلا حد لحجمها ولا إصدار بروتوكول ولا دمج تعارضات؛ آخر كاتب يمسح ما كتبه الآخر | `main.js:133-142, 163-202` |
| 6.3 | لا ping/pong للصحة؛ الأقران الميّتون يبقون في القوائم حتى الخطأ التالي | `main.js:247-252` |
| 7.3 | `broadcastHello` كل 5 ثوانٍ بلا jitter/backoff؛ إغراق UDP عند عدة أجهزة | `main.js:367-371` |
| 8.3 | كود المزامنة هو السر الوحيد ويُبثّ في `hello` نصياً، والبيانات الكاملة (بما فيها رقم الترخيص والمتوسطات) تُرسل لأي جهاز يعرف الكود، بلا تشفير | `main.js:333-364` |

### 3.2 البنية المستهدفة

**في main process:** استخراج منطق الشبكة إلى وحدة `electron/sync-engine.js` (بدل الدوال المبعثرة في main.js)،
مع استدعاء IPC واحد `db:syncJoin` و `db:syncGetState` فقط.

**آلة حالات الانضمام (بدل `joinPending` العام):**
```
idle ──syncJoin(code)──► joining(code, startedAt)
                           │
        snapshot ورد بنجاح  │  مهلة 15 ثانية بلا لقطة
        ▼                  ▼
     joined(code)      failed(code, "timeout")  → يعود إلى idle
```
- عند أي `syncSetCode` جديد: إعادة ضبط الحالة إلى `idle` ثم `joining` حسب السياق.
- `failed` تُرسل إلى الـ renderer كحدث `sync:join-result` وتُعرض في LandingPage.

**معرّف جهاز محفوظ:**
- `getMachineId()` يقرأ `deviceId` من جدول settings؛ إن لم يوجد يولّده (12 حرفاً عشوائياً) ويحفظه.
- لا يتغير عند إعادة الإطلاق → استقرار المصافحة والقوائم.

**مصافحة وإصدار بروتوكول:**
- رسالة `hello` تحمل `{ version: 1 }`؛ أي جهاز بإصدار مختلف يُرفض برسالة سبب واضحة.
- حد لحجم اللقطة (افتراضي 5MB)؛ أكبر من ذلك → رفض مع `join-result` واضح بدل نقل نصف الهوية.

**دمج التعارضات (لقطة بأحدث-معدّل):**
- كل صف يكتسب `updatedAt` (يضاف عند التخزين إن غاب).
- عند تطبيق اللقطة: لكل جدول يُستخدم `INSERT OR REPLACE` بالصف، لكن مع مقارنة `updatedAt`:
  صف محلي أحدث → يُحتفظ به ولا يُستبدل. الهدف: منع مسح صف سُجّل محلياً أثناء الانقطاع.
- يبقى السلوك الحالي (مسح كامل ثم إدراج) لمرحلة "الانضمام" فقط (تبنّي بيانات المكتب المضيف)،
  ويتحول إلى دمج لاحقاً بعد النجاح.

**صحة الاتصال:**
- ping/pong كل 10 ثوانٍ لكل قرين؛ من لا يستجيب في مهلة 30 ثانية يُزال.

**الأمان (مرحلة لاحقة، لا تكسر الحالي):**
- تشفير متماثل على قناة WebSocket بمفتاح مشتق من كود المزامنة (XOR/تعميق بسيط أو `crypto.createCipheriv`) مع `version` يحفظ التوافق.
- خيارياً: تقييد الرد على `officecash-hello` لعدم الإفصاح عن وجود جهاز في غير شبكة المكتب.

### 3.3 واجهة الـ renderer

- `useP2PSync` يضيف حدث `joinResult` ويحوّل `handleJoinLAN` في `App.tsx` إلى:
  ```
  1) تحقق من صيغة الكود: /^P2P-[A-Z0-9]{4}-[A-Z0-9]{4}$/i
  2) syncJoin(code) → { ok, error? } (من خلال ipcMain.handle، وليس ipcMain.on)
  3) عند ok فقط: حفظ networkSyncCode في الإعدادات وتحديث الحالة
  4) عند فشل: عرض رسالة الخطأ i18n من JoinResult، بلا Toast نجاح
  ```

---

## 4. الأولويات وترتيب التنفيذ

### المرحلة 1: أساس مصادقة آمن (بدون تغيير واجهة)
- [x] `src/lib/auth/credentials.ts` (salt فردي + ترقية صامتة).
- [x] `src/lib/auth/session.ts` + استبدال فحص `App.tsx:111-118`.
- [x] إيقاف كتابة قائمة الموظفين كاملة عند تسجيل الدخول.

### المرحلة 2: توحيد واجهات تسجيل الدخول
- [x] `EmployeeLoginForm` / `AdminLoginForm` واستخدامها في LandingPage و AuthModal.
- [x] تحويل `useAuth` إلى `AuthProvider` Context ودمج مفاتيح i18n المكررة.

### المرحلة 3: تسجيل المكتب الاحترافي
- [x] `registration.ts` (نوع + تحقق) و `OfficeRegistrationForm` (قائمة موظفين ديناميكية + تأكيد كلمة المرور).
- [x] `createNewOffice` يعيد `{ ok, error }` ويتحقق قبل أي مسح بيانات.

### المرحلة 4: ربط الشبكة الصلب
- [x] `sync-engine.js` + machineId محفوظ + آلة حالات join + مهلة.
- [x] تحقق صيغة الكود في الواجهة و `join-result` حقيقي.
- [x] دمج `updatedAt` + حد حجم اللقطة + ping/pong.
- [ ] تشفير القناة (مرحلة تحسين لاحقة).

### اختبارات التحقق بعد كل مرحلة
- `npm run build` و `npm run lint` (راجع `package.json`).
- تسجيل دخول مدير وموظف من LandingPage ومن AuthModal بنتائج متطابقة.
- ترقية رقم سري قديم (نصي) إلى hash عند أول تسجيل دخول، ويعمل بعد إعادة التشغيل.
- إنشاء مكتب بموظفين 0 و 3 و 5؛ رفض إدخال غير صالح مع رسائل حقلية.
- انضمام جهازين بكود صحيح → مزامنة خلال ثوانٍ؛ كود خاطئ → رسالة فشل وخلال 15 ثانية يمكن الانضمام بكود صحيح.
- إعادة تشغيل الجهاز المنضم → يبقى المعرّف ثابتاً ولا تتكرر الأقران.

---

## 5. مخاطر الانحدار (Regressions) يجب مراقبتها

- **ترقية الـ hash**: أي خطأ في ترتيب (تحقق ثم حفظ) يجعل PINs القديمة غير قابلة للدخول. الاختبار إلزامي قبل الشحن.
- **دمج التعارضات**: تغيير "مسح ثم إدراج" إلى دمج `updatedAt` قد يبقي صفوفاً محلية قديمة لدى الانضمام لأول مرة؛ لذلك يبقى المسح الكامل حصرياً لمرحلة الـ join.
- **المزامنة المزدوجة للكود**: توحيد `syncJoin` كمسار واحد يمنع حالة ينضم فيها الجهاز ويفشل الحفظ فيبقى نصف-منضم.
- **ملفات التكوين**: لا تُغيّر أسماء حقول النماذج الحالية التي يعتمد عليها الـ autofill/التحليلات (`loginTime`, `networkSyncCode`).
