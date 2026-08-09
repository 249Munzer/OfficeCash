# OfficeCash — خطة عمل التعديلات المعتمدة (الأمان والاسترداد وتسجيل المكتب)

## نطاق العمل — 4 تعديلات معتمدة

1. **استرداد كلمة مرور المدير** عبر أسئلة أمان من بوابة تسجيل الدخول (المدير لا يملك حالياً أي وسيلة لاستعادة رمزه المنسي — قاعدة بيانات محلية 100%).
2. **إعادة تصميم إنشاء مكتب جديد**: بدون إنشاء حسابات موظفين، تعبئة كامل بيانات المكتب الموجودة في الإعدادات، اختيار **سؤالَي أمان كحد أدنى من أصل 10** أسئلة معرّفة، وجعل **الموافقة على السياسة والخصوصية وشروط الخدمة شرطاً** لإنشاء الحساب.
3. **زر تسجيل خروج واضح للمدير** في الإعدادات أسفل بطاقة «منطقة الخطر»، مع ضمان أن **أول صفحة يراها المدير بعد الدخول هي لوحة التحكم دائماً** (سواء خرج من نافذة تبديل الوضع أو من الإعدادات).
4. **توحيد النوافذ المنبثقة للتبديل بين الإدارة والموظفين**: عند التبديل من لوحة/بوابة الموظف يُعتمد فقط النافذة المنبثقة الثانية (AuthModal) دون تريكب نوافذ فوق بعضها.

---

## قواعد أساسية (ملزمة)

1. **لا إضافة أي مكتبة جديدة** — نعتمد فقط على الموجود: `motion`، `lucide-react`، Tailwind v4، Web Crypto API.
2. **i18n إلزامي**: أي مفتاح ترجمة جديد يُضاف **في القسمين `ar` و `en` معاً** (اختبار `i18n.test.ts` يفرض تطابق المفاتيح). لا نصوص صريحة في المكونات.
3. **عدم كسر الاختبارات الحالية**:
   - `SettingsManager.test.tsx` → لا نحذف أي عنصر يعتمد عليه (أزرار `dangerDeleteDataBtn`، `editInfoBtn`، الخ).
   - `EmployeePortal.test.tsx` → إجماليات البطاقات وفلترة المعاملات تبقى كما هي.
   - `Dashboard.test.tsx` / `ReportsScreen.test.tsx` / `printcss.test.tsx` → دون مساس.
4. الحفاظ على RTL + الوضع الفاتح/الليلي + احترام `prefers-reduced-motion`.
5. التحقق بعد كل مرحلة: `npm run lint` ثم `npm run test` ثم `npm run build`.
6. لا مساس بمنطق المصادقة الحالي (اشتراك الجلسة، الترقية الصامتة لـ PIN، انتهاء الصلاحية) — التعديلات إضافية.

---

## نموذج البيانات (مقدمة)

### 1) أسئلة الأمان — `src/types.ts`
- إضافة نوع جديد:
  ```ts
  export interface SecurityQuestionAnswer {
    questionId: string;      // مفتاح السؤال من قائمة الأسئلة العشرة
    answerHash: string;      // sha256$salt$hash لـ normalize(answer)
  }
  ```
- إضافة حقل اختياري في `OfficeSettings`:
  ```ts
  securityQuestions?: SecurityQuestionAnswer[];
  ```
  > يُخزَّن داخل `settings` فيُنقل تلقائياً مع النسخ الاحتياطي ومزامنة LAN (بلا تغيير في `electron-storage` أو `sync-engine`).

### 2) تسجيل المكتب — `src/lib/auth/registration.ts`
- إعادة تعريف `OfficeRegistrationInput`:
  ```ts
  export interface OfficeRegistrationInput {
    officeName: string;
    licenseNumber: string;
    phone: string;
    address: string;
    currency: string;
    taxNumber: string;
    adminPin: string;
    adminPinConfirm: string;
    securityQuestions: Array<{ questionId: string; answer: string }>;
    acceptedTerms: boolean;   // الموافقة على السياسة/الخصوصية/شروط الخدمة
  }
  ```
- حذف `EmployeeSetupInput` وجميع دوال/تحققات الموظفين من هذا الملف.

---

## المهمة 1 — استرداد كلمة مرور المدير عبر أسئلة الأمان

