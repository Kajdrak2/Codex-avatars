!macro customUnInstall
  DetailPrint "Removing Codex Avatars lifecycle hooks"
  ExecWait '"$INSTDIR\${APP_EXECUTABLE_FILENAME}" --uninstall-hooks' $0
!macroend
