const { defineConfig } = require("prisma/config");

require("dotenv/config");

module.exports = defineConfig({
  schema: "./schema.prisma",
  migrations: {
    path: "./migrations",
  },
  datasource: {
    url: process.env.DATABASE_URL ?? "file:./data/mail-testing-system.db",
  },
});
