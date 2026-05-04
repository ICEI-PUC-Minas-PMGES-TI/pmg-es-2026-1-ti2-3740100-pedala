@REM Maven Wrapper for Windows
@REM Downloads Maven if not available
@echo off

set MAVEN_PROJECTBASEDIR=%~dp0

@REM Check if mvn is available
where mvn >nul 2>&1
if %ERRORLEVEL% equ 0 (
    mvn %*
    exit /b %ERRORLEVEL%
)

@REM Check for local Maven
set LOCAL_MAVEN=%MAVEN_PROJECTBASEDIR%.mvn\maven\bin\mvn.cmd
if exist "%LOCAL_MAVEN%" (
    "%LOCAL_MAVEN%" %*
    exit /b %ERRORLEVEL%
)

@REM Download Maven
echo Maven not found. Downloading Maven 3.9.9...
set MAVEN_URL=https://repo.maven.apache.org/maven2/org/apache/maven/apache-maven/3.9.9/apache-maven-3.9.9-bin.zip
set MAVEN_ZIP=%MAVEN_PROJECTBASEDIR%.mvn\maven.zip
set MAVEN_DIR=%MAVEN_PROJECTBASEDIR%.mvn\maven

if not exist "%MAVEN_PROJECTBASEDIR%.mvn" mkdir "%MAVEN_PROJECTBASEDIR%.mvn"

powershell -Command "Invoke-WebRequest -Uri '%MAVEN_URL%' -OutFile '%MAVEN_ZIP%'"
if %ERRORLEVEL% neq 0 (
    echo Failed to download Maven.
    echo Please install Maven manually: https://maven.apache.org/download.cgi
    exit /b 1
)

powershell -Command "Expand-Archive -Path '%MAVEN_ZIP%' -DestinationPath '%MAVEN_PROJECTBASEDIR%.mvn' -Force"
if exist "%MAVEN_PROJECTBASEDIR%.mvn\apache-maven-3.9.9" (
    rename "%MAVEN_PROJECTBASEDIR%.mvn\apache-maven-3.9.9" maven
)
del "%MAVEN_ZIP%" 2>nul

if exist "%LOCAL_MAVEN%" (
    echo Maven 3.9.9 installed successfully!
    "%LOCAL_MAVEN%" %*
    exit /b %ERRORLEVEL%
) else (
    echo Maven installation failed.
    exit /b 1
)
