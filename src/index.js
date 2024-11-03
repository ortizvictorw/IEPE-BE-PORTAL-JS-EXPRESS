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
const compression = require('compression');
const verifyToken = require('./middlewares/auth.middleware');

const db = require('./configurations/db.config');

const MongoMemberRepository = require('./repositories/member.repository');
const MongoServicesRepository = require('./repositories/services.repository');
const UserRepository = require('./repositories/user.repository');
const UtilityRepository = require('./repositories/utility.repository');
const ActivityRepository = require('./repositories/activity.repository');


const MemberModel = require('./configurations/schemas/member/Member.schema');
const ServiceModel = require('./configurations/schemas/services/Services.schema');

const memberRepository = new MongoMemberRepository();
const servicesRepository = new MongoServicesRepository();
const userRepository = new UserRepository();
const utilityRepository = new UtilityRepository()
const activityRepository = new ActivityRepository()

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

/* app.use(
  compression({
    brotli: { enabled: true, zlib: {} },
  })
); */

/* PERFORMANCE COMPRESION*/
app.use(compression({
  level: 9, // Puedes ajustar el nivel de compresión entre 0 y 9.
  threshold: 1000, // Solo comprimir respuestas mayores a 1 KB.
  filter: (req, res) => {
    // Puedes agregar una función de filtro personalizada si lo necesitas.
    return compression.filter(req, res);
  }
}));

/* PERFORMANCE */

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

const createMemberServicesMasive = async (req, res) => {
  try {
    const services = req.body;

    if (!Array.isArray(services)) {
      return res.status(400).json({ message: 'La entrada debe ser un array de servicios.' });
    }

    const promises = services.map(async (service) => {
      const existingMember = await memberRepository.findByFirstNameAndLastName(service.firstName, service.lastName);
      const avatar = await memberRepository.getAvatarById(existingMember.dni);
      const date = service.date ? new Date(service.date) : new Date();

      // Encontrar al miembro por dni
      const member = await MemberModel.findOne({ dni: existingMember.dni });

      if (!member) {
        throw new Error(`Member with DNI ${existingMember.dni} not found`);
      }

      const newService = new ServiceModel({
        ...service,
        avatar,
        date,
        member: member._id
      });

      return await newService.save();
    });

    const savedServices = await Promise.all(promises);
    res.status(201).json(savedServices);
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
    console.error(error)
    res.status(500).json({ message: error.message });
  }
};



const getMembersBirthday = async (req, res) => {
  try {
    let members;
    members = await memberRepository.findMembersBirthday();
    res.status(200).json(members);
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: error.message });
  }
};

