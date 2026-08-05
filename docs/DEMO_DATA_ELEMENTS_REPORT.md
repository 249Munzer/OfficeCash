# تقرير عناصر البيانات الوهمية والثابتة
## نظام OfficeCash - الإصدار 2.0

---

## 📋 ملخص

هذا التقرير يوثق جميع العناصر التي تعرض بيانات وهمية أو ثابتة في التطبيق، بما في ذلك:
- البيانات التجريبية الافتراضية (Demo Data)
- القيم الثابتة (Hardcoded Values)
- القوائم المحددة مسبقاً (Static Lists)
- النصوص الافتراضية (Default Text)

---

## 1. البيانات التجريبية (Demo Data)

### 1.1 الموظفين الافتراضيين

**الملف:** `src/lib/electron-storage.ts` (الأسطر 163-206)
**الملف:** `src/lib/storage.ts` (INITIAL_EMPLOYEES)

#### القائمة:
```typescript
[
  {
    id: 'emp-1',
    name: 'أحمد السعيد',
    username: 'ahmed',
    passwordPin: '1111',
    color: '#2563eb',
    isActive: true,
    notes: 'موظف قسم الجوازات والمرور',
    createdAt: new Date().toISOString()
  },
  {
    id: 'emp-2',
    name: 'علي القحطاني',
    username: 'ali',
    passwordPin: '2222',
    color: '#16a34a',
    isActive: true,
    notes: 'موظف قسم البلدية والسجل التجاري',
    createdAt: new Date().toISOString()
  },
  {
    id: 'emp-3',
    name: 'يوسف الغامدي',
    username: 'youssef',
    passwordPin: '3333',
    color: '#d97706',
    isActive: true,
    notes: 'موظف قسم الترجمة والعقود',
    createdAt: new Date().toISOString()
  },
  {
    id: 'emp-4',
    name: 'سارة الشمري',
    username: 'sara',
    passwordPin: '4444',
    color: '#9333ea',
    isActive: true,
    notes: 'موظفة الاستقبال والخدمات الإلكترونية',
    createdAt: new Date().toISOString()
  }
]
```

#### ملاحظات:
- **عدد الموظفين:** 4 موظفين
- **PINs:** 1111, 2222, 3333, 4444
- **الاستخدام:** تظهر عند أول تشغيل أو عند إعادة تعيين البيانات
- **الملفات:** 
  - `src/lib/electron-storage.ts` - `getInitialEmployees()`
  - `src/lib/storage.ts` - `INITIAL_EMPLOYEES`

---

### 1.2 الخدمات الافتراضية

**الملف:** `src/lib/electron-storage.ts` (الأسطر 248-261)
**الملف:** `src/lib/storage.ts` (INITIAL_SERVICES)

#### القائمة:
```typescript
[
  { id: 'srv-1', name: 'تجديد إقامة', defaultPrice: 150, category: 'الجوازات', isActive: true, createdAt: new Date().toISOString() },
  { id: 'srv-2', name: 'اصدار / تجديد رخصة قيادة', defaultPrice: 100, category: 'المرور', isActive: true, createdAt: new Date().toISOString() },
  { id: 'srv-3', name: 'ترجمة معتمدة (صفحة)', defaultPrice: 80, category: 'الترجمة', isActive: true, createdAt: new Date().toISOString() },
  { id: 'srv-4', name: 'تأشيرة خروج وعودة', defaultPrice: 50, category: 'الجوازات', isActive: true, createdAt: new Date().toISOString() },
  { id: 'srv-5', name: 'نقل كفالة / خدمات', defaultPrice: 200, category: 'مكتب العمل', isActive: true, createdAt: new Date().toISOString() },
  { id: 'srv-6', name: 'فتح ملف بلدية / رخصة محل', defaultPrice: 300, category: 'البلدية', isActive: true, createdAt: new Date().toISOString() },
  { id: 'srv-7', name: 'توثيق عقد إلكتروني', defaultPrice: 120, category: 'العقود', isActive: true, createdAt: new Date().toISOString() },
  { id: 'srv-8', name: 'استخراج سجل تجاري', defaultPrice: 250, category: 'التجارة', isActive: true, createdAt: new Date().toISOString() },
  { id: 'srv-9', name: 'تعديل مهنة', defaultPrice: 180, category: 'مكتب العمل', isActive: true, createdAt: new Date().toISOString() },
  { id: 'srv-10', name: 'طباعة واستعلامات عامة', defaultPrice: 30, category: 'خدمات عامة', isActive: true, createdAt: new Date().toISOString() }
]
```

