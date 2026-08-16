;--------------------------------
;Plugins
;https://nsis.sourceforge.io/ApplicationID_plug-in
;https://nsis.sourceforge.io/ShellExecAsUser_plug-in
;https://nsis.sourceforge.io/NsProcess_plugin
;https://nsis.sourceforge.io/Inetc_plug-in

!addplugindir "Plugins\x86-unicode"

;--------------------------------
;Version
    !include "version_define.nsh"

    !define PRODUCT_VERSION "${PRODUCT_VERSION_FROM_FILE}"
    !define VERSION "${DISPLAY_VERSION_FROM_FILE}"


    VIProductVersion "${PRODUCT_VERSION}"
    VIFileVersion "${PRODUCT_VERSION}"
    VIAddVersionKey "FileVersion" "${VERSION}"
    VIAddVersionKey "ProductName" "BetterVRCX"
    VIAddVersionKey "ProductVersion" "${VERSION}"
    VIAddVersionKey "LegalCopyright" "Copyright (c) 2026 Awake Ngine XE, Portion of (c) 2019-2026 pypy, Natsumi, Map1en"

    VIAddVersionKey "FileDescription" "BetterVRCX - Friendship management tool for VRChat"

;--------------------------------
;Include Modern UI

    !include "MUI2.nsh"
    !include "FileFunc.nsh"
    !include "LogicLib.nsh"
    !include "x64.nsh"


;--------------------------------
;General

    SetCompressor /SOLID lzma
    SetCompressorDictSize 16
    Unicode True
    Name "BetterVRCX"
    OutFile "BetterVRCX_Setup.exe"
    InstallDir "$PROGRAMFILES64\BetterVRCX"
    InstallDirRegKey HKLM "Software\BetterVRCX" "InstallDir"
    RequestExecutionLevel admin
    ShowInstDetails show

;--------------------------------
;Variables

    VAR upgradeInstallation

;--------------------------------
;Interface Settings

    !define MUI_ABORTWARNING

;--------------------------------
;Icons

    !define MUI_ICON "../images/BetterVRCX.ico"
    !define MUI_UNICON "../images/BetterVRCX.ico"

;--------------------------------
;Pages

    !insertmacro MUI_PAGE_LICENSE "../LICENSE"
    !insertmacro MUI_PAGE_DIRECTORY
    !insertmacro MUI_PAGE_INSTFILES
        !define MUI_FINISHPAGE_NOAUTOCLOSE
        !define MUI_FINISHPAGE_SHOWREADME ""
        !define MUI_FINISHPAGE_SHOWREADME_NOTCHECKED
        !define MUI_FINISHPAGE_SHOWREADME_TEXT "Create Desktop Shortcut"
        !define MUI_FINISHPAGE_SHOWREADME_FUNCTION createDesktopShortcut
        !define MUI_FINISHPAGE_RUN
        !define MUI_FINISHPAGE_RUN_TEXT "Start BetterVRCX"
        !define MUI_FINISHPAGE_RUN_FUNCTION launchBetterVRCX
    !insertmacro MUI_PAGE_FINISH

    !insertmacro MUI_UNPAGE_CONFIRM
    !insertmacro MUI_UNPAGE_INSTFILES

;--------------------------------
;Languages

    !insertmacro MUI_LANGUAGE "English"

;--------------------------------
;Macros

;--------------------------------
;Functions

Function SkipIfUpgrade
    StrCmp $upgradeInstallation 0 noUpgrade
        Abort
    noUpgrade:
FunctionEnd

Function .onInit
    ; Check if 64-bit Windows
    ${IfNot} ${RunningX64}
        MessageBox MB_OK|MB_ICONSTOP "This software only runs on 64-bit Windows." /SD IDOK
        Abort
    ${EndIf}

    ; Check if BetterVRCX or VRCX is already installed
    ReadRegStr $R0 HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\BetterVRCX" "UninstallString"
    StrCmp $R0 "" checkOldVrcx
        StrCpy $upgradeInstallation 1
        Goto notInstalled

    checkOldVrcx:
    ReadRegStr $R0 HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\VRCX" "UninstallString"
    StrCmp $R0 "" notInstalled
        StrCpy $upgradeInstallation 1

    notInstalled:

    ; If BetterVRCX is already running, display a warning message
    loop:
    StrCpy $1 "BetterVRCX.exe"
    nsProcess::_FindProcess "$1"
    Pop $R1
    ${If} $R1 = 0
        MessageBox MB_OKCANCEL|MB_ICONEXCLAMATION "BetterVRCX is still running. $\n$\nClick `OK` to kill the running process or `Cancel` to cancel this installer." /SD IDOK IDCANCEL cancel
            nsExec::ExecToStack "taskkill /IM BetterVRCX.exe"
    ${Else}
        Goto checkVrcxExe
    ${EndIf}
    Sleep 1000
    Goto loop

    checkVrcxExe:
    StrCpy $1 "VRCX.exe"
    nsProcess::_FindProcess "$1"
    Pop $R1
    ${If} $R1 = 0
        MessageBox MB_OKCANCEL|MB_ICONEXCLAMATION "VRCX is still running. $\n$\nClick `OK` to kill the running process or `Cancel` to cancel this installer." /SD IDOK IDCANCEL cancel
            nsExec::ExecToStack "taskkill /IM VRCX.exe"
    ${Else}
        Goto done
    ${EndIf}
    Sleep 1000
    Goto checkVrcxExe

    cancel:
        Abort
    done:
