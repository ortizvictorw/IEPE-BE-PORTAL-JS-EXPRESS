const mongoose = require('mongoose');
const { Schema } = mongoose;

const serviceSchema = new Schema({
  dni: { type: String, index: true, unique: true, required: true },
  date: { type: Date, required: true },
  observations: { type: String, required: false },
  member: { type: Schema.Types.ObjectId, ref: 'Member', required: true },
  service:{ type: String, required: false },
  aproved: { type: Boolean, required: false} 
});

const ServiceModel = mongoose.model('Service', serviceSchema);

module.exports = ServiceModel;