#### ملاحظات:
- **عدد الخدمات:** 10 خدمات
- **نطاق الأسعار:** 30 - 300 ر.ق
- **الفئات:** 8 فئات مختلفة
- **الاستخدام:** تظهر عند أول تشغيل أو عند إعادة تعيين البيانات
- **الملفات:**
  - `src/lib/electron-storage.ts` - `getInitialServices()`
  - `src/lib/storage.ts` - `INITIAL_SERVICES`

---

### 1.3 المعاملات المالية التجريبية

**الملف:** `src/lib/electron-storage.ts` (الأسطر 454-474)
**الملف:** `src/lib/storage.ts` - `generateSampleEntries()`

#### القائمة:
```typescript
[
  {
    id: 'ent-101',
    date: 'قبل يومين',
    time: '08:30:15',
    employeeId: 'emp-1',
    employeeName: 'أحمد السعيد',
    serviceId: 'srv-1',
    serviceName: 'تجديد إقامة',
    amount: 150,
    paymentMethod: 'cash',
    statement: 'معاملة مؤسسة الأمل - 3 إقامات',
    notes: 'تم الدفع نقداً',
    createdAt: new Date().toISOString()
  },
  {
    id: 'ent-102',
    date: 'قبل يومين',
    time: '09:12:00',
    employeeId: 'emp-2',
    employeeName: 'علي القحطاني',
    serviceId: 'srv-8',
    serviceName: 'استخراج سجل تجاري',
    amount: 250,
    paymentMethod: 'card',
    statement: 'سجل تجاري شركة التقنية',
    notes: 'شبكة مدى',
    createdAt: new Date().toISOString()
  },
  {
    id: 'ent-103',
    date: 'قبل يومين',
    time: '09:45:30',
    employeeId: 'emp-3',
    employeeName: 'يوسف الغامدي',
    serviceId: 'srv-3',
    serviceName: 'ترجمة معتمدة (صفحة)',
    amount: 160,
    paymentMethod: 'cash',
    statement: 'ترجمة شهادتين علمية',
    notes: 'صفحتان',
    createdAt: new Date().toISOString()
  },
  {
    id: 'ent-104',
    date: 'أمس',
    time: '10:15:10',
    employeeId: 'emp-4',
    employeeName: 'سارة الشمري',
    serviceId: 'srv-7',
    serviceName: 'توثيق عقد إلكتروني',
    amount: 120,
    paymentMethod: 'transfer',
    statement: 'توثيق عقد إيجار سكني',
    notes: 'تحويل بنك الراجحي',
    createdAt: new Date().toISOString()
  },
  {
    id: 'ent-105',
    date: 'أمس',
    time: '11:00:00',
    employeeId: 'emp-1',
    employeeName: 'أحمد السعيد',
    serviceId: 'srv-4',
    serviceName: 'تأشيرة خروج وعودة',
    amount: 50,
    paymentMethod: 'card',
    statement: 'خروج وعودة سائق خاص',
    notes: '',
    createdAt: new Date().toISOString()
  },
  {
    id: 'ent-106',
    date: 'أمس',
    time: '11:30:25',
    employeeId: 'emp-2',
    employeeName: 'علي القحطاني',
    serviceId: 'srv-6',
    serviceName: 'فتح ملف بلدية / رخصة محل',
    amount: 300,
    paymentMethod: 'card',
    statement: 'رخصة محل مطعم الوجبات',
    notes: 'شبكة',
    createdAt: new Date().toISOString()
  },
  {
    id: 'ent-201',
    date: 'أمس',
    time: '09:00:00',
    employeeId: 'emp-1',
    employeeName: 'أحمد السعيد',
    serviceId: 'srv-5',
    serviceName: 'نقل كفالة / خدمات',
    amount: 200,
    paymentMethod: 'cash',
    statement: 'نقل كفالة عامل',
    notes: '',
    createdAt: new Date().toISOString(),
    dayClosed: true
  },
  {
    id: 'ent-202',
    date: 'أمس',
    time: '10:30:00',
    employeeId: 'emp-3',
    employeeName: 'يوسف الغامدي',
    serviceId: 'srv-3',
    serviceName: 'ترجمة معتمدة (صفحة)',
    amount: 240,
    paymentMethod: 'transfer',
    statement: 'ترجمة وثائق تجارية 3 صفحات',
    notes: '',
    createdAt: new Date().toISOString(),
    dayClosed: true
  },
  {
    id: 'ent-203',
    date: 'أمس',
    time: '12:10:00',
    employeeId: 'emp-2',
    employeeName: 'علي القحطاني',
    serviceId: 'srv-2',
    serviceName: 'اصدار / تجديد رخصة قيادة',
    amount: 100,
    paymentMethod: 'card',
    statement: 'رخصة قيادة خصوصي',
    notes: '',
    createdAt: new Date().toISOString(),
    dayClosed: true
  },
  {
    id: 'ent-301',
    date: 'قبل يومين',
    time: '11:15:00',
    employeeId: 'emp-4',
    employeeName: 'سارة الشمري',
    serviceId: 'srv-10',
    serviceName: 'طباعة واستعلامات عامة',
    amount: 60,
    paymentMethod: 'cash',
    statement: 'طباعة نماذج واستعلام',
    notes: '',
    createdAt: new Date().toISOString(),
    dayClosed: true
  }
]
```