FunctionEnd

Function .onInstSuccess
    ${If} $upgradeInstallation = 1
        Call launchBetterVRCX
    ${EndIf}
FunctionEnd

Function createDesktopShortcut
    CreateShortcut "$DESKTOP\BetterVRCX.lnk" "$INSTDIR\BetterVRCX.exe"
FunctionEnd

Function launchBetterVRCX
    SetOutPath $INSTDIR
    ShellExecAsUser::ShellExecAsUser "" "$INSTDIR\BetterVRCX.exe" ""
FunctionEnd

;--------------------------------
;Installer Sections

Section "Install" SecInstall
    StrCmp $upgradeInstallation 0 noUpgrade
        DetailPrint "Uninstall previous version..."
        ExecWait '"$INSTDIR\Uninstall.exe" /S _?=$INSTDIR'
        Delete $INSTDIR\Uninstall.exe
        Goto afterUpgrade
    noUpgrade:

    inetc::get "https://aka.ms/vs/17/release/vc_redist.x64.exe" $TEMP\vcredist_x64.exe
    ExecWait "$TEMP\vcredist_x64.exe /install /quiet /norestart"
    Delete "$TEMP\vcredist_x64.exe"

    afterUpgrade:

    SetOutPath "$INSTDIR"

    File /r /x *.log /x *.pdb "..\build\Cef\*.*"

    WriteRegStr HKLM "Software\BetterVRCX" "InstallDir" $INSTDIR
    WriteUninstaller "$INSTDIR\Uninstall.exe"
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\BetterVRCX" "DisplayName" "BetterVRCX"
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\BetterVRCX" "Publisher" "awakenginexe"
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\BetterVRCX" "DisplayVersion" "${VERSION}"
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\BetterVRCX" "DisplayArch" "x64"
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\BetterVRCX" "InstallLocation" "$INSTDIR"
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\BetterVRCX" "UninstallString" "$\"$INSTDIR\Uninstall.exe$\""
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\BetterVRCX" "DisplayIcon" "$\"$INSTDIR\BetterVRCX.ico$\""

    ${GetSize} "$INSTDIR" "/S=0K" $0 $1 $2
    IntFmt $0 "0x%08X" $0
    WriteRegDWORD HKLM  "Software\Microsoft\Windows\CurrentVersion\Uninstall\BetterVRCX" "EstimatedSize" "$0"

    ${GetParameters} $R2
    ${GetOptions} $R2 /SKIP_SHORTCUT= $3
    StrCmp $3 "true" noShortcut
        CreateShortCut "$SMPROGRAMS\BetterVRCX.lnk" "$INSTDIR\BetterVRCX.exe"
        ApplicationID::Set "$SMPROGRAMS\BetterVRCX.lnk" "BetterVRCX"
    noShortcut:

    WriteRegStr HKCU "Software\Classes\vrcx" "" "URL:vrcx"
    WriteRegStr HKCU "Software\Classes\vrcx" "FriendlyTypeName" "BetterVRCX"
    WriteRegStr HKCU "Software\Classes\vrcx" "URL Protocol" ""
    WriteRegExpandStr HKCU "Software\Classes\vrcx\DefaultIcon" "" "$INSTDIR\BetterVRCX.ico"
    WriteRegStr HKCU "Software\Classes\vrcx\shell" "" "open"
    WriteRegStr HKCU "Software\Classes\vrcx\shell\open" "FriendlyAppName" "BetterVRCX"
    WriteRegStr HKCU "Software\Classes\vrcx\shell\open\command" "" '"$INSTDIR\BetterVRCX.exe" /uri="%1" /params="%2 %3 %4"'
SectionEnd

;--------------------------------
;Uninstaller Section

Section "Uninstall"
    ; If BetterVRCX is already running, display a warning message and exit
    StrCpy $1 "BetterVRCX.exe"
    nsProcess::_FindProcess "$1"
    Pop $R1
    ${If} $R1 = 0
        MessageBox MB_OK|MB_ICONEXCLAMATION "BetterVRCX is still running. Cannot uninstall this software.$\nPlease close BetterVRCX and try again." /SD IDOK
        Abort
    ${EndIf}

    RMDir /r "$INSTDIR"

    DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\BetterVRCX"
    DeleteRegKey HKLM "Software\BetterVRCX"
    DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\VRCX"
    DeleteRegKey HKLM "Software\VRCX"
    DeleteRegKey HKCU "Software\Classes\vrcx"

    ${IfNot} ${Silent}
        Delete "$SMPROGRAMS\BetterVRCX.lnk"
        Delete "$DESKTOP\BetterVRCX.lnk"
        Delete "$SMPROGRAMS\VRCX.lnk"
        Delete "$DESKTOP\VRCX.lnk"
    ${EndIf}
SectionEnd