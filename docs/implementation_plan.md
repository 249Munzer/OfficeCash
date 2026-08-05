# Implementation Plan

[Overview]
إنشاء نظام إشعارات/toasts عام (Global Toast System) لجعل جميع التفاعلات في التطبيق متفاعلة بالكامل، مع إشعارات بصرية واضحة لكل عملية ناجحة أو فاشلة.

يحتاج التطبيق حالياً إلى نظام إشعارات موحد يعمل على مستوى التطبيق بأكمله. المشكلة الحالية هي أن كل مكون يدير حالة الإشعارات الخاصة به محلياً، مما يعني أن الإشعارات تختفي عندما يتم إلغاء تحميل المكون (unmount) - مثلما يحدث عند تسجيل الدخول أو إنشاء مكتب جديد. بالإضافة إلى ذلك، بعض العمليات مثل "ربط الشبكة المحلية" لا تعطي أي إشعار على الإطلاق. الحل هو إنشاء `ToastContext` و `ToastProvider` يعملان على مستوى `App.tsx`، مع `useToast` hook يمكن استدعاؤه من أي مكون لعرض إشعارات نجاح/خطأ/تحذير/معلومات.

[Types]
إضافة نوع `Toast` جديد للإشعارات و `ToastContextType` للـ context.

```typescript
// src/components/Toast/types.ts
export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number; // بالمللي ثانية، افتراضي 4000
}

export interface ToastContextType {
  toasts: Toast[];
  showSuccess: (message: string, duration?: number) => void;
  showError: (message: string, duration?: number) => void;
  showWarning: (message: string, duration?: number) => void;
  showInfo: (message: string, duration?: number) => void;
  removeToast: (id: string) => void;
}
```

[Files]
إنشاء ملفات جديدة وتعديل ملفات موجودة لدمج نظام الإشعارات العام.

- **ملفات جديدة:**
  - `src/components/Toast/ToastProvider.tsx` - المزود العام للإشعارات (Context Provider)
  - `src/components/Toast/ToastContainer.tsx` - حاوية عرض الإشعارات على الشاشة
  - `src/components/Toast/ToastItem.tsx` - مكون إشعار واحد
  - `src/components/Toast/useToast.ts` - hook لاستدعاء الإشعارات من أي مكون
  - `src/components/Toast/types.ts` - تعريفات الأنواع
  - `src/components/Toast/index.ts` - ملف تصدير موحد

- **ملفات موجودة لتعديلها:**
  - `src/App.tsx` - تغليف التطبيق بـ `ToastProvider` + إضافة `ToastContainer`
  - `src/hooks/useAuth.ts` - إضافة إشعارات لـ `handleCreateNewOffice` و `handleJoinLAN` و `handleLoginAsEmployee` و `handleLoginAsAdmin` و `handleLogout`
  - `src/components/LandingPage.tsx` - استبدال الإشعارات المحلية بـ `useToast`
  - `src/components/FastEntryModal.tsx` - استبدال `alert()` و الإشعارات المحلية بـ `useToast`
  - `src/components/ExpensesManager.tsx` - إضافة إشعارات للإضافة/الحذف
  - `src/components/EmployeesManager.tsx` - إضافة إشعارات للإضافة/التعديل/الحذف
  - `src/components/ServicesManager.tsx` - إضافة إشعارات للإضافة/التعديل/الحذف
  - `src/components/DayClosingManager.tsx` - إضافة إشعارات للإغلاق
  - `src/components/SettingsManager.tsx` - إضافة إشعارات للحفظ/النسخ الاحتياطي/إعادة التعيين
  - `src/components/EmployeePortal.tsx` - إضافة إشعارات للإضافة
  - `src/components/Dashboard.tsx` - إضافة إشعارات للحذف
  - `src/components/TransactionsTable.tsx` - إضافة إشعارات للتعديل/الحذف/الطباعة
  - `src/lib/i18n.ts` - إضافة مفاتيح ترجمة جديدة للإشعارات

- **لا يتم حذف أي ملفات**

[Functions]
إنشاء دوال جديدة للإشعارات وتعديل الدوال الحالية لإضافة إشعارات.

- **دوال جديدة:**
  - `ToastProvider({ children })` - `src/components/Toast/ToastProvider.tsx` - مزود الـ context
  - `useToast()` - `src/components/Toast/useToast.ts` - hook للوصول للإشعارات
  - `showSuccess(message, duration?)` - عرض إشعار نجاح
  - `showError(message, duration?)` - عرض إشعار خطأ
  - `showWarning(message, duration?)` - عرض إشعار تحذير
  - `showInfo(message, duration?)` - عرض إشعار معلومات
  - `removeToast(id)` - إزالة إشعار محدد

