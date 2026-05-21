async function resolveSalesmanPayload(payload, Employee, options = {}) {
  const nextPayload = { ...payload };
  const salesmanId = payload.salesman_id ? Number(payload.salesman_id) : null;

  if (salesmanId) {
    const employee = await Employee.findByPk(salesmanId);
    if (employee) {
      nextPayload.salesman_id = employee.id;
      if (!nextPayload.salesman) nextPayload.salesman = employee.name;
      if (options.salesmanNameField) nextPayload[options.salesmanNameField] = employee.name;
      return nextPayload;
    }
  }

  const salesmanName = payload.salesman || payload.salesman_name || payload.salesmanName;
  if (salesmanName) {
    const employee = await Employee.findOne({ where: { name: salesmanName } });
    if (employee) {
      nextPayload.salesman_id = employee.id;
      nextPayload.salesman = employee.name;
      if (options.salesmanNameField) nextPayload[options.salesmanNameField] = employee.name;
    }
  }

  return nextPayload;
}

module.exports = {
  resolveSalesmanPayload,
};