### 1.1 قائمة الأسئلة والدوال النقية — ملف جديد `src/lib/auth/securityQuestions.ts`
- تصدير ثابت `SECURITY_QUESTIONS` فيه **10 أسئلة** لكل منها `id` ثابت (مثل `sq_01`…`sq_10`) ونص عربي وإنجليزي. أمثلة مقترحة:
  1. اسم أول معلم لديك؟
  2. اسم مدينتك المفضلة؟
  3. اسم حيوانك الأليف الأول؟
  4. اسم أقرب صديق في الطفولة؟
  5. اسم والدتك قبل الزواج؟
  6. اسم مدرستك الابتدائية؟
  7. ما هو طبقك المفضل؟
  8. اسم أول فيلم شاهدته؟
  9. رقم منزلك في الطفولة؟
  10. اسم أول مشرف لك في العمل؟
- `normalizeAnswer(answer)`: `trim().toLowerCase()` (تطبيع قبل الهاش والتحقق).
- `hashAnswer(answer)`: `hashCredential(normalizeAnswer(answer))` (إعادة استخدام `lib/auth/credentials.ts`).
- `verifyAnswer(storedHash, answer)`: `verifyCredential(storedHash, normalizeAnswer(answer))`.
- `pickQuestions(count)` / `isValidQuestionSet(questions)`: تكرار الأسئلة ومنع نفس السؤال مرتين.
- دوال استرداد نقيّة قابلة للاختبار:
  - `canAttemptRecovery(attemptState)` و `recordFailedAttempt(attemptState)` للحد من المحاولات (5 محاولات ثم إغلاق النافذة/مهلة 5 دقائق).
- **ملف اختبار جديد** `src/lib/auth/securityQuestions.test.ts`:
  - القائمة 10 أسئلة بنصوص عربية وإنجليزية.
  - تطبيع الإجابة (مسافات/حالة الأحرف).
  - hash/verify دائرية، وفشل الإجابة الخاطئة.
  - رفض تكرار نفس السؤال.

### 1.2 مودال الاسترداد — ملف جديد `src/components/auth/ForgotPasswordModal.tsx`
- نافذة منبثقة (نمط `AuthModal`/`LegalModal` مع `motion` + `AnimatePresence`).
- **الخطوة 1 — التحقق**: عرض أسئلة الأمان المحفوظة في `settings.securityQuestions` (سؤال + حقل إجابة لكل سؤال). عند الإرسال يتحقق من كل إجابة بـ `verifyAnswer`.
  - خطأ عام غير محدّد عند أي إجابة خاطئة (لا نكشف أي سؤال صحيح) + عداد محاولات.
  - عند تجاوز المحاولات: رسالة «جرب لاحقاً» وإغلاق المودال.
  - إذا لم يوجد `securityQuestions` محفوظة → رسالة «لم تُعرَّف أسئلة أمان لهذا المكتب» وزر إغلاق فقط.
- **الخطوة 2 — إعادة التعيين**: تعيين PIN جديد + تأكيد مع التحقق بـ `isValidSetupPin` (من `registration.ts`). عند النجاح حفظ `adminPasswordPin: hashCredential(newPin)` عبر `saveSettings`.
- ناجح → رسالة نجاح (toast) وإغلاق المودال، ثم يعود المستخدم لكتابة الرمز الجديد في نموذج الدخول.

### 1.3 ربط النموذج — `src/components/auth/AdminLoginForm.tsx`
- إضافة رابط «نسيت كلمة المرور؟» أسفل حقل الرمز (ظاهر دائماً، أو معطّل مع تلميح إذا لم توجد أسئلة أمان).
- استقبال بروب جديد `onForgotPassword?: () => void` (لفتح المودال من مستوى أعلى) أو استقبال `settings` لإدارة الفتح داخلياً.
- فتح `ForgotPasswordModal` وتمرير `settings` + `language` + `onResetAdminPin(pin)`.

### 1.4 استقبال في الطبقة الأعلى
- `AuthProvider` → إضافة دالة `resetAdminPin(newPin)` تتحقق من القوة ثم تحفظ `saveSettings({...settings, adminPasswordPin: hashCredential(newPin)})` وتعيد النتيجة.
- `AuthModal.tsx` و `LandingPage.tsx` → تمرير المعالجات اللازمة لـ `AdminLoginForm` (بما أن `AdminLoginForm` يُستخدم في الموقعين).

