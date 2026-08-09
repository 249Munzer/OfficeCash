# خطة عمل: معالج تثبيت وإلغاء تثبيت احترافي (NSIS Wizard)

أُعدّت بتاريخ 2026-08-09. الغرض: تحويل شاشة التثبيت/إلغاء التثبيت الحالية (one-click بلا خطوات)
إلى **معالج خطوات واضح** لكل من التثبيت والإلغاء، مع: نبذة عن التطبيق، الموافقة على الشروط والأحكام،
اختيار مكان التثبيت، وحماية بيانات المستخدم عند الإلغاء.

المرجعيات من الشيفرة الحالية:
`package.json` (قسم `build.win` و `build`)، `electron/main.js`، `electron/database.js`
(بيانات المكتب في `app.getPath('userData')/office_cash.db`)، و `dist-electron/`.

---

## 0. ملخّص المبادئ العامة

1. **معالج مُرشَد (assisted installer)** بدل التثبيت بنقرة واحدة: `oneClick: false`.
2. **بيانات المكتب لا تُحذف عند الإلغاء** افتراضياً — بيانات مالية لا يمكن تعويضها
   (`deleteAppDataOnUninstall: false` + منطق مخصص لحماية `userData`).
3. **ثنائي اللغة** (عربي/إنجليزي): ترخيص بلغة نظام التشغيل + نصوص معرّبة للترحيب/الإنهاء.
4. **تثبيت لكل مستخدم** (per-user) افتراضياً لتجنّب طلب صلاحيات المسؤول عند التثبيت.
5. **ترقية بلا كسر**: نفس `appId`/`guid` تضمن استبدال النسخة القديمة دون إزالة بيانات.

---

## 1. الوضع الحالي

| # | العنصر | الوضع الحالي |
|---|--------|--------------|
| 1.1 | نوع المثبّت | `nsis` (افتراضي `oneClick: true`) + `portable` في `win.target` |
| 1.2 | خطوات التثبيت | شاشة واحدة بلا معالج، بلا ترخيص، بلا اختيار مسار |
| 1.3 | الشروط والأحكام | غير معروضة إطلاقاً |
| 1.4 | اختيار مكان التثبيت | غير ممكن (`allowToChangeInstallationDirectory` غير مضبوط) |
| 1.5 | اللغات | إنجليزي فقط (NSIS default) |
| 1.6 | معالج الإلغاء | الافتراضي (تأكيد → تقدم → إنهاء) بلا حماية بيانات |
| 1.7 | حفظ البيانات | `office_cash.db` في `app.getPath('userData')` — بيانات مالية حرجة |

**النتيجة**: أي مستخدم يثبّت/يلغي لا يمرّ بخطوات واضحة ولا يوقّع على الشروط،
وقد يظن خطأً أن بيانات مكتبه محفوظة عند الإلغاء.

---

## 2. خطوات معالج التثبيت (المستهدف)

```
الخطوة 1   الترحيب + نبذة عن التطبيق (الشعار + وصف OfficeCash + زر «التالي»)
    │
الخطوة 2   الشروط والأحكام (نافذة قابلة للتمرير + خيار «أوافق»؛ بدون موافقة لا يستمر)
    │
الخطوة 3   اختيار مكان التثبيت (مسار افتراضي + زر «استعراض» لتغييره + مساحة القرص)
    │
الخطوة 4   الإعدادات الإضافية (اختياري): إنشاء أيقونة سطح المكتب / قائمة ابدأ
    │
الخطوة 5   شريط تقدم التثبيت
    │
الخطوة 6   الإنهاء (تشغيل التطبيق الآن + إنهاء)
```

- الزر «رجوع» في كل الخطوات عدا الأولى.
- زر «إلغاء» في كل الخطوات مع تأكيد الإلغاء.
- تُحدَّد لغة المعالج تلقائياً من لغة نظام التشغيل (عربي/إنجليزي).

