const jwt = require('jsonwebtoken');
const UserModel = require("../configurations/schemas/user/User.schema");

function verifyToken(req, res, next) {
  const token = req.headers['authorization'];

  if (!token) {
    return res.status(403).send({ auth: false, message: 'No token provided.' });
  }

  // Elimina el prefijo "Bearer " del token si está presente
  const tokenWithoutBearer = token.startsWith('Bearer ') ? token.slice(7, token.length) : token;

  jwt.verify(tokenWithoutBearer, process.env.JWT_SECRET, async function (err, decoded) {
    if (err) {
      return res.status(500).send({ auth: false, message: 'Failed to authenticate token.', err });
    }

    const user = await UserModel.findOne({ _id: decoded.userId });
    if (!user) {
      return res.status(500).send({ auth: false, message: 'Failed to authenticate user.' });
    }
    // Si el token es válido, guardamos la información del usuario en req.user
    req.user = decoded;
    next();
  });
}

module.exports = verifyToken;