### 1.5 i18n — `src/lib/i18n.ts`
- مفاتيح جديدة بالعربية والإنجليزية: عنوان/وصف المودال، «نسيت كلمة المرور؟»، تسميات الخطوتين، أخطاء الإجابة، رسالة «لا توجد أسئلة أمان»، عداد المحاولات، نصوص نجاح/فشل إعادة التعيين.

### 1.6 معايير القبول
- دخول المدير الخاطئ ثم «نسيت كلمة المرور» → إجابة صحيحة للأسئلة → تعيين PIN جديد → الدخول به بنجاح.
- إجابة خاطئة → رسالة خطأ دون كشف السؤال الصحيح، وتوقف بعد 5 محاولات.
- مكتب بلا أسئلة أمان → الرابط يظهر مع تلميح أو رسالة توضح عدم التفعيل.

---

## المهمة 2 — إعادة تصميم إنشاء مكتب جديد

### 2.1 التحقق — `src/lib/auth/registration.ts`
- حذف كود الموظفين من `validateOfficeRegistration` واستبداله بالتحقق من:
  - `phone`: `validatePhone` (اختياري، صيغة صحيحة إن وُجد).
  - `currency`: مطلوب وغير فارغ.
  - `taxNumber`: نص حر اختياري.
  - `securityQuestions`: **اثنان على الأقل**، بأسئلة مختلفة (لا تكرار)، وإجابات غير فارغة لكل منها.
  - `acceptedTerms`: **يجب أن يكون `true`** وإلا `errors.acceptedTerms = 'required'`.
  - إبقاء تحقق `officeName`، `licenseNumber`، `adminPin`، `adminPinConfirm` كما هو.

### 2.2 إعادة كتابة الفورم — `src/components/auth/OfficeRegistrationForm.tsx`
- **حذف** قسم الموظفين الأوليين بالكامل (emp1/emp2) والمنطق المرتبط.
- إضافة الحقول التالية (بنفس نمط حقول `SettingsManager`):
  - معلومات المكتب: اسم المكتب، رقم الرخصة/السجل، الرقم الضريبي، الهاتف، العنوان، العملة.
  - PIN المدير + التأكيد.
  - **أسئلة الأمان**: عرض الأسئلة العشرة (من `SECURITY_QUESTIONS`) باختيار سؤال من قائمة منسدلة + حقل إجابة لكل سؤال. واجهة بسيطة: «سؤال 1» + «سؤال 2» وزر «إضافة سؤال» حتى 5، مع منع اختيار سؤال مكرر وتحذير بعدم اكتمال الحد الأدنى (2).
  - **الموافقة القانونية**: خانة اختيار إلزامية نصها «أوافق على سياسة الخصوصية وشروط الخدمة» مع رابطين نصيين يفتحان `LegalModal` (`privacy` / `terms`) داخل نفس الشاشة. لا يُفعَّل زر الإرسال (أو يُرفض) بدون الموافقة.

### 2.3 منطق الإنشاء — `src/auth/AuthProvider.tsx` (`createOffice`)
- بناء `newSettings` من كل حقول الإدخال:
  ```ts
  const newSettings: OfficeSettings = {
    officeName, licenseNumber, phone, address, taxNumber, currency,
    adminPasswordPin: await hashCredential(data.adminPin),
    networkSyncCode: generateSyncCode(),
    theme: 'light', language: 'ar',
    autoLockClosedDays: true, soundEffects: true,
    securityQuestions: await Promise.all(
      data.securityQuestions.map(async (q) => ({
        questionId: q.questionId,
        answerHash: await hashAnswer(q.answer),
      }))
    ),
  };
  ```
- **حذف** حلقة إنشاء الموظفين (`employeesToSave`) وحفظ الموظفين من إنشاء المكتب.

### 2.4 الاختبارات — `src/lib/auth/registration.test.ts`
- إعادة كتابة حالات الموظفين (name/username/pin/taken) إلى حالات جديدة:
  - ينجح ببيانات صحيحة كاملة (اسم، ترخيص، PIN، عملة، سؤالان مختلفان بإجابات، موافقة `true`).
  - يرفض أقل من سؤالَي أمان.
  - يرفض تكرار نفس السؤال.
  - يرفض إجابة فارغة لأحد الأسئلة.
  - يرفض `acceptedTerms: false`.
  - يرفض هاتفاً بصيغة خاطئة.
  - التحقق القديم لاسم المكتب/الترخيص/PIN يُبقي حالات نجاحه/فشله.
