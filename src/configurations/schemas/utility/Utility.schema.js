const mongoose = require('mongoose');

const InventoryItemSchema = new mongoose.Schema({
  avatar: { type: String, required: true },
  quantity: { type: Number, required: true },
  position: { type: String, required: true }, 
  type: { type: String, required: true }, 
  updatedAt: { type: Date, default: Date.now },
  user: { type: String, required: true }
});

const InventoryItemModel = mongoose.model('InventoryItem', InventoryItemSchema);

module.exports = InventoryItemModel;
