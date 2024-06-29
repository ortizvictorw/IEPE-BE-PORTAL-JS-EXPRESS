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
    const image = await Jimp.read(imagePath);
    const logoBuffer = await image.getBufferAsync(Jimp.MIME_PNG);
    const logoBase64 = logoBuffer.toString('base64');
    const logoDataURL = `data:image/png;base64,${logoBase64}`;
    
    if(!member.avatar){
      const imagePathDefault = path.join(__dirname, 'public/static/default.jpg');
      const imageDefault  = await Jimp.read(imagePathDefault);
      const logoBufferDefault  = await imageDefault.getBufferAsync(Jimp.MIME_PNG);
      const logoBase64Default  = logoBufferDefault.toString('base64');
      avatarDefault  = `data:image/png;base64,${logoBase64Default}`;
    }


    try {
      const html = `
            <html lang="en">
              <head>
                <style>
                  .contraportada {
                    color: #ffffff;
                    font-family: "Source Sans Pro";
                    background-color: #002e4c;
                    width: 8.56cm;
                    height: 5.398cm;
                    position: relative;
                    border-radius: 10px;
                    overflow: hidden;
                    z-index: 0;
                    text-align: center;
                    padding-top: 1.5cm;
                  }

                  .contraportada h2 {
                    font-size: 2.4mm;
                    font-weight: 600;
                    margin-bottom: 5px;
                  }

                  .contraportada p {
                    font-size: 1.8mm;
                    margin-bottom: 3px;
                  }

                  .credencial {
                    color: #00b4e1;
                    font-family: "Source Sans Pro";
                    background-color: #002e4c;
                    width: 8.56cm;
                    height: 5.398cm;
                    position: relative;
                    border-radius: 10px;
                    overflow: hidden;
                    border: 0.5px solid #ffffff;
                    z-index: 0;
                  }

                  .heading .logo,
                  .heading .subtitle,
                  .foto,
                  img,
                  .datos {
                    position: absolute;
                  }

                  .datos-contratapa {
                    position: absolute;
                  }

                  .heading .logo {
                    letter-spacing: -0.4mm;
                    top: -0.7cm;
                    left: 0.6cm;
                    font-size: 1cm;
                  }

                  .datos,
                  .datos-contratapa,
                  .heading .subtitle {
                    list-style: none;
                  }

                  .datos {
                    color: #b0bbc8;
                    bottom: 0.2cm;
                    font-size: 0.29cm;
                    font-weight: 600;
                    left: -0.78cm;
                    letter-spacing: 0.1mm;
                  }

                  .datos-contratapa {
                    color: #b0bbc8;
                    bottom: 0.2cm;
                    font-size: 0.2cm;
                    font-weight: 400;
                    left: -0.78cm;
                    letter-spacing: 0.1mm;
                  }

                  .heading .subtitle {
                    font-size: 2.6mm;
                    left: 2cm;
                    line-height: 3mm;
                    font-weight: 600;
                    color: #009cc3;
                  }

                  img {
                    top: 45%;
                    z-index: -1;
                    margin-left: 1rem;
                  }

                  .logo img {
                    opacity: 0.8;
                  }

                  .foto img {
                    max-width: 50%;
                    max-height: 50%;
                    margin-left: 1rem;
                  }

                  .credencial-container {
                    display: flex;
                  }
                </style>
              </head>
              <body class="credencial-container">
                <div class="credencial">
                  <div class="heading">
                    <div>
                      <h1 class="logo">
                        <div>
                          <div>
                            <img src=${logoDataURL} alt="Logo" width="50" height="50" />
                          </div>
                          <div><strong>IEPE</strong></div>
                        </div>
                      </h1>
                      <ul class="subtitle">
                        <li>Iglesia</li>
                        <li>Evangelica</li>
                        <li>Pueblo Elegido</li>
                      </ul>
                      <div>
                        <div>
                          <img src=${member.avatar ? member.avatar : avatarDefault}  alt="Avatar" width="50" height="50" style="left: 10px" />
                        </div>
                        <div>
                          <img src=${qr} alt="QR" width="75" height="75" style="top: 40px; right: 9px" />
                        </div>
                        <ul class="datos">
                          <li>APELLIDO Y NOMBRE: ${member.lastName} ${member.firstName}</li>
                          ${member.position !== "MIEMBRO" ? `<li>SERVICIO: ${member.position} </li>` : ''}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="credencial">
                  <div class="heading">
                    <div>
                      <h1 class="logo"></h1>
                      <div>
                        <h1 class="logo">
                          <div>
                            <div></div>
                            <div><strong>IEPE</strong></div>
                          </div>
                        </h1>
                        <span style="
                              font-size: 0.8em;
                              margin: 3em;
                              display: block;
                              color: #b0bbc8;
                            ">Teniendo a Dios tenemos todo</span>
                        <ul class="datos-contratapa" style="width: 8.56cm">
                          <li>Dirección: Sánchez de Bustamante 786, Rosario, Santa Fe, Argentina</li>
                          <li>Pastor: Dante David Sarmiento</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </body>
              </html>`;

      const image = await nodeHtmlToImage({ html: html });

      res.status(200).json({ image: image.toString('base64') });
    } catch (error) {
      console.error('Error generating images:', error);
      res.status(500).send('Error generating images');
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
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
