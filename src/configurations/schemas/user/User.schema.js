const mongoose = require('mongoose');
const { Schema } = mongoose;

const UserSchema = new Schema({
  email: {
    index: true,
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  role: { type: String, enum: ['miembro','secretaria','comision','admin', 'pastor','utileria'], default: 'miembro' }

});

const UserModel = mongoose.model('User', UserSchema);
module.exports = UserModel;