---

## 3. خطوات معالج الإلغاء (المستهدف)

```
الخطوة 1   تأكيد إلغاء التثبيت (نبذة: «سيُحذف التطبيق من جهازك»)
    │
الخطوة 2   الحفاظ على البيانات (خيار افتراضي «احتفظ ببيانات المكتب» محدد مسبقاً)
    │        - محدد: تُحذف ملفات البرنامج فقط، وتبقى office_cash.db والإعدادات.
    │        - غير محدد: يُحذف مجلد userData بالكامل (تحذير واضح بالعواقب).
    │
الخطوة 3   شريط تقدم الإزالة
    │
الخطوة 4   الإنهاء (إعادة التشغيل الآن إن لزم + إنهاء)
```

---

## 4. القرارات الأساسية

| # | القرار | الخيار المقترح | السبب |
|---|--------|----------------|-------|
| 4.1 | نوع المثبّت | `oneClick: false` (معالج) | تنفيذ خطوات واضحة |
| 4.2 | تغيير المسار | `allowToChangeInstallationDirectory: true` | طلب المستخدم الأساسي |
| 4.3 | النطاق | `perMachine: false` (لكل مستخدم) + صفحة اختيار النطاق | تثبيت سلس بلا صلاحيات |
| 4.4 | بيانات عند الإلغاء | تُحفظ افتراضياً (صفحة مخصصة) | بيانات مالية حرجة |
| 4.5 | اللغة | ثنائية عربي/إنجليزي عبر `installerLanguages` + `license_ar`/`license_en` | جمهور عربي |
| 4.6 | `portable` | **قرار مفتوح**: إبقاؤه (نسخة بلا معالج) أو حذفه | عدم الاتساق مع التجربة الجديدة |
| 4.7 | اسم مجلد البيانات | تثبيت `productName` في أعلى `package.json` ليصبح userData = `%APPDATA%\OfficeCash` | اسم نظيف وواضح |

---

## 5. التطبيق التقني

### 5.1 ملفات جديدة (تحت `installer/`)

```
installer/
  license_ar.txt        // الشروط والأحكام بالعربية
  license_en.txt        // الشروط والأحكام بالإنجليزية
  installer.nsh         // تخصيص NSIS: نص الترحيب + صفحة الإلغاء + حماية البيانات
```

### 5.2 تعديل `package.json` (قسم `build.nsis`)

```jsonc
"nsis": {
  "oneClick": false,
  "allowToChangeInstallationDirectory": true,
  "perMachine": false,
  "license": "installer/license_ar.txt",          // license_en.txt يُلتقط تلقائياً حسب لغة النظام
  "installerLanguages": ["en_US", "ar"],
  "include": "installer/installer.nsh",
  "createDesktopShortcut": true,
  "createStartMenuShortcut": true,
  "shortcutName": "OfficeCash",
  "uninstallDisplayName": "OfficeCash ${version}",
  "deleteAppDataOnUninstall": false,
  "installerIcon": "public/icon.ico",
  "uninstallerIcon": "public/icon.ico",
  "installerSidebar": "installer/installerSidebar.bmp",   // اختياري: صورة جانبية 164x314
  "artifactName": "OfficeCash-Setup-${version}.${ext}"
}
```

**ملاحظات**:
- `license` تدعم `.txt` / `.rtf` / `.html`، ويُختار ملف اللغة تلقائياً من لغة النظام عبر البادئة `_ar`/`_en`.
- قيمة `"ar"` في `installerLanguages` يجب التحقق منها أثناء البناء (قد تُقبل كـ `"ar_AR"`)؛ إن تعذّرت تُترك اللوحة الأساسية بالإنجليزية وتُعرب النصوص عبر `installer.nsh`.

### 5.3 ملف التخصيص `installer/installer.nsh` (مقترح أولي)

