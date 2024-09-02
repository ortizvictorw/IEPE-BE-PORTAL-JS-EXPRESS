const mongoose = require('mongoose');
const { Schema } = mongoose;

const ActivitySchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true }, 
  expirationDate: { type: Date }, 
  date: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  user: [{ type: Schema.Types.ObjectId, ref: 'User' }]
});

const ActivityModel = mongoose.model('Activity', ActivitySchema);

module.exports = ActivityModel;
