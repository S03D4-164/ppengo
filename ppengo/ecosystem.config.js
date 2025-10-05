const path = require("path");

module.exports = {
  apps: [
    {
      name: "ppengo",
      script: "bin/www",
      instances: 1,
      autorestart: true,
      env_production: {
        NODE_ENV: "production",
        MONGO_DATABASE: "mongodb://mongodb:27017/wgeteer",
      },
      env_development: {
        NODE_ENV: "development",
        MONGO_DATABASE: "mongodb://localhost:27017/wgeteer",
      },
      watch: ["routes", "views", "controllers"],
      ignore_watch: ["node_modules"],
      max_memory_restart: "4G",
    },
  ],
};
