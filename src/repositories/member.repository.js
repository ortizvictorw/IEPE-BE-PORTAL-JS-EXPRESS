const MemberModel = require('../configurations/schemas/member/Member.schema');
const ServicesModel = require('../configurations/schemas/services/Services.schema');
const moment = require('moment');
class MongoMemberRepository {

    async exportEXCEL() {
        try {
            // Obtén los datos de la colección
            const datos = await MiModelo.find().lean();

            // Crea una nueva hoja de cálculo
            const hoja = XLSX.utils.json_to_sheet(datos);

            // Crea un libro de trabajo y agrega la hoja
            const libro = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(libro, hoja, 'Datos');

            // Escribe el archivo Excel
            XLSX.writeFile(libro, 'exportacion.xlsx');
            console.log('Exportación completada con éxito.');
        } catch (error) {
            console.error('Error al exportar:', error);
        } finally {
            mongoose.connection.close();
        }

    }

    generateCredential() {
        return Promise.reject(new Error('Method not implemented.'));
    }

    async findLean() {
        const members = await MemberModel.find().select('-avatar -_id -__v').lean();
        return members;
    }

    async find(page) {
        const pageSize = 5; // Tamaño de página, puedes ajustarlo según tus necesidades
        const skip = page * pageSize; // Cálculo de skip considerando la indexación base 0

        const members = await MemberModel.find()
            .skip(skip)
            .limit(pageSize);

        const total = await MemberModel.countDocuments(); // Obtiene el conteo total de documentos

        return {
            members,
            total,
            page,
            totalPages: Math.ceil(total / pageSize)
        };
    }

    // Ejemplo en MongoMemberRepository.js
    async findByFilter(filter, page) {
        const perPage = 10; // Número de resultados por página
        const pageNumber = parseInt(page) || 1;
        const skip = (pageNumber - 1) * perPage;

        const query = {
            $or: [
                { firstName: { $regex: filter, $options: 'i' } },
                { dni: { $regex: filter, $options: 'i' } }
            ]
        };

        const members = await MemberModel.find(query)
            .skip(skip)
            .limit(perPage)
            .exec();

        const totalMembers = await MemberModel.countDocuments(query);
        const totalPages = Math.ceil(totalMembers / perPage);

        return {
            members,
            total: totalMembers,
            totalPages,
            currentPage: pageNumber
        };
    }

    async findSummary(filter) {
        const dnis = [];
        const query = {};

        if (filter.status) {
            query.status = filter.status;
        }

        if (filter.choirs === 'true') {
            const services = await ServicesModel.find({ service: 'COROS' })
                .select('dni -_id')
            dnis.push(...services.map(x => x.dni))
        }

        if (filter.reflection === 'true') {
            const services = await ServicesModel.find({ service: 'REFLEXION' })
                .select('dni -_id')
            dnis.push(...services.map(x => x.dni))

        }

        if (filter.preaching === 'true') {
            const services = await ServicesModel.find({ service: 'PREDICACION' })
                .select('dni -_id')
            dnis.push(...services.map(x => x.dni))

        }

        if (filter.leadsleads === 'true') {
            const services = await ServicesModel.find({ service: 'DIRIGE' })
                .select('dni -_id')
            dnis.push(...services.map(x => x.dni))

        }

        if (filter.work === 'true') {
            const services = await ServicesModel.find({ service: 'OBRA' })
                .select('dni -_id')
            dnis.push(...services.map(x => x.dni))

        }

        if (filter.games === 'true') {
            const services = await ServicesModel.find({ service: 'JUEGOS' })
                .select('dni -_id')
            dnis.push(...services.map(x => x.dni))

        }

        if (filter.greaterThanYear > 0) {
            const yearsAgo = moment().subtract(filter.greaterThanYear, 'years').toDate();
            query.dateOfBirth = { $lt: yearsAgo };
        }

        if (filter.lessThanYear > 0) {
            const recentYears = moment().subtract(filter.lessThanYear, 'years').toDate();
            if (!query.dateOfBirth) {
                query.dateOfBirth = {};
            }
            query.dateOfBirth.$gt = recentYears;
        }


        if (filter.noServiceSince > 0) {
            const monthsAgo = moment().subtract(filter.noServiceSince, 'months').toDate();
            const recentServices = await ServicesModel.find({ date: { $gte: monthsAgo } }).select('dni -_id');
            const recentDnis = recentServices.map(x => x.dni);

            // Obtener todos los DNIs
            const allDnis = (await ServicesModel.find().select('dni -_id')).map(x => x.dni);

            // Filtrar los DNIs que no tienen servicios recientes
            const noRecentServiceDnis = allDnis.filter(dni => !recentDnis.includes(dni));

            dnis.push(...noRecentServiceDnis);
        }

        if (dnis.length > 0) {
            query.dni = { $in: dnis };
        }


        const members = await MemberModel.find(query)
            .select('dni firstName lastName -_id')
            .sort({ lastName: 1, firstName: 1 })
            .populate('services')
            .exec();


        return {
            members,
        };
    }

    async findById(dni) {
        const member = await MemberModel.findOne({ dni });
        return member;
    }

    async getAvatarById(dni) {
        try {
            const member = await MemberModel.findOne({ dni }).select('avatar');
            if (!member) {
                throw new Error(`No se encontró un avatar para el DNI: ${dni}`);
            }
            return member.avatar;
        } catch (error) {
            console.error(`Error al obtener el avatar para el DNI: ${dni}`, error);
            throw error;
        }

    }

    async save(member) {
        const newMember = new MemberModel(member);
        return await newMember.save();
    }

    async update(member) {
        const { dni } = member;
        return await MemberModel.findOneAndUpdate({ dni }, member, { new: true });
    }

    async delete(dni) {
        await MemberModel.deleteOne({ dni });
        return `Member with dni ${dni} deleted successfully.`;
    }
}

module.exports = MongoMemberRepository;