```nsi
!include MUI2.nsh

; ----- نص صفحة الترحيب «نبذة عن التطبيق» -----
LangString ABOUT_TITLE ${LANG_ARABIC}   "نبذة عن OfficeCash"
LangString ABOUT_TEXT  ${LANG_ARABIC}   "OfficeCash هو نظام إدارة يوميات المكتب: إيرادات الموظفين، المصروفات، إقفال اليوم، والمزامنة المحلية بين الأجهزة."
LangString ABOUT_TITLE ${LANG_ENGLISH}  "About OfficeCash"
LangString ABOUT_TEXT  ${LANG_ENGLISH}  "OfficeCash manages office cash: employee revenue, expenses, day closing, and LAN sync."

!define MUI_WELCOMEPAGE_TITLE $(ABOUT_TITLE)
!define MUI_WELCOMEPAGE_TEXT  $(ABOUT_TEXT)

; ----- نص صفحة الإنهاء -----
LangString FINISH_TEXT ${LANG_ARABIC}  "اكتمل تثبيت OfficeCash. اضغط «إنهاء» للخروج."
LangString FINISH_TEXT ${LANG_ENGLISH} "OfficeCash installation completed. Click Finish to exit."
!define MUI_FINISHPAGE_TEXT $(FINISH_TEXT)

; ----- صفحة مخصصة في معالج الإلغاء: الحفاظ على البيانات -----
Var KeepDataCheck
Function un.keepDataPage
  !insertmacro MUI_HEADER_TEXT "الحفاظ على البيانات" "اختر ما إذا تُحذف بيانات المكتب"
  nsDialogs::Create 1018
  Pop $0
  ${NSD_CreateCheckBox} 0 0 100% 12 \
    "احتفظ ببيانات المكتب وقاعدة بياناته (الموصى به)"
  Pop $KeepDataCheck
  ${NSD_SetState} $KeepDataCheck 1
  nsDialogs::Show
FunctionEnd

!macro customUnInstall
  ${NSD_GetState} $KeepDataCheck $0
  StrCmp $0 "1" keep
    Delete "$APPDATA\OfficeCash\office_cash.db"      ; الحذف الكامل (اختيار المستخدم)
    RMDir /r "$APPDATA\OfficeCash"
  keep:
!macroend
```

**تنبيه**: الشيفرة أعلاه مقترح أولي — يجب ضبط الماكروهوكات الصحيحة
(`customWelcomePage` / `customFinishPage` / `customUnInstall` / `customUnInit`)
عند البناء الفعلي حسب قالب electron-builder، والتحقق من اسم مجلد `userData`
(`%APPDATA%\OfficeCash` بعد تثبيت `productName` في أعلى `package.json`).

### 5.4 بيانات وملفات إضافية

1. **نص الترخيص**: إعداد `license_ar.txt` و `license_en.txt` (نص واضح: الحقوق، عدم الضمان، الخصوصية، حدود المسؤولية).
2. **صورة جانبية** اختيارية `installerSidebar.bmp` (164×314) من الهوية البصرية الحالية (`public/logo*`).
3. **اسم مجلد البيانات**: إضافة `"productName": "OfficeCash"` في أعلى `package.json`
   حتى يصبح `app.getPath('userData')` = `%APPDATA%\OfficeCash` بشكل نظيف ومستقر عبر الترقيات.

---

## 6. مراحل التنفيذ

### المرحلة 1: إعداد الترخيص والنصوص
- [ ] إنشاء `installer/license_ar.txt` و `installer/license_en.txt` بنص شروط موحّد ثنائي اللغة.
- [ ] التحقق من تلقّي `electron-builder` للملف الصحيح حسب لغة النظام.

### المرحلة 2: تفعيل المعالج (NSIS)
- [ ] ضبط `build.nsis` في `package.json` (القسم 5.2) وتحويل `oneClick` إلى `false`.
- [ ] تثبيت `"productName": "OfficeCash"` في أعلى `package.json` والتحقق من مسار `userData`.
- [ ] بناء `npm run electron:build` وفحص الخطوات: ترحيب → ترخيص → مسار → تقدم → إنهاء.