#### ملاحظات:
- **عدد المعاملات:** 10 معاملات
- **التواريخ:** اليوم، أمس، وقبل يومين
- **طرق الدفع:** cash, card, transfer
- **الموظفين:** جميع الموظفين الأربعة
- **الخدمات:** 8 خدمات مختلفة
- **الاستخدام:** تظهر عند أول تشغيل أو عند إعادة تعيين البيانات
- **الملفات:**
  - `src/lib/electron-storage.ts` - `generateSampleEntries()`
  - `src/lib/storage.ts` - `generateSampleEntries()`

---

### 1.4 المصروفات التجريبية

**الملف:** `src/lib/electron-storage.ts` (الأسطر 476-487)
**الملف:** `src/lib/storage.ts` - `generateSampleExpenses()`

#### القائمة:
```typescript
[
  {
    id: 'exp-1',
    date: 'اليوم',
    time: '09:30',
    category: 'ضيافة',
    statement: 'شراء ضيافة شاي وقهوة ومياه للمكتب',
    amount: 45,
    notes: 'فاتورة السوبرماركت',
    createdAt: new Date().toISOString()
  },
  {
    id: 'exp-2',
    date: 'اليوم',
    time: '11:15',
    category: 'أدوات مكتبية',
    statement: 'شراء ورق A4 وأقلام ودباسات',
    amount: 120,
    notes: 'مكتبة الشروق',
    createdAt: new Date().toISOString()
  },
  {
    id: 'exp-3',
    date: 'أمس',
    time: '10:00',
    category: 'صيانة',
    statement: 'تعبئة حبر طابعة المكتب',
    amount: 80,
    notes: '',
    createdAt: new Date().toISOString()
  }
]
```

#### ملاحظات:
- **عدد المصروفات:** 3 مصروفات
- **الفئات:** ضيافة، أدوات مكتبية، صيانة
- **المبالغ:** 45 - 120 ر.ق
- **الاستخدام:** تظهر عند أول تشغيل أو عند إعادة تعيين البيانات
- **الملفات:**
  - `src/lib/electron-storage.ts` - `generateSampleExpenses()`
  - `src/lib/storage.ts` - `generateSampleExpenses()`

---

### 1.5 إغلاق اليوميات التجريبي

**الملف:** `src/lib/electron-storage.ts` (الأسطر 489-512)
**الملف:** `src/lib/storage.ts` - `generateSampleDayClosings()`

#### القائمة:
```typescript
[
  {
    id: 'close-201',
    date: 'أمس',
    closingTimestamp: 'أمسT17:30:00Z',
    totalRevenue: 540,
    totalCash: 200,
    totalCard: 100,
    totalTransfer: 240,
    totalExpenses: 80,
    netIncome: 460,
    entriesCount: 3,
    physicalCashDrawer: 200,
    cashDifference: 0,
    closedBy: 'المحاسب المسؤول',
    notes: 'تم إغلاق اليوم ومطابقة صندوق النقد بنجاح'
  }
]
```

