const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const harfileSchema = new mongoose.Schema(
  {
    har: {
      type: Buffer,
      required: true,
    },
    webpage: { type: mongoose.Schema.Types.ObjectId, ref: "Webpage" },
  },
{timestamps:true},
{read:'secondaryPreferred'}
);

harfileSchema.index({createdAt:-1});
harfileSchema.plugin(mongoosePaginate);

module.exports = mongoose.model('Harfile', harfileSchema);