- إضافة/تعديل أي اختبار في `SettingsManager`/`LandingPage` يعتمد على فورم التسجيل القديم.

### 2.5 i18n
- إزالة مفاتيح الموظفين غير المستخدمة (`initialEmpTitle`, `firstEmpNameLabel`, `firstEmpPinLabel`, `secondEmpNameLabel`, `secondEmpPinLabel`, `regEmpUsernameLabel`, `regErrNameRequired`, `regErrUsernameInvalid`, `regErrUsernameTaken`, `defaultEmp1Name`, `defaultEmp2Name`) من القسمين معاً.
- إضافة مفاتيح جديدة: تسميات حقول المكتب الكاملة (هاتف/عنوان/عملة/رقم ضريبي)، قسم أسئلة الأمان، تسميات الاختيار/الإجابة، «إضافة سؤال»، رسائل أخطاء الأسئلة، نص الموافقة القانونية، وأي نصوص إرشادية.

### 2.6 معايير القبول
- تسجيل مكتب جديد ببيانات كاملة + سؤالين أمان + موافقة → يُنشأ المكتب ويظهر محذوفاً من الموظفين (قائمة موظفين فارغة).
- محاولة إنشاء بدون موافقة أو بسؤال واحد → رسائل تحقق واضحة وعدم إنشاء المكتب.
- تظهر البيانات المدخلة في صفحة الإعدادات بعد الإنشاء.

---

## المهمة 3 — زر تسجيل الخروج في الإعدادات + الدخول يبدأ بلوحة التحكم

### 3.1 إضافة الزر — `src/components/SettingsManager.tsx`
- إضافة بروب جديد `onLogout: () => void` (اختياري للتوافق مع الاختبارات الحالية).
- **أسفل بطاقة «منطقة الخطر»** (في عمود System Panel) إضافة بطاقة/زر مستقلة:
  - نمط هادئ ثم تحويم بخطر: أيقونة `LogOut` + نص «تسجيل الخروج».
  - يظهر للمدير فقط (هذه الشاشة تخص المدير أصلاً).
- **لا** يُدمج مع أزرار الحذف/المسح (لا يتطلب تأكيداً، فهو خروج آمن وليس حذف بيانات).

### 3.2 الربط — `src/App.tsx`
- تمرير `onLogout={handleLogout}` إلى `SettingsManager`.
- في `handleLoginAsAdminWrapper` بعد نجاح الدخول: `setCurrentView('dashboard')` — يغطي الدخول من `LandingPage` ومن `AuthModal` (كلاهما يمر عبر نفس الـ wrapper).
- (احتياطي) في `handleLogout` أو في دالة الخروج داخل `AuthProvider`: إعادة `currentView` إلى `'dashboard'` بعد نجاح الخروج، لضمان بداية نظيفة لأي دخول لاحق حتى قبل تنفيذ wrapper.
- التأكد من أن استعادة الجلسة المخزنة للمدير عند إعادة فتح التطبيق تبدأ من `dashboard` (الافتراضي الحالي في `useNavigation` كافٍ؛ لا نحتاج قوة إجبارية إضافية للموظف الموجود).

### 3.3 i18n
- مفاتيح جديدة: «تسجيل الخروج» بنمط منطقة آمنة (عنوان/وصف/زر) بالعربية والإنجليزية.

### 3.4 الاختبارات — `src/components/SettingsManager.test.tsx`
- إضافة حالة: الزر يظهر في الإعدادات، والنقر عليه يستدعي `onLogout` مرة واحدة دون فتح أي مودال تأكيد.

### 3.5 معايير القبول
- زر خروج ظاهر في الإعدادات أسفل منطقة الخطر.
- خروج المدير من الإعدادات → العودة لشاشة الدخول → الدخول مجدداً → لوحة التحكم أولاً.
- خروج المدير من نافذة تبديل الوضع (بوابة الموظف) → الدخول مجدداً → لوحة التحكم أولاً.

---

## المهمة 4 — توحيد نوافذ التبديل بين الإدارة والموظفين

### الوضع الحالي (المشكلة)
- في بوابة الموظف يوجد زر «تبديل الحساب / الإدارة» يفتح **النافذة الأولى** (Switcher Modal داخل `EmployeePortal`) وفيها زر «التبديل للإدارة» الذي يستدعي `onSwitchToAdmin` فيفتح **النافذة الثانية** (`AuthModal`) فوقها → **نافذتان متتاكبتان**.

