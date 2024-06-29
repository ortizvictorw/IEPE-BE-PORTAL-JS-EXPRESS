const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const db = require('./configurations/db.config');
const MongoMemberRepository = require('./repositories/MongoMemberRepository');
const memberRepository = new MongoMemberRepository();
const nodeHtmlToImage = require('node-html-to-image');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');
const Jimp = require('jimp');

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
app.use(cors({
  origin: 'https://iepe-portal.vercel.app', // Replace with your actual front-end URL
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true,
  optionsSuccessStatus: 204
}));

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
  const { page, filter } = req.query;
  try {
    let members;
    if (filter) {
      members = await memberRepository.findByFilter(filter, page);
    } else {
      members = await memberRepository.find(page);
    }
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

const generateCredential = async (req, res) => {
  try {
    const { dni } = req.params;
    const member = await memberRepository.findById(dni);

    let avatarDefault;

    const qrUrl = `${process.env.URL_BASE_FRONT}/members/status/${dni}`;
    const qr = await QRCode.toDataURL(qrUrl);

    // Retrieve the image from the filesystem using Jimp
    const imagePath = path.join(__dirname, 'public/static/logo.png');
    const imageLogo = await Jimp.read(imagePath);
    const logoBuffer = await imageLogo.getBufferAsync(Jimp.MIME_PNG);
    const logoBase64 = logoBuffer.toString('base64');
    const logoDataURL = `data:image/png;base64,${logoBase64}`;

    if (!member.avatar) {
      const imagePathDefault = path.join(__dirname, 'public/static/default.jpg');
      const imageDefault = await Jimp.read(imagePathDefault);
      const logoBufferDefault = await imageDefault.getBufferAsync(Jimp.MIME_PNG);
      const logoBase64Default = logoBufferDefault.toString('base64');
      avatarDefault = `data:image/png;base64,${logoBase64Default}`;
    }

    // Read HTML template from file
    const templatePath = path.join(__dirname, 'resources/templates/template.html');
    const htmlTemplate = fs.readFileSync(templatePath, 'utf8');

    // Replace placeholders in the HTML template
    const html = htmlTemplate
      .replace('{logoDataURL}', logoDataURL)
      .replace('{member.avatar}', member.avatar ? member.avatar : avatarDefault)
      .replace('{qr}', qr)
      .replace('{member.lastName}', member.lastName)
      .replace('{member.firstName}', member.firstName)
      .replace('{member.position}', member.position !== "MIEMBRO" ? `<li>SERVICIO: ${member.position} </li>` : "");

    const image = await nodeHtmlToImage({ html: html });

    res.status(200).json({ image: image.toString('base64') });
  } catch (error) {
    console.error('Error generating images:', error);
    res.status(500).send('Error generating images');
  }
};

// Rutas
app.post('/members', createMember);
app.get('/members', getMembers);
app.get('/members/generate-credential/:dni', generateCredential);
app.get('/members/:id', getMemberById);
app.put('/members/:id', updateMember);
app.delete('/members/:id', deleteMember);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));

module.exports = app;
