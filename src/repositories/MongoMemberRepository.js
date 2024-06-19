const MemberModel = require('../configurations/schemas/member/Member.schema');

class MongoMemberRepository {
    generateCredential() {
        return Promise.reject(new Error('Method not implemented.'));
    }

    async find(page, limit = 10) {
        const skip = (page - 1) * limit;
        const members = await MemberModel.find()
            .skip(skip)
            .limit(limit)
        const total = await MemberModel.countDocuments(); // Obtiene el conteo total de documentos
        return {
            members,
            total,
            page,
            totalPages: Math.ceil(total / limit)
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
