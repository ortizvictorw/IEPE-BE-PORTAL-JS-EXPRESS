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

            // Obtener los miembros inactivos y los que nunca tuvieron servicios
            const result = await MemberModel.aggregate([
                // Unir miembros con servicios
                {
                    $lookup: {
                        from: "services", // Nombre de la colección de servicios
                        localField: "dni", // Campo `dni` en los miembros
                        foreignField: "dni", // Campo `dni` en los servicios
                        as: "services" // Array donde se guarda la información de servicios
                    }
                },
                // Filtrar los servicios dentro del rango requerido y obtener el más reciente
                {
                    $addFields: {
                        lastService: {
                            $arrayElemAt: [
                                {
                                    $filter: {
                                        input: {
                                            $sortArray: {
                                                input: "$services",
                                                sortBy: { date: -1 } // Ordenar por fecha descendente
                                            }
                                        },
                                        as: "service",
                                        cond: { $lte: ["$$service.date", threeMonthsAgo] }
                                    }
                                },
                                0 // Tomar solo el último servicio que cumple la condición
                            ]
                        }
                    }
                },
                // Clasificar en base a servicios recientes o nunca tuvo servicio
                {
                    $project: {
                        DNI: "$dni",
                        firstName: 1,
                        lastName: 1,
                        lastServiceDate: "$lastService.date",
                        lastServiceName: "$lastService.service",
                        hasNeverHadService: { $eq: [{ $size: "$services" }, 0] }
                    }
                },
                // Filtrar miembros inactivos o que nunca tuvieron servicios
                {
                    $match: {
                        $or: [
                            { hasNeverHadService: true },
                            { lastServiceDate: { $lte: threeMonthsAgo } }
                        ]
                    }
                },
                // Ordenar por último servicio (los que nunca tuvieron servicio quedan al final)
                {
                    $sort: {
                        hasNeverHadService: 1, // Los que nunca tuvieron servicio al final
                        lastServiceDate: 1 // Más antiguos primero
                    }
                }
            ]);

            // Validar que exista realmente el servicio para los miembros con servicios
            const validatedResult = result.map(entry => ({
                DNI: entry.DNI,
                UltimoServicio: entry.hasNeverHadService
                    ? "Nunca tuvo servicio"
                    : entry.lastServiceDate || "No disponible",
                Servicio: entry.hasNeverHadService
                    ? "N/A"
                    : entry.lastServiceName || "No disponible",
                Nombre: entry.firstName || "No registrado",
                Apellido: entry.lastName || "No registrado"
            }));

            return validatedResult;
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
    
            // Determinar si el filtro contiene un rango de edad (e.g., "13-25")
            let ageRange = null;
            const ageMatch = safeFilter.match(/(\d+)-(\d+)/);
            if (ageMatch) {
                const [_, minAgeStr, maxAgeStr] = ageMatch;
                const minAge = parseInt(minAgeStr, 10);
                const maxAge = parseInt(maxAgeStr, 10);
                if (!isNaN(minAge) && !isNaN(maxAge)) {
                    ageRange = { minAge, maxAge };
                }
            }
    
            // Calcular las fechas de nacimiento para el rango de edad, si corresponde
            let dateFilter = {};
            if (ageRange) {
                const currentDate = new Date();
                const maxDateOfBirth = new Date(currentDate.setFullYear(currentDate.getFullYear() - ageRange.minAge)); // Fecha más joven
                const minDateOfBirth = new Date(currentDate.setFullYear(currentDate.getFullYear() - ageRange.maxAge)); // Fecha más vieja
                dateFilter = { dateOfBirth: { $gte: minDateOfBirth, $lte: maxDateOfBirth } };
            }
    
            // Buscar documentos en MemberModel utilizando filtros por nombre, apellido, DNI y fecha de nacimiento
            const members = await MemberModel.find({
                $and: [
                    {
                        $or: [
                            { firstName: { $regex: safeFilter, $options: 'i' } },
                            { lastName: { $regex: safeFilter, $options: 'i' } },
                            { dni: { $regex: safeFilter, $options: 'i' } }
                        ]
                    },
                    ...(Object.keys(dateFilter).length > 0 ? [dateFilter] : []) // Filtro de edad, si aplica
                ]
            }).select('dni'); // Solo necesitamos el campo `dni` para la consulta siguiente
    
            // Extraer los `dni` encontrados
            const dniList = members.map(member => member.dni);
    
            // Construir la consulta para ServicesModel basada en los `dni` encontrados y el filtro de servicio
            const query = {
                ...(dniList.length > 0 && { dni: { $in: dniList } }), // Filtro por DNI
                ...(safeFilter && {
                    $or: [
                        { service: { $regex: safeFilter, $options: 'i' } }, // Filtro por servicio
                        { 'member.firstName': { $regex: safeFilter, $options: 'i' } }, // Filtro por nombre
                        { 'member.lastName': { $regex: safeFilter, $options: 'i' } } // Filtro por apellido
                    ]
                })
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
