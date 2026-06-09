const success = (res, data = null, message = 'Success', status = 200) => {
  return res.status(status).json({ success: true, message, data });
};

const paginated = (res, data, pagination, message = 'Success') => {
  return res.json({ success: true, message, data, pagination });
};

const error = (res, message = 'Error', status = 400, errors = null) => {
  return res.status(status).json({ success: false, message, errors });
};

module.exports = { success, paginated, error };
