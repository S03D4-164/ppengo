const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");

const screenshotSchema = new mongoose.Schema(
  {
    screenshot: {
      type: String,
      required: true,
    },
    md5: {
      type: String,
      unique: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    tag: {
      type: [Object],
    },
  },
  { timestamps: true },
);

screenshotSchema.plugin(mongoosePaginate);
screenshotSchema.index({ createdAt: -1 });
//screenshotSchema.index({md5:1});

module.exports = mongoose.model("Screenshot", screenshotSchema);
