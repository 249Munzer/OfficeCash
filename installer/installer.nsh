; =============================================================================
; OfficeCash — تخصيص مثبّت NSIS (installer.nsh)
; يتضمن: صفحة ترحيب «نبذة عن التطبيق» ثنائية اللغة، صفحة إنهاء مع خيار التشغيل،
;        صفحة «الحفاظ على البيانات» في معالج الإلغاء، وحماية قاعدة بيانات المكتب.
; ملاحظة: ملف التخصيص هذا يُضمَّن قبل MUI2.nsh، لذلك تُعرَّف الدوال التي
; تستخدم ماكرو MUI2 داخل الماكرو المستدعى لاحقاً (custom*Macro).
; الترقيم اللغوي: 1033 = الإنجليزية (en_US) ، 1025 = العربية (ar_SA)
; =============================================================================

; ----------------------------- نصوص ثنائية اللغة -----------------------------
LangString ABOUT_TITLE 1033 "About OfficeCash"
LangString ABOUT_TITLE 1025 "نبذة عن OfficeCash"
LangString ABOUT_SUBTITLE 1033 "OfficeCash — office cash book management"
LangString ABOUT_SUBTITLE 1025 "OfficeCash — إدارة يوميات المكتب"
LangString ABOUT_TEXT 1033 "OfficeCash manages your office cash book: employee revenue, expenses, day closing and local LAN sync between devices.$\r$\n$\r$\nClick Next to continue."
LangString ABOUT_TEXT 1025 "OfficeCash هو نظام إدارة يوميات المكتب: إيرادات الموظفين، المصروفات، إقفال اليوم، والمزامنة المحلية بين الأجهزة.$\r$\n$\r$\nاضغط «التالي» للمتابعة."

LangString FINISH_TEXT 1033 "OfficeCash ${VERSION} has been installed on your computer. Click Finish to close this wizard."
LangString FINISH_TEXT 1025 "تم تثبيت OfficeCash ${VERSION} على جهازك. اضغط «إنهاء» لإغلاق المعالج."

LangString UN_KEEPDATA_TITLE 1033 "Keep Your Data"
LangString UN_KEEPDATA_TITLE 1025 "الحفاظ على بياناتك"
LangString UN_KEEPDATA_SUBTITLE 1033 "Choose whether your office data is deleted."
LangString UN_KEEPDATA_SUBTITLE 1025 "اختر ما إذا كانت بيانات مكتبك ستُحذف."
LangString UN_KEEPDATA_DESC 1033 "Uninstalling OfficeCash will remove the program files only.$\r$\nIf you uncheck the option below, your office database (office_cash.db) and all settings will be permanently deleted and cannot be recovered."
LangString UN_KEEPDATA_DESC 1025 "إلغاء تثبيت OfficeCash سيحذف ملفات البرنامج فقط.$\r$\nإن ألغيت تحديد الخيار أدناه فستُحذف قاعدة بيانات مكتبك (office_cash.db) وكل الإعدادات نهائياً دون إمكانية استعادتها."
LangString UN_KEEPDATA_CHECK 1033 "Keep my office data and its database (recommended)"
LangString UN_KEEPDATA_CHECK 1025 "احتفظ ببيانات مكتبي وقاعدة بياناته (موصى به)"

; ----------------------------- صفحة الترحيب «نبذة عن التطبيق» -----------------------------
!macro customWelcomePage
  Function ShowAboutPage
    !insertmacro MUI_HEADER_TEXT "$(ABOUT_TITLE)" "$(ABOUT_SUBTITLE)"
    nsDialogs::Create 1018
    Pop $0
    ${If} $0 == error
      Abort
    ${EndIf}
    ${NSD_CreateLabel} 0 0 100% 100% "$(ABOUT_TEXT)"
    Pop $0
    nsDialogs::Show
  FunctionEnd
  Page custom ShowAboutPage
!macroend

; ----------------------------- صفحة الإنهاء (مع خيار التشغيل) -----------------------------
!macro customFinishPage
  !ifndef MUI_FINISHPAGE_TEXT
    !define MUI_FINISHPAGE_TEXT "$(FINISH_TEXT)"
  !endif
  !define MUI_FINISHPAGE_RUN
  !define MUI_FINISHPAGE_RUN_FUNCTION "StartApp"
  Function StartApp
    ${if} ${isUpdated}
      StrCpy $1 "--updated"
    ${else}
      StrCpy $1 ""
    ${endif}
    ${StdUtils.ExecShellAsUser} $0 "$launchLink" "open" "$1"
  FunctionEnd
  !insertmacro MUI_PAGE_FINISH
!macroend

; ----------------------------- معالج الإلغاء: صفحة الحفاظ على البيانات -----------------------------
!ifdef BUILD_UNINSTALLER
  Var UnKeepDataCheckbox
!endif

!macro customUnInit
  StrCpy $UnKeepDataCheckbox ""
!macroend

!macro customUnWelcomePage
  Function un.ShowKeepDataPage
    !insertmacro MUI_HEADER_TEXT "$(UN_KEEPDATA_TITLE)" "$(UN_KEEPDATA_SUBTITLE)"
    nsDialogs::Create 1018
    Pop $0
    ${If} $0 == error
      Abort
    ${EndIf}
    ${NSD_CreateLabel} 0 0 100% 44u "$(UN_KEEPDATA_DESC)"
    Pop $0
    ${NSD_CreateCheckBox} 0 52u 100% 14u "$(UN_KEEPDATA_CHECK)"
    Pop $UnKeepDataCheckbox
    ${NSD_SetState} $UnKeepDataCheckbox 1
    nsDialogs::Show
  FunctionEnd
  PageEx un.custom
    PageCallbacks un.ShowKeepDataPage
  PageExEnd
!macroend

; ----------------------------- منطق حذف البيانات عند الإلغاء -----------------------------
!macro customUnInstall
  ${IfNot} ${Silent}
    ${NSD_GetState} $UnKeepDataCheckbox $0
    ${If} $0 == 0
      ; المستخدم اختار الحذف الكامل: حذف مجلد بيانات التطبيق نهائياً
      ${if} $installMode == "all"
        SetShellVarContext current
      ${endif}
      RMDir /r "$APPDATA\OfficeCash"
      RMDir /r "$APPDATA\office-cash-desktop"
      ${if} $installMode == "all"
        SetShellVarContext all
      ${endif}
    ${EndIf}
  ${EndIf}
!macroend
