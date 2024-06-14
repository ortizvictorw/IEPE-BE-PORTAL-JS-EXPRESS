const MongoMemberRepository = require('../repositories/MongoMemberRepository');
const memberRepository = new MongoMemberRepository();

const createMember = async (req, res) => {
    try {
        const member = req.body;
        const savedMember = await memberRepository.save(member);
        res.status(201).json(savedMember);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getMembers = async (_req, res) => {
    try {
        const members = await memberRepository.find();
        res.status(200).json(members);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getMemberById = async (req, res) => {
    try {
        const { id } = req.params;
        const member = await memberRepository.findById(id);
        if (member) {
            res.status(200).json(member);
        } else {
            res.status(404).json({ message: 'Member not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const updateMember = async (req, res) => {
    try {
        const { id } = req.params;
        const member = req.body;
        member.dni = id;
        const updatedMember = await memberRepository.update(member);
        res.status(200).json(updatedMember);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const deleteMember = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await memberRepository.delete(id);
        res.status(200).json({ message: result });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    createMember,
    getMembers,
    getMemberById,
    updateMember,
    deleteMember
};
