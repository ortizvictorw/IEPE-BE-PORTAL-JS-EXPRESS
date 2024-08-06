const express = require('express');
const fs = require('fs');
const dotenv = require('dotenv');
dotenv.config({ path: '.env' });
const cors = require('cors');
const QRCode = require('qrcode');
const path = require('path');
const Jimp = require('jimp');
const puppeteer = require('puppeteer');
const XLSX = require('xlsx');
const compression =require('express-compression')

const db = require('./configurations/db.config');

const MongoMemberRepository = require('./repositories/member.repository');
const MongoServicesRepository = require('./repositories/services.repository');
const MemberModel = require('./configurations/schemas/member/Member.schema');
const ServiceModel = require('./configurations/schemas/services/Services.schema');

const memberRepository = new MongoMemberRepository();
const servicesRepository = new MongoServicesRepository();

const app = express();

(async () => {
  try {
    await db();
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
  }
})();

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true })); 

app.use(cors({
  origin: '*',
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true,
  optionsSuccessStatus: 204
}));
app.use(
  compression({
    brotli: { enabled: true, zlib: {} },
  })
);


/* MEMBERS */
const createMember = async (req, res) => {
  try {
    const member = req.body;
    // Verificar si ya existe un miembro con el mismo DNI
    const existingMember = await memberRepository.findById(member.dni);
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

const getMembersSummary = async (req, res) => {
  try {
    const members = await memberRepository.findSummary(req.query);
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

    const imagePath = path.join(__dirname, 'public/static/logo.png');
    const imageLogo = await Jimp.read(imagePath);
    imageLogo.resize(100, 100);
    const logoBuffer = await imageLogo.quality(60).getBufferAsync(Jimp.MIME_PNG);
    const logoBase64 = logoBuffer.toString('base64');
    const logoDataURL = `data:image/png;base64,${logoBase64}`;

    if (!member.avatar) {
      const imagePathDefault = path.join(__dirname, 'public/static/default.jpg');
      const imageDefault = await Jimp.read(imagePathDefault);
      imageDefault.resize(100, 100);
      const logoBufferDefault = await imageDefault.quality(60).getBufferAsync(Jimp.MIME_PNG);
      const logoBase64Default = logoBufferDefault.toString('base64');
      avatarDefault = `data:image/png;base64,${logoBase64Default}`;
    }

    const templatePath = path.join(__dirname, 'resources/templates/template.html');
    const htmlTemplate = fs.readFileSync(templatePath, 'utf8');

    const html = htmlTemplate
      .replace('{logoDataURL}', logoDataURL)
      .replace('{member.avatar}', member.avatar ? member.avatar : avatarDefault)
      .replace('{qr}', qr)
      .replace('{member.lastName}', member.lastName)
      .replace('{member.firstName}', member.firstName)
      .replace('{member.position}', member.position !== "MIEMBRO" ? `<li>SERVICIO: ${member.position} </li>` : "");

      browser = await puppeteer.launch({ headless: true });
      const page = await browser.newPage();
      await page.setContent(html);
      const image = await page.screenshot({ type: 'png', quality: 60 });
  
      await page.close();
      res.status(200).json({ image: image.toString('base64') });
    } catch (error) {
      console.error('Error generando imágenes:', error);
      res.status(500).send('Error generando imágenes');
    } finally {
      if (browser) {
        await browser.close();
      }
    }
};

/* SERVICES */
const createServices= async (req, res) => {
  try {
    const service = req.body;
    const avatar = await memberRepository.getAvatarById(service.dni);
    const date = service.datenew ? service.datenew : Date();

    // Encontrar al miembro por dni
    const member = await MemberModel.findOne({ dni: service.dni });
    if (!member) {
      return res.status(404).json({ message: 'Member not found' });
    }

    // Crear y guardar el servicio
    const newService = new ServiceModel({
      ...service,
      avatar,
      date,
      member: member._id // Referencia al miembro
    });
    const savedService = await newService.save();

    res.status(201).json(savedService);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getServices = async (req, res) => {
  const { page, filter } = req.query;
  try {
    let services;
    if (filter) {
      services = await servicesRepository.findByFilter(filter, page);
    } else {
      services = await servicesRepository.find(page);
    }
    res.status(200).json(services);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


const aprovedService = async (req, res) => {
  try {
    const { id } = req.params;
    const member = await servicesRepository.aprodev(id);
    if (member) {
      res.status(200).json(member);
    } else {
      res.status(404).json({ message: 'Member not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* SHARED SERVICES */

const exportDocuments = async (req, res) => {
  try {
    const datos = await selectedRepository(req.path);

    if (!Array.isArray(datos)) {
      return res.status(500).json({ message: 'Error: Los datos no son un array.' });
    }

    const hoja = XLSX.utils.json_to_sheet(datos);

    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, 'Datos');

    // Genera el archivo Excel en formato binario
    const archivoExcel = XLSX.write(libro, { bookType: 'xlsx', type: 'buffer' });

    // Configura la respuesta HTTP
    res.setHeader('Content-Disposition', 'attachment; filename=exportacion.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(archivoExcel);
    console.log('Exportación completada con éxito.');
  } catch (error) {
    console.error('Error al exportar:', error);
    res.status(500).json({ message: 'Error al exportar' });
  }
}

/* UTILS */
const selectedRepository = async (repositoryName) => {
  let datos;

  switch (repositoryName) {
    case '/services/export':
      datos = await servicesRepository.findLean();
      break;

    case '/members/export':
      datos = await memberRepository.findLean();
      break;

    default:
      datos = [];
      break;
  }
  return datos;
}

// Rutas members
app.post('/members', createMember);
app.get('/members', getMembers);
app.get('/members/summary', getMembersSummary);
app.get('/members/export', exportDocuments)
app.get('/members/generate-credential/:dni', generateCredential);
app.get('/members/:id', getMemberById);
app.put('/members/:id', updateMember);
app.delete('/members/:id', deleteMember);

// Rutas services
app.post('/services', createServices);
app.get('/services', getServices);
app.get('/services/export', exportDocuments)
app.put('/services/aproved/:id', aprovedService)

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));

module.exports = app;
