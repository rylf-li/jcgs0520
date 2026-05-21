/**
 * 通用工具函数
 */

/**
 * 分页参数解析
 */
function getPagination(query) {
  const page = parseInt(query.page) || 1;
  const pageSize = Math.min(parseInt(query.pageSize) || 20, 100);
  const offset = (page - 1) * pageSize;
  const limit = pageSize;
  return { page, pageSize, offset, limit };
}

/**
 * 成功响应
 */
function success(res, data, message = '操作成功') {
  return res.json({ success: true, message, data });
}

/**
 * 失败响应
 */
function fail(res, message = '操作失败', code = 400) {
  return res.status(code).json({ success: false, message });
}

/**
 * 分页响应
 */
function paginate(res, rows, count, page, pageSize) {
  return res.json({
    success: true,
    data: rows,
    pagination: {
      total: count,
      page,
      pageSize,
      totalPages: Math.ceil(count / pageSize)
    }
  });
}

/**
 * 生成编号
 * @param {string} prefix - 前缀（如 'HT', 'DD', 'CW'）
 * @param {number} id - 数据库ID
 * @returns {string}
 */
function generateNo(prefix, id) {
  return `${prefix}${String(id).padStart(8, '0')}`;
}

module.exports = {
  getPagination,
  success,
  fail,
  paginate,
  generateNo
};
