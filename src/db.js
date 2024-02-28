let instance;

class InMemoryDatabase {
  constructor() {
    if (instance) {
      throw new Error("You can only create one instance of InMemoryDatabase");
    }

    this.users = [];
    this.credentials = [];
    instance = this;
  }
}

const db = Object.freeze(new InMemoryDatabase());

module.exports = db;
