const mongoose = require('mongoose');
const { Schema } = mongoose;

const memberSchema = new Schema({
  dni: { type: String, required: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
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
});

const MemberModel = mongoose.model('Member', memberSchema);

module.exports = MemberModel;
