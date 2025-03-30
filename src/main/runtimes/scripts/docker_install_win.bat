@echo off
setlocal enabledelayedexpansion

echo Checking Docker installation...

:: Define PowerShell path
set "POWERSHELL_PATH=%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe"

:: Check if docker command is available in path
docker --version >nul 2>&1
if !ERRORLEVEL! EQU 0 (
    echo Docker is installed and in PATH
    goto :check_service
) else (
    echo Docker command not found. Checking if Docker Desktop is installed...
    if exist "C:\Program Files\Docker\Docker\Docker Desktop.exe" (
        echo Docker is installed but not in PATH. Adding to PATH...
        
        :: Get current system PATH and add Docker paths
        %POWERSHELL_PATH% -Command "$dockerPaths = 'C:\Program Files\Docker\Docker\resources\bin;C:\ProgramData\DockerDesktop\version-bin'; $currentPath = [Environment]::GetEnvironmentVariable('PATH', 'Machine'); if (-not $currentPath.Contains($dockerPaths)) { $newPath = $currentPath + ';' + $dockerPaths; [Environment]::SetEnvironmentVariable('PATH', $newPath, 'Machine'); Write-Host 'Docker paths added to system PATH.' }"
        
        :: Refresh current session PATH
        for /f "tokens=*" %%a in ('%POWERSHELL_PATH% -Command "[Environment]::GetEnvironmentVariable('PATH', 'Machine')"') do set "PATH=%%a"
        
        :: Verify docker is now in PATH
        docker --version >nul 2>&1
        if !ERRORLEVEL! NEQ 0 (
            echo PATH update requires a terminal restart. Please restart your terminal after installation.
        ) else (
            echo Docker successfully added to PATH
        )
        goto :check_service
    ) else (
        echo Docker is not installed. Installing Docker Desktop...
        :: Check if winget is available
        winget --version >nul 2>&1
        if !ERRORLEVEL! EQU 0 (
            echo Winget is installed. Installing Docker Desktop...
            winget install Docker.DockerDesktop
        ) else (
            echo Winget is not installed. Using direct download...
            %POWERSHELL_PATH% -Command "$installerUrl = 'https://desktop.docker.com/win/main/amd64/Docker Desktop Installer.exe'; $installerPath = Join-Path $env:TEMP 'DockerDesktopInstaller.exe'; Write-Host 'Downloading Docker Desktop...'; Invoke-WebRequest -Uri $installerUrl -OutFile $installerPath; Write-Host 'Installing Docker Desktop...'; Start-Process -FilePath $installerPath -ArgumentList 'install', '--quiet', '--always-run-service' -Wait; Write-Host 'Installation complete.'"
        )
        
        echo Adding Docker to PATH...
        :: Add Docker paths to system PATH
        %POWERSHELL_PATH% -Command "$dockerPaths = 'C:\Program Files\Docker\Docker\resources\bin;C:\ProgramData\DockerDesktop\version-bin'; $currentPath = [Environment]::GetEnvironmentVariable('PATH', 'Machine'); if (-not $currentPath.Contains($dockerPaths)) { $newPath = $currentPath + ';' + $dockerPaths; [Environment]::SetEnvironmentVariable('PATH', $newPath, 'Machine'); Write-Host 'Docker paths added to system PATH.' }"
        
        :: Refresh current session PATH
        for /f "tokens=*" %%a in ('%POWERSHELL_PATH% -Command "[Environment]::GetEnvironmentVariable('PATH', 'Machine')"') do set "PATH=%%a"
        
        echo PATH has been updated. You will need to restart your terminal to use Docker commands.
    )
)

:check_service
echo Checking Docker service status...
%POWERSHELL_PATH% -Command "Get-Process 'Docker Desktop' -ErrorAction SilentlyContinue" >nul 2>&1
if !ERRORLEVEL! EQU 0 (
    echo Docker Desktop is already running
) else (
    echo Starting Docker service...
    %POWERSHELL_PATH% -Command "Start-Process 'C:\Program Files\Docker\Docker\Docker Desktop.exe' -WindowStyle Hidden"
)

:: Wait for Docker to be responsive
echo Waiting for Docker to be ready...
:docker_check
%POWERSHELL_PATH% -Command "Start-Sleep -Seconds 5" >nul
docker info >nul 2>&1
if !ERRORLEVEL! NEQ 0 (
    echo Docker is still starting...
    goto :docker_check
)

echo Docker is ready to use!
echo NOTE: If Docker commands are not recognized, please restart your terminal.
endlocal 