const express = require('express');
const {
    createMember,
    getMembers,
    getMemberById,
    updateMember,
    deleteMember
} = require('../src/services/member.service');

const router = express.Router();

// POST create a member
router.post('/members', createMember);

// GET list of members
router.get('/members', getMembers);

// GET member by ID
router.get('/members/:id', getMemberById);

// PUT update member by ID
router.put('/members/:id', updateMember);

// DELETE member by ID
router.delete('/members/:id', deleteMember);

module.exports = router;