### 4.1 `src/components/EmployeePortal.tsx`
- «التبديل للإدارة»: عند النقر يُغلق الـ Switcher Modal أولاً (`setShowEmployeeSwitcherModal(false)`) ثم يُستدعى `onSwitchToAdmin()` — بحيث لا يبقى إلا `AuthModal` مفتوحاً.
- إبقاء Switcher Modal للتبديل بين حسابات الموظفين فقط (وظيفته الأصلية).
- (اختياري محسّن) زر «الإدارة» منفصل في شريط البانر يفتح `AuthModal` مباشرة بتبويب المدير.

### 4.2 `src/components/AuthModal.tsx`
- إضافة بروب اختياري `initialTab?: 'employee' | 'admin'` ليفتح على التبويب المناسب (عند طلب التبديل للإدارة → `'admin'`).
- لا تغيير في منطق الدخول (تحقق PIN للمدير/الموظف كما هو).

### 4.3 `src/App.tsx`
- عند تمرير `onSwitchToAdmin` إلى `EmployeePortal`: للموظف → فتح `AuthModal` بتبويب المدير؛ للمدير → `setCurrentView('dashboard')` (كما هو قائم، مع إضافة `initialTab` حيثما يناسب).

### 4.4 i18n
- مفاتيح جديدة فقط إن لزم (مثل «الإدارة»/وصف الزر) بالعربية والإنجليزية.

### 4.5 معايير القبول
- من بوابة الموظف: «التبديل للإدارة» → تظهر نافذة واحدة فقط (`AuthModal`) بتبويب المدير.
- لا توجد نافذتان مفتوحتان معاً في أي مسار تبديل (موظف→مدير، مدير→موظف، تبديل موظف آخر).

---

## ترتيب التنفيذ والاعتماديات

1. **المهمة 2 أولاً** (يحدد شكل `OfficeSettings.securityQuestions` ونماذج الإدخال) ثم **المهمة 1** (تعتمد على نفس الحقل في `settings` للاسترداد).
2. **المهمة 3** مستقلة تقريباً (زر + سلوك تنقل) — تُنفَّذ بعد اكتمال i18n الجديد لتجنّب تعارض المفاتيح.
3. **المهمة 4** مستقلة — يمكن تنفيذها بالتوازي مع 3.

---

## الاختبارات والتحقق

### وحدات/مكونات جديدة
- `src/lib/auth/securityQuestions.test.ts` — القائمة، التطبيع، hash/verify، عدّاد المحاولات.
- حالات جديدة في `registration.test.ts` — نموذج التسجيل الجديد.
- حالات جديدة في `SettingsManager.test.tsx` — زر الخروج.

### خطوات التحقق النهائية
1. `npm run lint` (tsc --noEmit) بلا أخطاء.
2. `npm run test` — كل الاختبارات خضراء (بما فيها تطابق مفاتيح i18n).
3. `npm run build` ينجح دون تحذيرات chunk.
4. فحص يدوي (فاتح/ليلي، RTL/EN):
   - تسجيل مكتب جديد كامل → قائمة موظفين فارغة، البيانات في الإعدادات.
   - استرداد رمز المدير بأسئلة الأمان → تعيين جديد → دخول ناجح؛ وإجابة خاطئة تمنع.
   - زر خروج المدير في الإعدادات + الدخول يعود للوحة التحكم.
   - تبديل مدير↔موظف بنافذة واحدة فقط.
   - نسخ احتياطي/استعادة تحمل أسئلة الأمان.
5. إعادة بناء المثبّت `npm run electron:build` بعد موافقتك فقط.

---

## الملفات المتأثرة
`src/types.ts`, `src/lib/auth/registration.ts`, `src/lib/auth/registration.test.ts`,
`src/lib/auth/securityQuestions.ts` (جديد), `src/lib/auth/securityQuestions.test.ts` (جديد),
`src/components/auth/ForgotPasswordModal.tsx` (جديد),
`src/components/auth/OfficeRegistrationForm.tsx`, `src/components/auth/AdminLoginForm.tsx`,
`src/components/AuthModal.tsx`, `src/auth/AuthProvider.tsx`, `src/components/EmployeePortal.tsx`,
`src/components/SettingsManager.tsx`, `src/components/SettingsManager.test.tsx`, `src/App.tsx`,
`src/lib/i18n.ts` (مفاتيح AR/EN جديدة + إزالة مفاتيح الموظفين البائدة).

