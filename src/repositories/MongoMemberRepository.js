const MemberModel = require('../configurations/schemas/member/Member.schema');

class MongoMemberRepository {
    generateCredential() {
        return Promise.reject(new Error('Method not implemented.'));
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
    
    
    async findById(dni) {
        const member = await MemberModel.findOne({ dni });
        return member;
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
