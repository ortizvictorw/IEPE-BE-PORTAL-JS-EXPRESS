const MemberModel = require('../configurations/schemas/member/Member.schema');
const ServicesModel = require('../configurations/schemas/services/Services.schema');

class MongoServicesRepository {

    async transformServices() {
        try {
            // Obtener los servicios y realizar el 'populate'
            const services = await ServicesModel.find()
                .select('-avatar -__v')  // Excluye los campos 'avatar' y '__v'
                .populate({
                    path: 'member',
                    select: 'firstName lastName -_id'  // Incluye solo 'firstName' y 'lastName', excluyendo '_id'
                })
                .lean();

            // Transformar los datos a la estructura deseada
            const transformedServices = services.map(service => ({
                Nombre: service.member.firstName, // Renombrar `member.firstName` a `nombre`
                Apellido: service.member.lastName, // Renombrar `member.lastName` a `apellido`
                Fecha: service.date, // Renombrar `date` a `fecha`
                Servicio: service.service, // Renombrar `service` a `servicio`
                Observaciones: service.observations, // Mantener `observations` igual
            }));

            return transformedServices;
        } catch (error) {
            console.error('Error al transformar los servicios:', error);
            throw new Error('Error al transformar los servicios');
        }
    }


    async getInactiveMembersLastThreeMonths() {
        try {
            // Calcular la fecha límite (tres meses atrás desde hoy)
            const threeMonthsAgo = new Date();
            threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    
            // Obtener los últimos servicios agrupados por DNI
            const lastServicesByDni = await ServicesModel.aggregate([
                {
                    $group: {
                        _id: "$dni", // Agrupar por DNI
                        lastServiceDate: { $max: "$date" } // Obtener la última fecha de servicio
                    }
                },
                {
                    $match: {
                        lastServiceDate: { $lte: threeMonthsAgo } // Filtrar por servicios más antiguos que tres meses
                    }
                },
                {
                    $lookup: {
                        from: "members", // Nombre de la colección de miembros
                        localField: "_id", // Campo `dni` en los servicios
                        foreignField: "dni", // Campo `dni` en los miembros
                        as: "memberInfo" // Array donde se guarda la información del miembro
                    }
                },
                {
                    $unwind: {
                        path: "$memberInfo", // Descomponer el array de miembros en objetos individuales
                        preserveNullAndEmptyArrays: true // Incluir registros sin coincidencias
                    }
                },
                {
                    $project: {
                        DNI: "$_id",
                        lastServiceDate: 1,
                        firstName: { $ifNull: ["$memberInfo.firstName", "No registrado"] },
                        lastName: { $ifNull: ["$memberInfo.lastName", "No registrado"] }
                    }
                }
            ]);
    
            return lastServicesByDni.map(entry => ({
                DNI: entry.DNI,
                UltimoServicio: entry.lastServiceDate,
                Nombre: entry.firstName,
                Apellido: entry.lastName
            }));
        } catch (error) {
            console.error("Error fetching inactive members:", error);
            throw new Error("Error fetching inactive members");
        }
    }
    

    async findLean() {
        const service = await ServicesModel.find().select('-avatar -_id -__v').lean();
        return service;
    }


    async findLeanFull() {
        const service = await ServicesModel.find().lean();
        return service;
    }


    async find(page) {
        const pageSize = 5;
        const skip = page * pageSize;

        const services = await ServicesModel.find()
            .select('-dni -__v')
            .sort({ date: -1 }) // Ordenar del más nuevo al más viejo
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
        const perPage = 5; // Número de resultados por página
        const pageNumber = parseInt(page) || 1;
        const skip = (pageNumber - 1) * perPage;

        try {
            // Asegúrate de que el filtro sea una cadena válida
            const safeFilter = filter ? filter.trim() : '';

            // Buscar documentos en MemberModel utilizando una búsqueda general
            const members = await MemberModel.find({
                $or: [
                    { firstName: { $regex: safeFilter, $options: 'i' } },
                    { lastName: { $regex: safeFilter, $options: 'i' } },
                    { dni: { $regex: safeFilter, $options: 'i' } }
                ]
            }).select('dni'); // Solo necesitamos el campo `dni` para la consulta siguiente

            // Extraer los `dni` encontrados
            const dniList = members.map(member => member.dni);

            // Construir la consulta para ServicesModel basada en los `dni` encontrados y el filtro de servicio
            const query = {
                ...(dniList.length > 0 && { dni: { $in: dniList } }),
                ...(safeFilter && { service: { $regex: safeFilter, $options: 'i' } }) // Filtro por tipo de servicio
            };

            // Ejecutar la consulta para obtener los servicios
            const services = await ServicesModel.find(query)
                .select('-dni -__v') // Excluir campos innecesarios
                .sort({ date: -1 }) // Ordenar del más nuevo al más viejo
                .skip(skip)
                .limit(perPage)
                .populate('member', 'dni avatar firstName lastName dateOfBirth -_id') // Incluir solo los campos necesarios
                .exec();

            // Contar el total de documentos que coinciden con la consulta
            const totalServices = await ServicesModel.countDocuments(query);
            const totalPages = Math.ceil(totalServices / perPage); // Calcular el total de páginas

            return {
                services,
                total: totalServices,
                totalPages,
                currentPage: pageNumber
            };
        } catch (error) {
            // Manejo de errores
            console.error('Error al obtener los servicios:', error);
            throw new Error('Error al obtener los servicios'); // Propagar el error para manejo en niveles superiores
        }
    }


    async findById(_id) {
        const service = await ServicesModel.findById(_id)
        return service;
    }

    async save(service) {
        const newService = new ServicesModel(service);
        return await newService.save();
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

    async update(service, _id) {
        return await ServicesModel.findOneAndUpdate({ _id }, service, { new: true });
    }

    async delete(_id) {
        await ServicesModel.deleteOne({ _id });
        return `Service with ID ${_id} deleted successfully.`;
    }

}

module.exports = MongoServicesRepository;