---

# المهمة 5 — معالج التثبيت وإلغاء التثبيت الاحترافي (NSIS Wizard)

> مرجع تفصيلي: `docs/INSTALLER_UNINSTALLER_WORK_PLAN.md`

## نطاق العمل

تحويل شاشة التثبيت/إلغاء التثبيت الحالية (one-click بلا خطوات) إلى **معالج خطوات واضح**:
نبذة عن التطبيق ← الشروط والأحكام (إجبارية) ← اختيار مكان التثبيت ← شريط التقدم ← الإنهاء،
ومعالج إلغاء يحمي **بيانات المكتب المالية** (`office_cash.db` في `userData`).

## قواعد أساسية

1. **بيانات المكتب لا تُحذف عند الإلغاء افتراضياً** (`deleteAppDataOnUninstall: false` + منطق مخصص).
2. معالج **ثنائي اللغة** (عربي/إنجليزي) حسب لغة نظام التشغيل.
3. تثبيت لكل مستخدم (per-user) افتراضياً لتجنّب طلب صلاحيات المسؤول.
4. ترقية بلا كسر: إبقاء `appId` ثابتاً وعدم تغييره مستقبلاً (يكسر الترقية الصامتة).
5. لا إضافة مكتبات — كلها خيارات/سكربتات electron-builder و NSIS.

## الوضع الحالي (المشكلة)

| # | العنصر | الحالي | المطلوب |
|---|--------|--------|---------|
| 1 | نوع المثبّت | `nsis` (one-click) + `portable` | معالج (assisted) |
| 2 | خطوات التثبيت | شاشة واحدة | ترحيب → ترخيص → مسار → تقدم → إنهاء |
| 3 | الشروط والأحكام | غير معروضة | صفحة إجبارية |
| 4 | اختيار مكان التثبيت | غير ممكن | صفحة مسار قابلة للتغيير |
| 5 | اللغات | إنجليزي فقط | عربي/إنجليزي |
| 6 | معالج الإلغاء | افتراضي | تأكيد + خيار «احتفظ بالبيانات» |

## التطبيق التقني

### 5.1 ملفات جديدة (`installer/`)
- [x] `installer/license_ar.txt` — الشروط والأحكام بالعربية.
- [x] `installer/license_en.txt` — الشروط والأحكام بالإنجليزية.
- [x] `installer/installer.nsh` — تخصيص NSIS (نص الترحيب + صفحة الإلغاء + حماية البيانات).
- [x] (اختياري) `installer/installerSidebar.bmp` — صورة جانبية 164×314 من الهوية البصرية.

### 5.2 تعديل `package.json` (قسم `build`)
- [x] `"productName": "OfficeCash"` في **أعلى** `package.json` حتى يصبح `userData` = `%APPDATA%\OfficeCash` (نظيف ومستقر).
- [x] ضبط `build.nsis`:
  ```jsonc
  "nsis": {
    "oneClick": false,
    "allowToChangeInstallationDirectory": true,
    "perMachine": false,
    "license": "installer/license_ar.txt",   // license_en.txt يُلتقط حسب لغة النظام
    "installerLanguages": ["en_US", "ar"],
    "include": "installer/installer.nsh",
    "createDesktopShortcut": true,
    "createStartMenuShortcut": true,
    "shortcutName": "OfficeCash",
    "uninstallDisplayName": "OfficeCash ${version}",
    "deleteAppDataOnUninstall": false,
    "installerIcon": "public/icon.ico",
    "uninstallerIcon": "public/icon.ico",
    "artifactName": "OfficeCash-Setup-${version}.${ext}"
  }
  ```

### 5.3 `installer/installer.nsh` (مقترح أولي يُضبط أثناء البناء)
- نصوص صفحة الترحيب «نبذة عن التطبيق» عبر `LangString` (AR/EN) و `MUI_WELCOMEPAGE_TITLE/TEXT`.
- نص صفحة الإنهاء `MUI_FINISHPAGE_TEXT` (AR/EN).
- صفحة إلغاء مخصصة فيها خانة «احتفظ ببيانات المكتب وقاعدة بياناته» (محددة افتراضياً) عبر `nsDialogs`.
- في `customUnInstall`: إن اختار المستخدم الحذف الكامل → حذف `$APPDATA\OfficeCash` بالكامل؛ وإلا يُحذف البرنامج فقط.
- استخدام الماكروهوكات الصحيحة (`customWelcomePage` / `customFinishPage` / `customUnInstall` / `customUnInit`).

