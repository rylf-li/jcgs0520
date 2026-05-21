const { Op } = require('sequelize');

function isSalesUser(req) {
  return req.user?.role === 'sales';
}

function getSalesCondition(req, idField = 'salesman_id', nameField = 'salesman') {
  return {
    [Op.or]: [
      { [idField]: req.user.id },
      { [nameField]: req.user.name }
    ]
  };
}

function applySalesScope(req, where = {}, idField = 'salesman_id', nameField = 'salesman') {
  if (!isSalesUser(req)) return where;
  return {
    [Op.and]: [
      where,
      getSalesCondition(req, idField, nameField)
    ]
  };
}

async function buildFinanceSalesScope(req, models) {
  if (!isSalesUser(req)) return null;
  const { Order, Contract, Project, PaymentRequest } = models;
  const salesCondition = getSalesCondition(req);

  const [orders, contracts, projects, requests] = await Promise.all([
    Order.findAll({ where: salesCondition, attributes: ['id'], raw: true }),
    Contract.findAll({ where: salesCondition, attributes: ['id'], raw: true }),
    Project.findAll({ where: salesCondition, attributes: ['id'], raw: true }),
    PaymentRequest.findAll({
      where: {
        [Op.or]: [
          { salesman_id: req.user.id },
          { salesman_name: req.user.name }
        ]
      },
      attributes: ['id'],
      raw: true
    })
  ]);

  const orderIds = orders.map(item => item.id);
  const contractIds = contracts.map(item => item.id);
  const projectIds = projects.map(item => item.id);
  const requestIds = requests.map(item => item.id);

  if (!orderIds.length && !contractIds.length && !projectIds.length && !requestIds.length) {
    return { id: -1 };
  }

  const orConditions = [];
  if (orderIds.length) orConditions.push({ order_id: { [Op.in]: orderIds } });
  if (contractIds.length) orConditions.push({ contract_id: { [Op.in]: contractIds } });
  if (projectIds.length) orConditions.push({ project_id: { [Op.in]: projectIds } });
  if (requestIds.length) {
    orConditions.push({
      [Op.and]: [
        { source_type: 'payment_request' },
        { source_id: { [Op.in]: requestIds } }
      ]
    });
  }

  return { [Op.or]: orConditions };
}

module.exports = {
  applySalesScope,
  buildFinanceSalesScope,
  isSalesUser,
};