const findMembersBirthdayThisWeek = async (req, res) => {
  try {
    let members;
    members = await memberRepository.findMembersBirthdayThisWeek();
    res.status(200).json(members);
  } catch (error) {
    console.error(error)
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

// Función para ajustar el cargo según el género y formato del cargo
function getPositionWithGender(member) {
  const position = member.position;
  const gender = member.genre;

  // Si el miembro es mujer y el cargo termina en '/A', cambia 'O/A' a 'A'
  if (gender === 'MUJER' && position.endsWith('/A')) {
    return position.slice(0, -2) + 'A';
  }
  
  // Si el miembro es hombre y el cargo termina en '/A', elimina la parte '/A'
  if (gender === 'HOMBRE' && position.endsWith('/A')) {
    return position.slice(0, -2);
  }
console.log(gender)
console.log(position)
console.log(position)

  // En otros casos, devuelve el cargo tal cual
  return position;
}

const generateCredential = async (req, res) => {
  let browser;
  try {
    const { dni } = req.params;
    const member = await memberRepository.findById(dni);

    if (!member) {
      return res.status(404).send('Member not found');
    }

    const qrUrl = `${process.env.URL_BASE_FRONT_PROD}/members/status/${dni}`;
    const qr = await QRCode.toDataURL(qrUrl);

    // Logo processing
    const logoPath = path.join(__dirname, 'public/static/logo.png');
    const imageLogo = await Jimp.read(logoPath);
    imageLogo.resize(100, 100);
    const logoBuffer = await imageLogo.quality(60).getBufferAsync(Jimp.MIME_PNG);
    const logoBase64 = logoBuffer.toString('base64');
    const logoDataURL = `data:image/png;base64,${logoBase64}`;

    // Avatar processing, if no avatar, use default
    let avatarBase64;
    if (member.avatar) {
      avatarBase64 = member.avatar;
    } else {
      const defaultAvatarPath = path.join(__dirname, 'public/static/default.jpg');
      const imageDefault = await Jimp.read(defaultAvatarPath);
      imageDefault.resize(100, 100);
      const avatarBuffer = await imageDefault.quality(60).getBufferAsync(Jimp.MIME_PNG);
      avatarBase64 = `data:image/png;base64,${avatarBuffer.toString('base64')}`;
    }

    // Read HTML template
    const templatePath = path.join(__dirname, 'resources/templates/template.html');
    const htmlTemplate = fs.readFileSync(templatePath, 'utf8');

    const html = htmlTemplate
      .replace('{logoDataURL}', logoDataURL)
      .replace('{member.avatar}', avatarBase64)
      .replace('{qr}', qr)
      .replace('{member.lastName}', member.lastName)
      .replace('{member.firstName}', member.firstName)
      .replace('{member.position}', member.position !== 'MIEMBRO' ? `<li>SERVICIO: ${getPositionWithGender(member)}</li>` : '');

    // Puppeteer
    browser = await puppeteer.launch({ headless: true, executablePath: '/usr/bin/google-chrome' });
    const page = await browser.newPage();
    await page.setContent(html);

    // PNG screenshot, no 'quality' option needed
    const image = await page.screenshot({ type: 'png' });

    // Close the page and return the image
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
const createServices = async (req, res) => {
  try {
    const service = req.body;
    const avatar = await memberRepository.getAvatarById(service.dni);
    const date = service.date ? new Date(service.date) : new Date();

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

const deleteService = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await servicesRepository.delete(id);
    res.status(200).json({ message: result });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getServiceById = async (req, res) => {
  try {
    const { id } = req.params;
    const member = await servicesRepository.findById(id);
    if (member) {
      res.status(200).json(member);
    } else {
      res.status(404).json({ message: 'Member not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateService = async (req, res) => {
  try {
    const service = req.body;
    const { id } = req.params;

    const updatedMember = await servicesRepository.update(service, id);
    res.status(200).json(updatedMember);
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

const exportDocumentsJson = async (req, res) => {
  try {
    const datos = await selectedRepository(req.path);

    if (!Array.isArray(datos)) {
      return res.status(500).json({ message: 'Error: Los datos no son un array.' });
    }

    // Convierte los datos a formato JSON
    const jsonDatos = JSON.stringify(datos, null, 2); // Formatea con espacios para mejor legibilidad

    // Configura la respuesta HTTP para que sea descargada como un archivo JSON
    res.setHeader('Content-Disposition', 'attachment; filename=exportacion.json');
    res.setHeader('Content-Type', 'application/json');
    
    // Envía el archivo JSON para que el cliente lo descargue
    res.send(jsonDatos);
    console.log('Exportación en formato JSON completada con éxito.');
  } catch (error) {
    console.error('Error al exportar:', error);
    res.status(500).json({ message: 'Error al exportar' });
  }
};


const exportUncheckedMembers = async (req, res) => {
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

const exportCheckedMembersWithComments = async (req, res) => {
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
      datos = await servicesRepository.transformServices();
      break;

    case '/members/export':
      datos = await memberRepository.transformMembers();
      break;

    case '/members/export-json':
      datos = await memberRepository.findLeanFull();
      break;

      case '/services/export-json':
        datos = await servicesRepository.findLeanFull();
        break;

    case '/members/exportUncheckedMembers':
      datos = await memberRepository.findLeanUncheckedMembers();
      break;


    case '/members/exportCheckedMembersWithComments':
      datos = await memberRepository.findLeanCheckedMembersWithComments();
      break;

    case '/utility/export':
      datos = await utilityRepository.get();
      break;

    default:
      datos = [];
      break;
  }
  return datos;
}
// USER

const registerUser = async (req, res) => {
  try {
    const { email, password, role } = req.body;
    const savedUser = await userRepository.create({ email, password, role });
    res.status(201).json({ message: 'User registered successfully', user: savedUser });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const { token, user } = await userRepository.login({ email, password });

    res.status(200).json({ message: 'Login successful', token, user });
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: error.message });
  }
};

// Ruta para pedir un ítem
const getUtilities = async (req, res) => {
  try {
    const items = await utilityRepository.get();
    res.status(201).send(items);
  } catch (error) {
    res.status(400).send(error);
  }
}

// Ruta para agregar un ítem
const addUtility = async (req, res) => {
  try {
    const newItem = await utilityRepository.add(req.body);
    res.status(201).send(newItem);
  } catch (error) {
    res.status(400).send(error);
  }
}

// Ruta para actualizar la cantidad (sumar o restar)
const updateUtility = async (req, res) => {
  const { id } = req.params;
  const { body } = req;

  try {
    const updatedItem = await utilityRepository.udpate(id, body.quantity);
    res.status(200).send(updatedItem);
  } catch (error) {
    res.status(400).send(error);
  }
}

// Ruta para eliminar un ítem
const removeUtility = async (req, res) => {
  const { id } = req.params;
  try {
    const deletedItem = await utilityRepository.delete(id);
    res.status(200).send(deletedItem);
  } catch (error) {
    res.status(400).send(error);
  }
}

// Ruta para pedir un ítem
const getActivities = async (req, res) => {
  try {
    const activities = await activityRepository.find();
    res.status(201).send(activities);
  } catch (error) {
    res.status(400).send(error);
  }
}

// Ruta para agregar un ítem
const addActivity = async (req, res) => {
  try {
    const newItem = await activityRepository.save(req.body);
    res.status(201).send(newItem);
  } catch (error) {
    res.status(400).send(error);
  }
}

// Ruta para actualizar un ítem
const updateActivity = async (req, res) => {
  const { id } = req.params;
  try {
    const deletedItem = await activityRepository.delete(id);
    res.status(200).send(deletedItem);
  } catch (error) {
    res.status(400).send(error);
  }
}


// Ruta para eliminar un ítem
const removeActivity = async (req, res) => {
  const { id } = req.params;
  try {
    const deletedItem = await activityRepository.delete(id);
    res.status(200).send(deletedItem);
  } catch (error) {
    res.status(400).send(error);
  }
}

//rutas de Actividades
app.get('/activity', verifyToken, getActivities);
app.post('/activity/add', verifyToken, addActivity);
app.put('/activity/:id', verifyToken, updateActivity);
app.delete('/activity/:id', verifyToken, removeActivity);

//rutas de Inventario
app.get('/utility', verifyToken, getUtilities);
app.post('/utility/add', verifyToken, addUtility);
app.put('/utility/:id', verifyToken, updateUtility);
app.delete('/utility/:id', verifyToken, removeUtility);
app.get('/utility/export', verifyToken, exportDocuments)

// Rutas de usuario
app.post('/register', registerUser);
app.post('/login', loginUser);

// Rutas members
app.post('/members', verifyToken, createMember);
app.get('/members', verifyToken, getMembers);
app.get('/members/birthday', verifyToken, getMembersBirthday);
app.get('/members/findMembersBirthdayThisWeek', verifyToken, findMembersBirthdayThisWeek);
app.get('/members/summary', verifyToken, getMembersSummary);
app.get('/members/export', verifyToken, exportDocuments)
app.get('/members/export-json', verifyToken, exportDocumentsJson)
app.get('/members/exportUncheckedMembers', verifyToken, exportUncheckedMembers)
app.get('/members/exportCheckedMembersWithComments', verifyToken, exportCheckedMembersWithComments)

app.get('/members/generate-credential/:dni', verifyToken, generateCredential);
app.get('/members/:id', verifyToken, getMemberById);
app.put('/members/:id', verifyToken, updateMember);
app.delete('/members/:id', verifyToken, deleteMember);


// Rutas services
app.post('/services', verifyToken, createServices);
app.post('/services/masive', verifyToken, createMemberServicesMasive);
app.get('/services', verifyToken, getServices);
app.get('/services/export', verifyToken, exportDocuments)
app.get('/services/export-json', verifyToken, exportDocumentsJson)

app.get('/services/:id', verifyToken, getServiceById);
app.put('/services/aproved/:id', verifyToken, aprovedService)
app.put('/services/:id', verifyToken, updateService);
app.delete('/services/:id', verifyToken, deleteService);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));

module.exports = app;