### 5.4 ملاحظات فنية
- لوحة MUI2 لا تدعم RTL؛ النصوص العربية تظهر داخل تخطيط LTR (حل عملي مقبول).
- كود اللغة في `installerLanguages` قد يُرفض بصيغة `"ar"` — قد يُحتاج `"ar_AR"`؛ تُتحقق أثناء البناء.
- تغيير مسار `userData` من `office-cash-desktop` إلى `OfficeCash` يتطلب التحقق من عدم وجود بيانات قديمة تُهجر (نقل أو توافق).

## مراحل التنفيذ

### المرحلة 1 — الترخيص والنصوص
- [x] إنشاء `installer/license_ar.txt` و `installer/license_en.txt`.
- [x] التحقق من اختيار electron-builder للملف الصحيح حسب لغة النظام.

### المرحلة 2 — تفعيل المعالج
- [x] ضبط `build.nsis` (القسم 5.2) وتحويل `oneClick` إلى `false`.
- [x] تثبيت `productName` في أعلى `package.json` والتحقق من مسار `userData`.
- [x] `npm run electron:build` وفحص: ترحيب → ترخيص → مسار → تقدم → إنهاء.

### المرحلة 3 — صفحات مخصصة
- [x] `installer/installer.nsh`: نص الترحيب «نبذة عن التطبيق» + نص الإنهاء (AR/EN).
- [x] التحقق من ظهور النبذة فعلياً في الصفحة الأولى.

### المرحلة 4 — معالج الإلغاء وحماية البيانات
- [x] صفحة «الحفاظ على البيانات» في الإلغاء.
- [x] اختبار: الإلغاء الافتراضي يُبقي `office_cash.db`؛ إلغاء الخيار يحذفها.
- [x] إعادة التثبيت بعد الإلغاء تفتح المكتب القديم ببياناته.

### المرحلة 5 — الحسم النهائي
- [x] قرار `portable`: إبقاؤه (بلا معالج) أو حذفه.
- [x] ترقية من نسخة مثبّتة سابقة دون فقدان البيانات.
- [x] `npm run lint` + `npm run test` + `npm run build` ثم `npm run electron:build`.

## معايير القبول

1. تثبيت نظيف على Windows: الخطوات الست بالترتيب وزر «رجوع» يعمل.
2. لا يمكن تجاوز صفحة الشروط دون «أوافق».
3. تغيير مسار التثبيت فعّال وتظهر الاختصارات (سطح المكتب/ابدأ).
4. الإلغاء الافتراضي يحذف ملفات البرنامج ويُبقي `%APPDATA%\OfficeCash\office_cash.db`.
5. إعادة التثبيت بعد الإلغاء تعيد المكتب السابق كما كان.
6. على نظام عربي يُعرض الترخيص والترحيب بالعربية وعلى إنجليزي بالإنجليزية.
7. ترقية نسخة أحدث فوق الحالية دون مسح البيانات ودون كسر الجلسة.
8. الإلغاء الكامل (اختيار الحذف) يحذف مجلد userData مع تحذير واضح.

## مخاطر الانحدار (مراقبة إلزامية)

- **حذف بيانات خطأً**: أي خلل في «الحفاظ على البيانات» يمسح `office_cash.db` نهائياً → الافتراضي «احتفظ» + اختبار إجباري.
- **تغيير مسار userData**: من `office-cash-desktop` إلى `OfficeCash` قد يُهجّر بيانات موجودة → توافق/نقل.
- **كود اللغة العربية** في `installerLanguages` قد يفشل البناء → التحقق الفوري.
- **تغيير `appId` مستقبلاً** يكسر الترقية الصامتة → يُثبّت ولا يُغيّر.

## الملفات المتأثرة
`package.json` (قسم `build.nsis` + `productName` أعلى الملف),
`installer/license_ar.txt` (جديد), `installer/license_en.txt` (جديد),
`installer/installer.nsh` (جديد), `installer/installerSidebar.bmp` (اختياري).
