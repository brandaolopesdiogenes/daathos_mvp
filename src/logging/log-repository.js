class LogRepository {
  async save() {
    throw new Error("LogRepository must implement save()");
  }
}

module.exports = { LogRepository };