### المرحلة 3: صفحة الترحيب/الإنهاء المخصصة
- [ ] إنشاء `installer/installer.nsh` بنصوص الترحيب والإنهاء ثنائية اللغة (القسم 5.3).
- [ ] التحقق من ظهور «نبذة عن التطبيق» فعلياً في الصفحة الأولى.

### المرحلة 4: معالج الإلغاء وحماية البيانات
- [ ] إضافة صفحة «الحفاظ على البيانات» في الإلغاء عبر `installer.nsh`.
- [ ] اختبار: الإلغاء الافتراضي يُبقي `office_cash.db`، وإلغاء تحديد الخيار يحذفها.
- [ ] التحقق من أن التثبيت مرة أخرى بعد الإلغاء يفتح المكتب القديم ببياناته.

### المرحلة 5: الحسم النهائي
- [ ] قرار `portable`: إبقاؤه أو حذفه (القرار 4.6).
- [ ] ترقية من نسخة مثبّتة سابقة (2.0.0) دون فقدان البيانات.
- [ ] إضافة أقسام تحقق في `docs/` إن لزم.

---

## 7. اختبارات التحقق

1. `npm run lint` و `npm run build` و `npm run electron:build` تمر بلا أخطاء.
2. **تثبيت نظيف** على Windows جديد: تظهر الخطوات الست بالترتيب، والزر «رجوع» يعمل.
3. **الشروط**: لا يمكن تجاوز الخطوة الثانية دون اختيار «أوافق» (في النصوص المطلوبة).
4. **المسار**: تغيير مسار التثبيت فعّال، ويظهر في قائمة ابدأ/سطح المكتب.
5. **الإلغاء الافتراضي**: حذف ملفات البرنامج + بقاء `%APPDATA%\OfficeCash\office_cash.db`.
6. **إعادة التثبيت بعد الإلغاء**: المكتب السابق (بياناته وإعداداته) يظهر كما كان.
7. **اللغة**: على نظام عربي يُعرض الترخيص والترحيب بالعربية، وعلى إنجليزي بالإنجليزية.
8. **الترقية**: تثبيت نسخة أحدث فوق الحالية دون طلب مسح البيانات ودون كسر الجلسة.
9. **الإلغاء الكامل (اختيار الحذف)**: يُحذف مجلد userData بالكامل مع رسالة تحذير.

---

## 8. مخاطر الانحدار (Regressions) يجب مراقبتها

- **حذف البيانات خطأً**: أي خلل في منطق «الحفاظ على البيانات» قد يمسح `office_cash.db` نهائياً.
  الحماية: الافتراضي «احتفظ»، والتأكيد النصي، واختبار إجباري قبل الشحن.
- **تغيير اسم مجلد userData**: تثبيت `productName` في `package.json` يغيّر مسار `userData`
  من `office-cash-desktop` إلى `OfficeCash`؛ يجب إما نقل البيانات الحالية أو الحفاظ على التوافق
  (مستند: `electron/database.js:6`).
- **اللغات العربية في NSIS**: لوحة MUI2 لا تدعم اتجاه RTL؛ النصوص قد تظهر عربية داخل تخطيط LTR —
  يُقبل كحل عملي مع توثيقه.
- **`installerLanguages` بدقة الكود**: قد ترفض electron-builder كود `"ar"`؛ التحقق الفوري أثناء المرحلة 2.
- **ترقية guid**: تغيير `appId` مستقبلاً يكسر الترقية الصامتة — يُثبّت `appId` الحالي ولا يُغيّر.
- **الصورة الجانبية**: إن فشل البناء بسبب أبعاد BMP غير صحيحة تُزال الخيارات التجميلية ولا تُعرقل المعالج.
