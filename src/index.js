const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const db = require('./configurations/db.config');
const MongoMemberRepository = require('./repositories/MongoMemberRepository');
const memberRepository = new MongoMemberRepository();

dotenv.config({ path: '.env' });

const app = express();

(async () => {
  try {
    await db();
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
  }
})();

// Set the limits once
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cors());

// Servicios
const createMember = async (req, res) => {
    try {
        const member = req.body;
        // Verificar si ya existe un miembro con el mismo DNI
        const existingMember = await memberRepository.findById(member.dni);
        console.log(existingMember)
        if (existingMember) {
            return res.status(400).json({ message: 'El número de DNI ya está en uso.' });
        }

        // Si no hay un miembro con el mismo DNI, guardar el nuevo miembro
        const savedMember = await memberRepository.save(member);
        res.status(201).json(savedMember);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getMembers = async (req, res) => {
    const { page = 1, limit = 10 } = req.query;
    try {
        const members = await memberRepository.find(page,limit);
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

// Rutas
app.post('/members', createMember);
app.get('/members', getMembers);
app.get('/members/:id', getMemberById);
app.put('/members/:id', updateMember);
app.delete('/members/:id', deleteMember);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));

module.exports = app;
