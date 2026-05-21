@echo off
chcp 65001 >nul
echo ========================================
echo 数据库自动备份脚本
echo ========================================

set BACKUP_DIR=D:\应用开发\engineering-mgmt0511hw（0518）\database_backup
set DB_NAME=engineering_mgmt
set DB_USER=root
set DB_PASS=jc147258

REM 创建备份目录
if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

REM 生成备份文件名（带时间戳）
for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /format:list') do set datetime=%%I
set BACKUP_FILE=%BACKUP_DIR%\%DB_NAME%_backup_%datetime:~0,8%_%datetime:~8,6%.sql

REM 执行备份
echo 正在备份数据库 %DB_NAME% ...
mysqldump -u %DB_USER% -p%DB_PASS% --databases %DB_NAME% --routines --triggers --events > "%BACKUP_FILE%"

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✅ 备份成功！
    echo 备份文件：%BACKUP_FILE%
    
    REM 显示文件大小
    for %%A in ("%BACKUP_FILE%") do echo 文件大小：%%~zA 字节
    
    REM 清理30天前的旧备份
    echo.
    echo 清理30天前的旧备份...
    forfiles /P "%BACKUP_DIR%" /M %DB_NAME%_backup_*.sql /D -30 /C "cmd /c del @path" 2>nul
    
) else (
    echo.
    echo ❌ 备份失败！
    echo 请检查数据库连接配置
)

echo.
pause
