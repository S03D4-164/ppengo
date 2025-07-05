const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");
const mongoosastic = require("mongoosastic");

const { Client: Client7 } = require("es7");
const esClient = new Client7({ node: "http://elasticsearch:9200" });
esClient.info().then(console.log, console.log);

const responseSchema = new mongoose.Schema({
  url: {
    type: String,
    es_indexed: true,
  },
  urlHash: {
    type: String,
  },
  status: {
    type: Number,
  },
  statusText: {
    type: String,
  },
  ok: {
    type: Boolean,
  },
  text: {
    type: String,
    es_indexed: true,
  },
  remoteAddress: {
    ip: { type: String },
    port: { type: Number },
    reverse: { type: [String] },
    bgp: { type: [Object] },
    geoip: { type: [Object] },
    //whois: {type: String},
  },
  headers: {
    type: Object,
  },
  securityDetails: {
    issuer: { type: String },
    protocol: { type: String },
    subjectName: { type: String },
    validFrom: { type: Number },
    validTo: { type: Number },
  },
  createdAt: {
    type: Date,
    default: Date.now,
    es_indexed: true,
  },
  wappalyzer: {
    type: [String],
  },
  yara: {
    type: Object,
  },
  interceptionId: {
    type: String,
  },
  mimeType: {
    type: String,
  },
  encoding: {
    type: String,
  },
  webpage: { type: mongoose.Schema.Types.ObjectId, ref: "Webpage" },
  request: { type: mongoose.Schema.Types.ObjectId, ref: "Request" },
  payload: { type: mongoose.Schema.Types.ObjectId, ref: "Payload" },
});

responseSchema.index({ createdAt: -1 });
responseSchema.index({ urlHash: 1 });
responseSchema.index({ payload: 1 });
responseSchema.index({ text: "text" });
responseSchema.index({ webpage: 1 });
responseSchema.index({ "remoteAddress.ip": 1 });
responseSchema.index({ "yara.rules.id": 1 });

responseSchema.plugin(mongoosePaginate);
responseSchema.plugin(mongoosastic, {
  esClient: esClient,
  bulk: {
    size: 10, // preferred number of docs to bulk index
    delay: 100, //milliseconds to wait for enough docs to meet size constraint
  },
});

module.exports = mongoose.model("Response", responseSchema);
