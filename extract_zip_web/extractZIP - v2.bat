REM ayrı ayrı olan bolge klasorlerinin hepsini C:\BerkSRC icerisine atiyoruz
REM her klasore girip zip dosyalarini acip, C:\BerkDST içerisine otomatik atiyor

@echo off
REM =====================================================================
REM ZIP File Extraction Utility
REM =====================================================================
REM Purpose: Automatically extracts all zip files from a source directory
REM          and its subdirectories into a single destination folder
REM 
REM Requirements: 
REM   - 7-Zip must be installed and available in the system PATH
REM
REM Usage:
REM   1. Place all folders containing ZIP files into C:\BerkSRC
REM   2. Run this script
REM   3. All ZIP files will be extracted to C:\BerkDST
REM =====================================================================

setlocal
REM Define source and destination directories
set "srcfolder=C:\BerkSRC"
set "dstfolder=C:\BerkDST"

REM Check if source folder exists
if not exist "%srcfolder%" (
  echo Source folder not found: %srcfolder%
  echo Please create this folder and place your ZIP files inside before running this script.
  exit /b 1
)

REM Create destination folder if it doesn't exist
if not exist "%dstfolder%" (
  mkdir "%dstfolder%"
  echo Created destination folder: %dstfolder%
)

REM Process all ZIP files recursively in the source folder
echo Starting extraction of all ZIP files from %srcfolder% to %dstfolder%...
echo =====================================================================
for /f "usebackq tokens=*" %%f in (`dir /b /s "%srcfolder%\*.zip"`) do (
  echo Processing: %%f
  7z x "%%f" -o"%dstfolder%"
  echo Extracted "%%f" to "%dstfolder%"
  echo ---------------------------------------------------
)

echo =====================================================================
echo Extraction process completed!
echo All ZIP files have been extracted to: %dstfolder%
echo =====================================================================
endlocal
pause