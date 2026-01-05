#define FileHandle FileOpen("App\version.txt")
#define MyAppVersion FileRead(FileHandle)
#expr FileClose(FileHandle)

[Setup]
AppName=Enhanced Discord RPC
AppId={{3879D6CE-2CFB-457E-B3F6-592678F9A251}}
AppVersion={#MyAppVersion}
DefaultDirName={localappdata}\Enhanced Discord RPC
DefaultGroupName=Enhanced Discord RPC
UninstallDisplayIcon={app}\bridge.exe
SetupIconFile=Extension\src\icons\icon.ico
AppMutex=EnhancedDiscordRPC_Mutex
Compression=lzma2
DisableWelcomePage=no
WizardStyle=modern
SolidCompression=yes
OutputDir=Releases
OutputBaseFilename=Enhanced_RPC_Installer_{#MyAppVersion}
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
PrivilegesRequired=lowest
CloseApplications=yes

[Files]
Source: "App\dist\bridge.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "App\app_manifest.json"; DestDir: "{app}"; Flags: ignoreversion; AfterInstall: UpdateManifestPath

[Registry]
Root: HKCU; Subkey: "Software\Mozilla\NativeMessagingHosts\com.enhanced.rpc.bridge"; ValueType: string; ValueName: ""; ValueData: "{app}\app_manifest.json"; Flags: uninsdeletekey

[Code]
procedure UpdateManifestPath();
var
  ManifestPath: String;
  ExePath: String;
  FileDataAnsi: AnsiString;
  FileDataUnicode: String; 
begin
  ManifestPath := ExpandConstant('{localappdata}\Enhanced Discord RPC\app_manifest.json');
  ExePath := ExpandConstant('{localappdata}\Enhanced Discord RPC\bridge.exe');
  
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