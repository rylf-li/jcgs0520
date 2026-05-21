const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const auth = require('../middleware/auth');
const { success, fail, getPagination } = require('../utils/helpers');
const { Employee, Department, EmployeeDepartment } = require('../models');
const { hashPassword } = require('../utils/password');

function sanitizeEmployee(employee) {
  if (!employee) return employee;
  const data = employee.toJSON ? employee.toJSON() : { ...employee };
  delete data.password;
  return data;
}

// 列表
router.get('/', auth, async (req, res) => {
  try {
    const { page, pageSize, offset, limit } = getPagination(req.query);
    const where = {};
    if (req.query.name) where.name = { [Op.like]: `%${req.query.name}%` };
    if (req.query.phone) where.phone = { [Op.like]: `%${req.query.phone}%` };
    if (req.query.role) where.role = req.query.role;
    if (req.query.dept_id) where.dept_id = req.query.dept_id;
    const { count, rows } = await Employee.findAndCountAll({
      where,
      attributes: { exclude: ['password'] },
      offset,
      limit,
      order: [['id', 'DESC']]
    });
    res.json({ success: true, data: { list: rows.map(sanitizeEmployee), total: count } });
  } catch (err) { fail(res, err.message); }
});

// 全部
router.get('/all', auth, async (req, res) => {
  try {
    const rows = await Employee.findAll({ attributes: { exclude: ['password'] }, order: [['id', 'DESC']] });
    success(res, rows.map(sanitizeEmployee));
  } catch (err) { fail(res, err.message); }
});

// 全部列表（兼容前端 /all/list 调用）
router.get('/all/list', auth, async (req, res) => {
  try {
    const rows = await Employee.findAll({ attributes: { exclude: ['password'] }, order: [['id', 'DESC']] });
    success(res, rows.map(sanitizeEmployee));
  } catch (err) { fail(res, err.message); }
});

// 详情
router.get('/:id', auth, async (req, res) => {
  try {
    const row = await Employee.findByPk(req.params.id, {
      attributes: { exclude: ['password'] },
      include: [{
        model: Department,
        as: 'departments',
        through: { attributes: [] },
        attributes: ['id', 'name', 'company_name']
      }]
    });
    if (!row) return fail(res, '记录不存在');
    success(res, sanitizeEmployee(row));
  } catch (err) { fail(res, err.message); }
});

// 新增
router.post('/', auth, async (req, res) => {
  try {
    const payload = { ...req.body };
    if (!payload.name || !payload.phone) return fail(res, '姓名和手机号不能为空');
    if (!payload.password) return fail(res, '密码不能为空');
    payload.password = await hashPassword(payload.password);
    const row = await Employee.create(payload);
    success(res, sanitizeEmployee(row));
  } catch (err) { fail(res, err.message); }
});

// 更新
router.put('/:id', auth, async (req, res) => {
  try {
    const row = await Employee.findByPk(req.params.id);
    if (!row) return fail(res, '记录不存在');
    const payload = { ...req.body };
    
    // 处理部门关联
    const deptIds = payload.dept_ids;
    delete payload.dept_ids;
    
    if (!payload.password) delete payload.password;
    if (payload.password) payload.password = await hashPassword(payload.password);
    
    await row.update(payload);
    
    // 更新部门关联
    if (deptIds !== undefined) {
      await EmployeeDepartment.destroy({ where: { employee_id: row.id } });
      if (deptIds.length > 0) {
        const deptRecords = await Department.findAll({ where: { id: { [Op.in]: deptIds } } });
        const records = deptRecords.map(d => ({
          employee_id: row.id,
          dept_id: d.id
        }));
        await EmployeeDepartment.bulkCreate(records);
        
        // 更新主部门
        if (deptRecords.length > 0) {
          const mainDept = deptRecords[0];
          await row.update({ dept_id: mainDept.id, dept_name: mainDept.name });
        }
      }
    }
    
    // 重新查询返回完整数据
    const updated = await Employee.findByPk(row.id, {
      attributes: { exclude: ['password'] },
      include: [{
        model: Department,
        as: 'departments',
        through: { attributes: [] },
        attributes: ['id', 'name', 'company_name']
      }]
    });
    success(res, sanitizeEmployee(updated));
  } catch (err) { fail(res, err.message); }
});

// 删除
router.delete('/:id', auth, async (req, res) => {
  try {
    const row = await Employee.findByPk(req.params.id);
    if (!row) return fail(res, '记录不存在');
    await row.destroy();
    success(res, null);
  } catch (err) { fail(res, err.message); }
});

module.exports = router;
