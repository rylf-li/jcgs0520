/**
 * 登录认证路由
 * POST /api/auth/login - 登录
 * POST /api/auth/register - 注册
 * GET /api/auth/me - 获取当前用户
 */
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const auth = require('../middleware/auth');
const { Employee } = require('../models');
const { success, fail } = require('../utils/helpers');
const { hashPassword, looksHashed, verifyPassword } = require('../utils/password');

const JWT_SECRET = process.env.JWT_SECRET || 'engineering_mgmt_jwt_secret_2024';

function buildAuthPayload(employee) {
  return {
    id: employee.id,
    name: employee.name,
    phone: employee.phone,
    role: employee.role,
    dept_id: employee.dept_id,
    dept_name: employee.dept_name,
    company_id: employee.company_id,
    company_name: employee.company_name,
  };
}

// 登录
router.post('/login', async (req, res) => {
  try {
    const { phone, password } = req.body;
    if (!phone || !password) return fail(res, '手机号和密码不能为空');

    const employee = await Employee.findOne({ where: { phone, status: 1 } });
    if (!employee) return fail(res, '用户不存在或已停用');

    const valid = await verifyPassword(password, employee.password);
    if (!valid) return fail(res, '密码错误');

    if (!looksHashed(employee.password)) {
      employee.password = await hashPassword(password);
      await employee.save();
    }

    const token = jwt.sign(
      buildAuthPayload(employee),
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    success(res, { token, user: buildAuthPayload(employee) });
  } catch (err) {
    fail(res, err.message);
  }
});

// 注册
router.post('/register', async (req, res) => {
  try {
    const { name, password, phone, dept_name, dept_id, company_id, company_name, role } = req.body;
    if (!name || !phone || !password) return fail(res, '姓名、手机号和密码不能为空');

    const existing = await Employee.findOne({ where: { phone } });
    if (existing) return fail(res, '手机号已存在');

    const employee = await Employee.create({
      name,
      phone,
      password: await hashPassword(password),
      dept_name,
      dept_id,
      company_id,
      company_name,
      role: role || 'staff'
    });
    success(res, { id: employee.id, name: employee.name, phone: employee.phone });
  } catch (err) {
    fail(res, err.message);
  }
});

router.post('/change-password', auth, async (req, res) => {
  try {
    const currentPassword = req.body.currentPassword || req.body.old_password || req.body.oldPassword;
    const newPassword = req.body.newPassword || req.body.new_password;
    if (!currentPassword || !newPassword) return fail(res, '原密码和新密码不能为空');
    if (String(newPassword).length < 6) return fail(res, '新密码至少 6 位');

    const employee = await Employee.findByPk(req.user.id);
    if (!employee) return fail(res, '用户不存在', 404);

    const valid = await verifyPassword(currentPassword, employee.password);
    if (!valid) return fail(res, '原密码错误');

    employee.password = await hashPassword(newPassword);
    await employee.save();
    success(res, null, '密码修改成功');
  } catch (err) {
    fail(res, err.message);
  }
});

// 获取当前用户
router.get('/me', auth, async (req, res) => {
  try {
    const employee = await Employee.findByPk(req.user.id);
    if (!employee) return fail(res, '用户不存在', 401);

    success(res, buildAuthPayload(employee));
  } catch (err) {
    if (err.name === 'TokenExpiredError') return fail(res, '令牌已过期', 401);
    fail(res, '无效的令牌', 401);
  }
});

module.exports = router;