#### ملاحظات:
- **عدد الإغلاقات:** 1 إغلاق
- **التاريخ:** أمس
- **الإيرادات:** 540 ر.ق
- **المصروفات:** 80 ر.ق
- **صافي الدخل:** 460 ر.ق
- **الاستخدام:** تظهر عند أول تشغيل أو عند إعادة تعيين البيانات
- **الملفات:**
  - `src/lib/electron-storage.ts` - `generateSampleDayClosings()`
  - `src/lib/storage.ts` - `generateSampleDayClosings()`

---

### 1.6 الإعدادات الافتراضية

**الملف:** `src/lib/electron-storage.ts` (الأسطر 91-106)

#### القائمة:
```typescript
{
  officeName: 'مكتب الإنجاز المتميز لخدمات التعقيب والتخليص',
  licenseNumber: '1010482930',
  phone: '0501234567',
  address: 'الرياض - طريق الملك فهد - حي العليا',
  currency: 'ر.ق',
  taxNumber: '310123456700003',
  autoLockClosedDays: true,
  soundEffects: true,
  adminPasswordPin: '1234',
  networkSyncCode: 'P2P-OFFICE-8842',
  theme: 'light',
  language: 'ar'
}
```

#### ملاحظات:
- **اسم المكتب:** مكتب الإنجاز المتميز لخدمات التعقيب والتخليص
- **رقم الرخصة:** 1010482930
- **الهاتف:** 0501234567
- **العنوان:** الرياض - طريق الملك فهد - حي العليا
- **العملة:** ر.ق
- **الرقم الضريبي:** 310123456700003
- **PIN المدير:** 1234
- **رمز المزامنة:** P2P-OFFICE-8842
- **الاستخدام:** تظهر عند أول تشغيل أو عند إعادة تعيين البيانات
- **الملف:** `src/lib/electron-storage.ts` - `getDefaultSettings()`

---

## 2. القوائم الثابتة (Static Lists)

### 2.1 قائمة الألوان

**الملف:** `src/components/EmployeesManager.tsx`

```typescript
const colorsList = [
  '#2563eb', // Blue
  '#16a34a', // Green
  '#d97706', // Orange
  '#9333ea', // Purple
  // ... المزيد من الألوان
];
```

#### ملاحظات:
- **الاستخدام:** اختيار لون الموظف
- **عدد الألوان:** 5+ ألوان
- **الملف:** `src/components/EmployeesManager.tsx`

---

### 2.2 قائمة الفئات

**الملف:** `src/components/ExpensesManager.tsx`

```typescript
const categories = [
  'ضيافة',
  'أدوات مكتبية',
  'صيانة',
  // ... المزيد من الفئات
];
```

#### ملاحظات:
- **الاستخدام:** تصنيف المصروفات
- **عدد الفئات:** 3+ فئات
- **الملف:** `src/components/ExpensesManager.tsx`

**الملف:** `src/components/ServicesManager.tsx`

```typescript
const categories = [
  'الجوازات',
  'المرور',
  'الترجمة',
  'مكتب العمل',
  'البلدية',
  'العقود',
  'التجارة',
  'خدمات عامة'
];
```

#### ملاحظات:
- **الاستخدام:** تصنيف الخدمات
- **عدد الفئات:** 8 فئات
- **الملف:** `src/components/ServicesManager.tsx`

---

### 2.3 القيم الافتراضية للحقول

**الملف:** `src/components/ServicesManager.tsx`

```typescript
const [defaultPrice, setDefaultPrice] = useState<string>('100');
const [category, setCategory] = useState<string>('الجوازات');
```

#### ملاحظات:
- **السعر الافتراضي:** 100
- **الفئة الافتراضية:** الجوازات
- **الاستخدام:** القيم الأولية عند إضافة خدمة جديدة
- **الملف:** `src/components/ServicesManager.tsx`

---

## 3. النصوص الثابتة (Static Text)

### 3.1 نصوص الواجهة

**الملف:** `src/components/AuthModal.tsx`

```typescript
// تلميح PIN المدير الافتراضي
<p className="text-xs text-slate-400 mt-1">
  {t('defaultAdminHint')} <code className="...">1234</code>
</p>
```

