class LogRepository {
  async save() {
    throw new Error("LogRepository must implement save()");
  }

  async list() {
    throw new Error("LogRepository must implement list()");
  }
}

module.exports = { LogRepository };
