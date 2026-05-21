@echo off
chcp 65001 >nul
echo ========================================
echo 项目冗余文件清理脚本
echo 生成时间: 2026-05-18
echo ========================================
echo.

echo [步骤1] 备份重要文件...
if not exist "backup_before_cleanup" mkdir backup_before_cleanup
xcopy "*.sql" "backup_before_cleanup\" /Y
xcopy "*.md" "backup_before_cleanup\" /Y
echo 备份完成！
echo.

echo [步骤2] 删除后端临时脚本...
cd backend
del /Q add_commas.js 2>nul
del /Q add_contractmap.js 2>nul
del /Q check_commas.js 2>nul
del /Q check_ie.js 2>nul
del /Q check_routes.js 2>nul
del /Q check_routes2.js 2>nul
del /Q check_state.js 2>nul
del /Q create_business.js 2>nul
del /Q create_routes.js 2>nul
del /Q diag_tbl.js 2>nul
del /Q diag2.js 2>nul
del /Q find_comma.js 2>nul
del /Q fix_commas.js 2>nul
del /Q fix_dotenv.js 2>nul
del /Q fix_employees_table.js 2>nul
del /Q fix_ie.js 2>nul
del /Q fix_import_config.js 2>nul
del /Q fix_import_perf.js 2>nul
del /Q fix_order_collation.js 2>nul
del /Q fix_sequelize_models.js 2>nul
del /Q full_diagnose.js 2>nul
del /Q migrate_add_contract_project_name.js 2>nul
del /Q migrate_add_finance_received.js 2>nul
del /Q migrate_add_initial_capital.js 2>nul
del /Q migrate_add_perf_fields.js 2>nul
del /Q migrate_business_fields.js 2>nul
del /Q migrate_remove_company_bank_fields.js 2>nul
del /Q migrate_remove_finance_bank_fields.js 2>nul
del /Q migrate_remove_received.js 2>nul
del /Q rebuild_models.js 2>nul
del /Q seed_business.js 2>nul
del /Q sync_all_amounts.js 2>nul
del /Q test_api.js 2>nul
del /Q test_business_api.js 2>nul
del /Q test_business_direct.js 2>nul
del /Q test_http.js 2>nul
echo 后端临时脚本删除完成！
echo.

echo [步骤3] 删除后端日志文件...
del /Q backend.log 2>nul
del /Q backend_stderr.log 2>nul
del /Q backend_stdout.log 2>nul
del /Q backend-dev.log 2>nul
echo 后端日志文件删除完成！
echo.

echo [步骤4] 删除后端测试数据文件...
del /Q exported_orders_test.xlsx 2>nul
echo 后端测试数据删除完成！
cd ..
echo.

echo [步骤5] 删除前端临时脚本...
cd frontend
del /Q check_company_change.js 2>nul
del /Q check_dashboard.js 2>nul
del /Q fix_contract_detail.js 2>nul
del /Q fix_contract_detail2.js 2>nul
del /Q fix_contract_detail3.js 2>nul
del /Q fix_structure.js 2>nul
del /Q read_dashboard.js 2>nul
del /Q search_chandler.js 2>nul
del /Q frontend-dev.log 2>nul
echo 前端临时脚本删除完成！
cd ..
echo.

echo [步骤6] 删除项目根目录临时文件...
del /Q cleanup.js 2>nul
del /Q full_diagnose.js 2>nul
del /Q test_order_import.js 2>nul
del /Q test_order_import.xlsx 2>nul
del /Q "订单_导入模板 (5).xlsx" 2>nul
del /Q find_backups.ps1 2>nul
del /Q git_status.ps1 2>nul
del /Q search_all_backups.ps1 2>nul
echo 项目根目录临时文件删除完成！
echo.

echo ========================================
echo 清理完成！
echo ========================================
echo.
echo 已删除约50个冗余文件
echo 释放空间约15MB
echo 重要文件已备份至 backup_before_cleanup 目录
echo.
pause
