const ServicesModel = require('../configurations/schemas/services/Services.schema');

class MongoServicesRepository {


    async findLean() {
        const members = await ServicesModel.find().select('-avatar -_id -__v').lean();
        return members;
    }

    async find(page) {
        const pageSize = 5; 
        const skip = page * pageSize; 

        const members = await ServicesModel.find()
            .skip(skip)
            .limit(pageSize);

        const total = await ServicesModel.countDocuments(); 

        return {
            members,
            total,
            page,
            totalPages: Math.ceil(total / pageSize)
        };
    }

    async findByFilter(filter, page) {
        const perPage = 10; 
        const pageNumber = parseInt(page) || 1;
        const skip = (pageNumber - 1) * perPage;

        const query = {
            $or: [
                { firstName: { $regex: filter, $options: 'i' } }, 
                { dni: { $regex: filter, $options: 'i' } } 
            ]
        };

        const services = await ServicesModel.find(query)
            .skip(skip)
            .limit(perPage)
            .exec();

        const totalServices = await ServicesModel.countDocuments(query);
        const totalPages = Math.ceil(totalMembers / perPage);

        return {
            services,
            total: totalServices,
            totalPages,
            currentPage: pageNumber
        };
    }

    async findById(dni) {
        const member = await ServicesModel.findOne({ dni });
        return member;
    }

    async save(member) {
        const newMember = new ServicesModel(member);
        return await newMember.save();
    }

}

module.exports = MongoServicesRepository;
