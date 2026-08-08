!include "WinMessages.nsh"

!macro customInstall
  DetailPrint "Enabling Codex Avatars lifecycle hooks"
  WriteRegExpandStr HKCU "Environment" "CODEX_AVATARS_APP" "$INSTDIR\${APP_EXECUTABLE_FILENAME}"
  SendMessage ${HWND_BROADCAST} ${WM_SETTINGCHANGE} 0 "STR:Environment" /TIMEOUT=5000
  ExecWait '"$INSTDIR\${APP_EXECUTABLE_FILENAME}" --install-hooks' $0
  DetailPrint "Codex Avatars integration exit code: $0"
!macroend

!macro customUnInstall
  DetailPrint "Removing Codex Avatars lifecycle hooks"
  ExecWait '"$INSTDIR\${APP_EXECUTABLE_FILENAME}" --uninstall-hooks' $0
  ReadRegStr $1 HKCU "Environment" "CODEX_AVATARS_APP"
  StrCmp $1 "$INSTDIR\${APP_EXECUTABLE_FILENAME}" 0 +2
  DeleteRegValue HKCU "Environment" "CODEX_AVATARS_APP"
  SendMessage ${HWND_BROADCAST} ${WM_SETTINGCHANGE} 0 "STR:Environment" /TIMEOUT=5000
!macroend