#### ملاحظات:
- **النص:** "الرمز الافتراضي: 1234"
- **الاستخدام:** تلميح للمستخدم
- **الملف:** `src/components/AuthModal.tsx`

---

**الملف:** `src/components/DayClosingManager.tsx`

```typescript
// القيم الافتراضية لحقول الإغلاق
closedBy: closedBy.trim() || t('defaultAccountant'),
notes: notes.trim() || t('defaultClosingNote'),
```

#### ملاحظات:
- **الاستخدام:** قيم افتراضية لحقول الإغلاق
- **الملف:** `src/components/DayClosingManager.tsx`

---

**الملف:** `src/components/LandingPage.tsx`

```typescript
// أسماء الموظفين الافتراضية
name: regEmp1Name.trim() || t('defaultEmp1Name'),
name: regEmp2Name.trim() || t('defaultEmp2Name'),
```

#### ملاحظات:
- **الاستخدام:** أسماء افتراضية عند إنشاء مكتب جديد
- **الملف:** `src/components/LandingPage.tsx`

---

## 4. عناصر واجهة المستخدم الثابتة

### 4.1 العناصر الثابتة في المكونات

**الملف:** `src/components/Header.tsx`

```typescript
// نص البحث
placeholder={t('searchPlaceholder')}
```

#### ملاحظات:
- **النص:** "بحث..."
- **الاستخدام:** حقل البحث في الهيدر
- **الملف:** `src/components/Header.tsx`

---

**الملف:** `src/components/FastEntryModal.tsx`

```typescript
// عرض السعر الافتراضي للخدمة
{srv.name} ({srv.category}) — {srv.defaultPrice} {settings.currency}
```

#### ملاحظات:
- **الاستخدام:** عرض السعر الافتراضي للخدمة المختارة
- **الملف:** `src/components/FastEntryModal.tsx`

---

**الملف:** `src/components/EmployeePortal.tsx`

```typescript
// عرض السعر الافتراضي
{formatCurrency(srv.defaultPrice, settings.currency, lang)}
```

#### ملاحظات:
- **الاستخدام:** عرض السعر الافتراضي في بوابة الموظف
- **الملف:** `src/components/EmployeePortal.tsx`

---

**الملف:** `src/components/ReportsScreen.tsx`

```typescript
// عرض السعر الافتراضي في التقارير
{formatCurrency(srv.defaultPrice, settings.currency, lang)}
```

#### ملاحظات:
- **الاستخدام:** عرض السعر الافتراضي في التقارير
- **الملف:** `src/components/ReportsScreen.tsx`

---

## 5. ملخص العناصر

### 5.1 إحصائيات

| النوع | العدد | الملفات المتأثرة |
|------|-------|------------------|
| **موظفين افتراضيين** | 4 | 2 ملفات |
| **خدمات افتراضية** | 10 | 2 ملفات |
| **معاملات مالية** | 10 | 2 ملفات |
| **مصروفات** | 3 | 2 ملفات |
| **إغلاق يوميات** | 1 | 2 ملفات |
| **إعدادات افتراضية** | 12 حقل | 1 ملف |
| **قوائم ألوان** | 5+ | 1 ملف |
| **قوائم فئات** | 11 | 2 ملف |
| **قيم افتراضية** | 5+ | 3 ملفات |

### 5.2 الملفات التي تحتوي على بيانات وهمية

1. **src/lib/electron-storage.ts** (521 سطر)
   - `getDefaultSettings()` - الإعدادات الافتراضية
   - `getInitialEmployees()` - الموظفين الافتراضيين
   - `getInitialServices()` - الخدمات الافتراضية
   - `generateSampleEntries()` - المعاملات التجريبية
   - `generateSampleExpenses()` - المصروفات التجريبية
   - `generateSampleDayClosings()` - إغلاق اليوميات التجريبي

2. **src/lib/storage.ts** (قديم - localStorage)
   - `INITIAL_EMPLOYEES` - نفس الموظفين
   - `INITIAL_SERVICES` - نفس الخدمات
   - `generateSampleEntries()` - نفس المعاملات
   - `generateSampleExpenses()` - نفس المصروفات
   - `generateSampleDayClosings()` - نفس الإغلاقات
   - `resetToDemoData()` - دالة إعادة التعيين

