const ActivityModel = require('../configurations/schemas/activity/activity.schema');
class ActivityRepository {

    async find() {
        const activities = await ActivityModel.find().populate('user')
        return activities;
    }

    async findById(_id) {
        const activity = await ActivityModel.findById(_id);
        return activity;
    }

    async save(activity) {
        
        const newActivity = new ActivityModel(activity);
        return await newActivity.save();
    }

    async update(activity) {
        const { _id } = activity;
        return await ActivityModel.findOneAndUpdate({ _id }, activity, { new: true });
    }

    async delete(_id) {
        await ActivityModel.deleteOne({ _id });
        return `Activity with id ${_id} deleted successfully.`;
    }
}

module.exports = ActivityRepository;
