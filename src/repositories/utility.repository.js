const InventoryItemModel = require("../configurations/schemas/utility/Utility.schema");

class UtilityRepository {

    async get(){
        const items = await InventoryItemModel.find();
        return items
    }
    
    async add(){
        const newItem = new InventoryItemModel(req.body);
        const savedItem = await newItem.save();
        return savedItem;
    }

    async udpate(_id, quantity){
        const itemUpdate = await InventoryItemModel.findByIdAndUpdate(
            _id,
            { $inc: { quantity }, updatedAt: Date.now() },
            { new: true }
    );
        return itemUpdate;
    }

    async delete(_id){
        await InventoryItemModel.findByIdAndDelete(_id);
        return `Member with dni ${dni} deleted successfully.`;
    }
}

module.exports = UtilityRepository;
