const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");

const yaraSchema = new mongoose.Schema(
  {
    rule: {
      type: String,
    },
    name: {
      type: String,
      unique: true,
    },
    actions: {
      type: String,
    },
  },
  { timestamps: true },
);

yaraSchema.plugin(mongoosePaginate);

yaraSchema.index({ updatedAt: -1 });

module.exports = mongoose.model("Yara", yaraSchema);
