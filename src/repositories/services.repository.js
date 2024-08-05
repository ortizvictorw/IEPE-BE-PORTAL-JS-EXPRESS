const ServicesModel = require('../configurations/schemas/services/Services.schema');

class MongoServicesRepository {


    async findLean() {
        const members = await ServicesModel.find().select('-avatar -_id -__v').lean();
        return members;
    }

    async find(page) {
        const pageSize = 5; 
        const skip = page * pageSize; 

        const services = await ServicesModel.find()
            .select('-dni -_id -__v')
            .skip(skip)
            .limit(pageSize)
            .populate('member', 'dni avatar firstName lastName dateOfBirth -_id')
            .exec();

        const total = await ServicesModel.countDocuments(); 

        return {
            services,
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
            .select('-dni -_id -__v')
            .skip(skip)
            .limit(perPage)
            .populate('member', 'dni avatar firstName lastName dateOfBirth -_id')
            .exec();

        const totalServices = await ServicesModel.countDocuments(query);
        const totalPages = Math.ceil(totalServices / perPage);

        return {
            services,
            total: totalServices,
            totalPages,
            currentPage: pageNumber
        };
    }

    async findById(dni) {
        try {
            const service = await ServicesModel.findOne({ dni });
            return service;
            
        } catch (error) {
            console.log(error)
            return error;
          }
            
    }

    async save(member) {
        const newMember = new ServicesModel(member);
        return await newMember.save();
    }

    async aprodev(id) {
        try {
            const service = await this.findById(id);
            if (!service) throw new Error('Service not found');
    
            service.aproved = !service.aproved; 
            return await service.save();
            
        } catch (error) {
            console.log(error)
            return error;
        }
    }

}

module.exports = MongoServicesRepository;
