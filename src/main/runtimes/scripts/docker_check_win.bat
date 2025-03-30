@echo off
setlocal enabledelayedexpansion

REM Refresh environment variables
REM This is to ensure that any recent changes to environment variables are reflected
REM For example, if Docker was just installed and updated the PATH variable

call refreshenv

set "POWERSHELL_PATH=%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe"

REM Check if Docker is installed and responding
docker --version > nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Docker not installed
    echo NOT INSTALLED
    exit 0
)

REM Check if Docker daemon is running
docker info > nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Docker daemon is not running. Attempting to start Docker...
    
    REM Check if Docker Desktop exists in the standard location
    if exist "C:\Program Files\Docker\Docker\Docker Desktop.exe" (
        echo Starting Docker Desktop...
        %POWERSHELL_PATH% -Command "Start-Process 'C:\Program Files\Docker\Docker\Docker Desktop.exe'" > nul 2>&1
        
        echo Waiting for Docker to start...
        
        REM Try for 2 minutes (24 attempts, 5 seconds each)
        for /l %%i in (1,1,24) do (
            timeout /t 5 /nobreak > nul
            docker info > nul 2>&1
            if !ERRORLEVEL! EQU 0 (
                echo Docker started successfully
                
                REM Check and set Docker to run on startup
                echo Checking if Docker Desktop is set to run on startup...
                reg query "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" /v DockerDesktop >nul 2>&1
                if errorlevel 1 (
                    echo Docker Desktop is not set to run on startup.
                    echo Adding startup registry key...
                    %POWERSHELL_PATH% -Command "Set-ItemProperty -Path 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Run' -Name 'DockerDesktop' -Value '\"C:\Program Files\Docker\Docker\Docker Desktop.exe\" -Autostart'" > nul 2>&1
                    if errorlevel 1 (
                        echo Failed to add the startup registry key.
                    ) else (
                        echo Registry key added successfully.
                    )
                ) else (
                    echo Docker Desktop is already configured to start on login.
                )
                
                echo RUNNING
                exit 0
            )
            echo Still waiting for Docker to start... Attempt %%i of 24
        )
    ) else (
        echo Docker Desktop executable not found
    )
    
    echo Failed to start Docker daemon
    echo NOT RUNNING
    exit 0
)

echo Docker is running
echo RUNNING

exit 0
