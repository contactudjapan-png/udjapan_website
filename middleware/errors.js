class NotFoundError extends Error {
  constructor(message, context = 'page') {
    super(message);
    this.status = 404;
    this.context = context;
  }
}

module.exports = { NotFoundError };
