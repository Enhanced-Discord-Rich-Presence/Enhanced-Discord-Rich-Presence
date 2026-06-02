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
Source: "..\App\dist\EnhancedRPC.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\App\version.txt"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\App\app_manifest.firefox.json"; DestDir: "{app}"; Flags: ignoreversion; AfterInstall: UpdateFirefoxManifestPath
Source: "..\App\app_manifest.chrome.json"; DestDir: "{app}"; Flags: ignoreversion; AfterInstall: UpdateChromeManifestPath

[Registry]
Root: HKCU; Subkey: "Software\Mozilla\NativeMessagingHosts\com.enhanced.rpc.bridge"; ValueType: string; ValueName: ""; ValueData: "{app}\app_manifest.firefox.json"; Flags: uninsdeletekey
Root: HKCU; Subkey: "Software\Google\Chrome\NativeMessagingHosts\com.enhanced.rpc.bridge"; ValueType: string; ValueName: ""; ValueData: "{app}\app_manifest.chrome.json"; Flags: uninsdeletekey

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