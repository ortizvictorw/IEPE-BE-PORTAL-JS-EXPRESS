const jwt = require('jsonwebtoken')
// Crear el token
export const createToken = (user) => {
    const { _id,firstName,position } = user;
    const token = jwt.sign({ _id,firstName,position }, "codigoSecreto", { expiresIn: "30m" });
    return token;
  };
  
  // Verificar el token
  export const verifyToken = (token) => {
    try {
      const decode = jwt.verify(token, "codigoSecreto");
      return decode;
    } catch (error) {
      return null;
    }
  };