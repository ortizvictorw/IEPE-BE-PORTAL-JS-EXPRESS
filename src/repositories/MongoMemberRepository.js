const MemberModel = require('../configurations/schemas/member/Member.schema');

class MongoMemberRepository {
    generateCredential() {
        return Promise.reject(new Error('Method not implemented.'));
    }

    async find() {
        const members = await MemberModel.find();
        return members;
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
