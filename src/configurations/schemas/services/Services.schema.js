const mongoose = require('mongoose');
const { Schema } = mongoose;

const servicesSchema = new Schema({
  dni: { index:true, type: String, required: true},
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  avatar: { type: String, required: false },
  date: { type: Date, required: true },
  observations: { type: String, required: false },
});

const ServicesModel = mongoose.model('Services', servicesSchema);

module.exports = ServicesModel;
