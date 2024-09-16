const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");

const requestSchema = new mongoose.Schema({
  url: {
    type: String,
  },
  method: {
    type: String,
  },
  resourceType: {
    type: String,
  },
  isNavigationRequest: {
    type: Boolean,
  },
  postData: {
    type: String,
  },
  failure: {
    type: Object,
  },
  headers: {
    type: Object,
  },
  redirectChain: {
    type: [String],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  interceptionId: {
    type: String,
  },
  webpage: { type: mongoose.Schema.Types.ObjectId, ref: "Webpage" },
  response: { type: mongoose.Schema.Types.ObjectId, ref: "Response" },
});

requestSchema.index({ createdAt: -1 });
requestSchema.index({ webpage: 1 });

requestSchema.plugin(mongoosePaginate);

module.exports = mongoose.model("Request", requestSchema);
