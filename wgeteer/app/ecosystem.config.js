const path = require("path");

module.exports = {
  apps: [
    {
      name: "wgeteer",
      script: "agenda.js",
      instances: 1,
      autorestart: true,
      env_production: {
        NODE_ENV: "production",
      },
      env_development: {
        NODE_ENV: "development",
      },
      watch:
        process.env.NODE_ENV !== "production"
          ? path.resolve(__dirname, "routes")
          : false,
      ignore_watch: ["node_modules", "routes/node_modules"],
      max_memory_restart: "1G",
    },
  ],
};
