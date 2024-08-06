const mongoose = require('mongoose');
const { Schema } = mongoose;

const memberSchema = new Schema({
  dni: { index: true, type: String, required: true },
  firstName: {index:true, type: String, required: true },
  lastName: {index:true, type: String, required: true },
  avatar: { type: String, required: false },
  dateOfBirth: { type: Date, required: true },
  address: { type: String, required: true },
  position: { type: String, required: true },
  dateOfJoiningChurch: { type: Date, required: true },
  dateOfBaptism: { type: Date, required: false },
  status: { type: String, required: true },
  telephone: { type: String, required: true },
  maritalStatus: { type: String, required: true },
  locality: { type: String, required: true },
  observations: { type: String, required: false },
  services: [{ type: Schema.Types.ObjectId, ref: 'Service' }]
});

const MemberModel = mongoose.model('Member', memberSchema);

module.exports = MemberModel;
