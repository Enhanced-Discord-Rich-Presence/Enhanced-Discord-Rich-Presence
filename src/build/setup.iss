#define FileHandle FileOpen("..\App\version.txt")
#define MyAppVersion FileRead(FileHandle)
#expr FileClose(FileHandle)

[Setup]
AppName=Enhanced Discord RPC
AppId={{3879D6CE-2CFB-457E-B3F6-592678F9A251}}
AppVersion={#MyAppVersion}
DefaultDirName={localappdata}\Enhanced Discord RPC
DefaultGroupName=Enhanced Discord RPC
UninstallDisplayIcon={app}\EnhancedRPC.exe
SetupIconFile=..\Extension\src\icons\icon.ico
Compression=lzma2
DisableWelcomePage=no
WizardStyle=modern
SolidCompression=yes
OutputDir=..\Releases
OutputBaseFilename=EnhancedRPC-{#MyAppVersion}-windows-setup
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
PrivilegesRequired=lowest
CloseApplications=no

[Files]
Source: "..\src\App\dist\EnhancedRPC.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\src\App\version.txt"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\src\App\app_manifest.firefox.json"; DestDir: "{app}"; Flags: ignoreversion; AfterInstall: UpdateFirefoxManifestPath
Source: "..\src\App\app_manifest.chrome.json"; DestDir: "{app}"; Flags: ignoreversion; AfterInstall: UpdateChromeManifestPath
;Source: "..\src\App\app_manifest.edge.json"; DestDir: "{app}"; Flags: ignoreversion; AfterInstall: UpdateEdgeManifestPath

[Registry]
Root: HKCU; Subkey: "Software\Mozilla\NativeMessagingHosts\com.enhanced.rpc.bridge"; ValueType: string; ValueName: ""; ValueData: "{app}\app_manifest.firefox.json"; Flags: uninsdeletekey
Root: HKCU; Subkey: "Software\Google\Chrome\NativeMessagingHosts\com.enhanced.rpc.bridge"; ValueType: string; ValueName: ""; ValueData: "{app}\app_manifest.chrome.json"; Flags: uninsdeletekey

Root: HKCU; Subkey: "Software\BraveSoftware\Brave-Browser\NativeMessagingHosts\com.enhanced.rpc.bridge"; ValueType: string; ValueName: ""; ValueData: "{app}\app_manifest.chrome.json"; Flags: uninsdeletekey
;Root: HKCU; Subkey: "Software\Microsoft\Edge\NativeMessagingHosts\com.enhanced.rpc.bridge"; ValueType: string; ValueName: ""; ValueData: "{app}\app_manifest.edge.json"; Flags: uninsdeletekey
Root: HKCU; Subkey: "Software\Vivaldi\NativeMessagingHosts\com.enhanced.rpc.bridge"; ValueType: string; ValueName: ""; ValueData: "{app}\app_manifest.chrome.json"; Flags: uninsdeletekey
Root: HKCU; Subkey: "Software\Opera Software\NativeMessagingHosts\com.enhanced.rpc.bridge"; ValueType: string; ValueName: ""; ValueData: "{app}\app_manifest.chrome.json"; Flags: uninsdeletekey
Root: HKCU; Subkey: "Software\Opera Software\Opera GX\NativeMessagingHosts\com.enhanced.rpc.bridge"; ValueType: string; ValueName: ""; ValueData: "{app}\app_manifest.chrome.json"; Flags: uninsdeletekey
Root: HKCU; Subkey: "Software\Chromium\NativeMessagingHosts\com.enhanced.rpc.bridge"; ValueType: string; ValueName: ""; ValueData: "{app}\app_manifest.chrome.json"; Flags: uninsdeletekey

[InstallDelete]
Type: files; Name: "{app}\bridge.exe"

[Code]
function PrepareToInstall(var NeedsRestart: Boolean): String;
var
  SignalPath: String;
begin
  Result := ''; 
  SignalPath := ExpandConstant('{app}\terminate.signal');

  if ForceDirectories(ExpandConstant('{app}')) then
  begin
    if SaveStringToFile(SignalPath, '', False) then
    begin
      Sleep(3000);
    end;
  end; 
end;

procedure CurStepChanged(CurStep: TSetupStep);
begin
  if CurStep = ssPostInstall then
  begin
    DeleteFile(ExpandConstant('{app}\terminate.signal'));
  end;
end;


procedure ProcessManifestFile(FileName: String);
var
  ManifestPath: String;
  ExePath: String;
  FileDataAnsi: AnsiString;
  FileDataUnicode: String; 
begin
  ManifestPath := ExpandConstant('{app}\' + FileName);
  ExePath := ExpandConstant('{app}\EnhancedRPC.exe');
  
  StringChangeEx(ExePath, '\', '\\', True);

  if LoadStringFromFile(ManifestPath, FileDataAnsi) then
  begin
    FileDataUnicode := String(FileDataAnsi);

    if StringChangeEx(FileDataUnicode, '%placeholder%', ExePath, True) > 0 then
    begin
      SaveStringToFile(ManifestPath, AnsiString(FileDataUnicode), False);
    end;
  end;
end;

procedure UpdateFirefoxManifestPath();
begin
  ProcessManifestFile('app_manifest.firefox.json');
end;

procedure UpdateChromeManifestPath();
begin
  ProcessManifestFile('app_manifest.chrome.json');
end;

//procedure UpdateEdgeManifestPath();
//begin
//  ProcessManifestFile('app_manifest.edge.json');
//end;