- **دوال معدلة (إضافة إشعارات):**
  - `handleCreateNewOffice` في `useAuth.ts` - إضافة `showSuccess` بعد الإنشاء
  - `handleJoinLAN` في `useAuth.ts` - إضافة `showSuccess` أو `showError` للربط
  - `handleLoginAsEmployee` في `useAuth.ts` - إضافة `showSuccess` عند النجاح
  - `handleLoginAsAdmin` في `useAuth.ts` - إضافة `showSuccess` عند النجاح
  - `handleLogout` في `useAuth.ts` - إضافة `showInfo` عند الخروج
  - `handleRegisterSubmit` في `LandingPage.tsx` - استبدال `setSuccessToast` بـ `showSuccess`
  - `handleLANJoinSubmit` في `LandingPage.tsx` - استبدال `setSuccessToast` بـ `showSuccess`
  - `handleSubmit` في `FastEntryModal.tsx` - استبدال `alert()` بـ `showError` و `showSuccessToast` بـ `showSuccess`
  - جميع دوال CRUD في المكونات الأخرى - إضافة `showSuccess`/`showError`

[Classes]
لا توجد أصناف جديدة - النظام يعتمد على React Context و Hooks.

- **مكونات جديدة (Functional Components):**
  - `ToastProvider` - مكون مزود الـ context
  - `ToastContainer` - حاوية عرض الإشعارات
  - `ToastItem` - مكون إشعار واحد مع animations

[Dependencies]
لا توجد تبعيات جديدة مطلوبة.

النظام سيستخدم:
- React Context API (موجود في React 19.0.1)
- Motion (موجود `motion/react`) للأنيميشن
- Lucide React (موجود) للأيقونات
- Tailwind CSS (موجود) للتنسيق

[Testing]
التحقق من عمل النظام عبر:

1. فحص TypeScript compilation: `npx tsc --noEmit`
2. اختبار يدوي لكل تفاعل:
   - تسجيل دخول موظف → إشعار نجاح
   - تسجيل دخول مدير → إشعار نجاح
   - إنشاء مكتب جديد → إشعار ترحيب
   - ربط الشبكة → إشعار نجاح/خطأ
   - إضافة معاملة → إشعار نجاح
   - إضافة مصروف → إشعار نجاح
   - إضافة/تعديل/حذف موظف → إشعارات
   - إضافة/تعديل/حذف خدمة → إشعارات
   - إغلاق اليوم → إشعار نجاح
   - حفظ الإعدادات → إشعار نجاح
   - النسخ الاحتياطي → إشعارات
   - الخروج → إشعار معلومات

[Implementation Order]
خطوات التنفيذ بالترتيب المنطقي:

1. إنشاء `src/components/Toast/types.ts` - تعريفات الأنواع
2. إنشاء `src/components/Toast/ToastProvider.tsx` - مزود الـ context
3. إنشاء `src/components/Toast/ToastItem.tsx` - مكون إشعار واحد
4. إنشاء `src/components/Toast/ToastContainer.tsx` - حاوية الإشعارات
5. إنشاء `src/components/Toast/useToast.ts` - hook للوصول
6. إنشاء `src/components/Toast/index.ts` - ملف التصدير
7. تحديث `src/App.tsx` - تغليف التطبيق بـ `ToastProvider` + `ToastContainer`
8. تحديث `src/hooks/useAuth.ts` - إضافة إشعارات لجميع عمليات المصادقة
9. تحديث `src/components/LandingPage.tsx` - استبدال الإشعارات المحلية
10. تحديث `src/components/FastEntryModal.tsx` - استبدال alert() والإشعارات المحلية
11. تحديث `src/components/ExpensesManager.tsx` - إضافة إشعارات
12. تحديث `src/components/EmployeesManager.tsx` - إضافة إشعارات
13. تحديث `src/components/ServicesManager.tsx` - إضافة إشعارات
14. تحديث `src/components/DayClosingManager.tsx` - إضافة إشعارات
15. تحديث `src/components/SettingsManager.tsx` - إضافة إشعارات
16. تحديث `src/components/EmployeePortal.tsx` - إضافة إشعارات
17. تحديث `src/components/Dashboard.tsx` - إضافة إشعارات
18. تحديث `src/components/TransactionsTable.tsx` - إضافة إشعارات
19. إضافة مفاتيح ترجمة جديدة في `src/lib/i18n.ts`
20. فحص TypeScript: `npx tsc --noEmit`
21. اختبار شامل لجميع التفاعلات