3. **src/components/EmployeesManager.tsx**
   - `colorsList` - قائمة الألوان

4. **src/components/ExpensesManager.tsx**
   - `categories` - قائمة فئات المصروفات

5. **src/components/ServicesManager.tsx**
   - `categories` - قائمة فئات الخدمات
   - `defaultPrice` - السعر الافتراضي
   - `category` - الفئة الافتراضية

6. **src/components/AuthModal.tsx**
   - نص تلميح PIN المدير

7. **src/components/DayClosingManager.tsx**
   - قيم افتراضية لحقول الإغلاق

8. **src/components/LandingPage.tsx**
   - أسماء موظفين افتراضية

---

## 6. آلية عمل البيانات الوهمية

### 6.1 متى تظهر البيانات الوهمية؟

1. **أول تشغيل للتطبيق:**
   - عندما لا توجد بيانات محفوظة
   - يتم تحميل البيانات الافتراضية تلقائياً

2. **عند إعادة تعيين البيانات:**
   - من خلال زر "إعادة تعيين البيانات التجريبية"
   - في SettingsManager.tsx

3. **عند إنشاء مكتب جديد:**
   - يتم إنشاء إعدادات افتراضية
   - مع PIN المدير الافتراضي

### 6.2 كيف يتم تخزينها؟

#### في Electron (الإصدار 2.0):
- **قاعدة البيانات:** SQLite في `app.getPath('userData')/office_cash.db`
- **الجدول:** settings (key-value)
- **الطريقة:** JSON serialization

#### في المتصفح (الإصدار 1.0):
- **التخزين:** localStorage
- **المفاتيح:** officecash_employees, officecash_services, etc.
- **الطريقة:** JSON.stringify/parse

---

## 7. التوصيات

### 7.1 للاستخدام الإنتاجي

1. **تغيير PINs الافتراضية:**
   - PIN المدير: 1234 → PIN قوي
   - PINs الموظفين: 1111, 2222, 3333, 4444 → PINs قوية

2. **حذف البيانات التجريبية:**
   - قبل الاستخدام الإنتاجي
   - أو تعديلها لتناسب الواقع

3. **تعديل الإعدادات الافتراضية:**
   - اسم المكتب
   - رقم الرخصة
   - الهاتف والعنوان

4. **تعديل الخدمات:**
   - إضافة خدمات حقيقية
   - تعديل الأسعار
   - حذف الخدمات غير المستخدمة

5. **تعديل الموظفين:**
   - إضافة موظفين حقيقيين
   - حذف الموظفين التجريبيين
   - تغيير PINs

### 7.2 للمطور

1. **توثيق البيانات الوهمية:**
   - إضافة تعليقات واضحة
   - توثيق الغرض من كل بيانات

2. **فصل البيانات الوهمية:**
   - إنشاء ملف منفصل `demo-data.ts`
   - فصلها عن منطق التطبيق

3. **إضافة علامات واضحة:**
   - تعليقات في الكود
   - رسائل للمستخدم

4. **تحسين آلية إعادة التعيين:**
   - تأكيد واضح قبل الحذف
   - خيار استرجاع البيانات

---

## 8. الخلاصة

### 8.1 العناصر الرئيسية:

**البيانات الوهمية:**
- ✅ 4 موظفين افتراضيين
- ✅ 10 خدمات افتراضية
- ✅ 10 معاملات مالية
- ✅ 3 مصروفات
- ✅ 1 إغلاق يوميات
- ✅ 12 إعداد افتراضي

**القوائم الثابتة:**
- ✅ 5+ ألوان
- ✅ 11 فئة
- ✅ 5+ قيمة افتراضية

### 8.2 الغرض:

1. **العرض التوضيحي:** إظهار ميزات التطبيق
2. **الاختبار:** اختبار الوظائف
3. **التدريب:** تعلم كيفية استخدام التطبيق
4. **النموذج الأولي:** نموذج للعملاء

### 8.3 التحذيرات:

⚠️ **مهم:** يجب حذف أو تعديل هذه البيانات قبل الاستخدام الإنتاجي

---

**تم إعداد التقرير:** 3 أغسطس 2026  
**المحلل:** نظام تحليل الكود الآلي  
**الحالة:** ✅ شامل