const UserModel = require("../configurations/schemas/user/User.schema");
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

class UserRepository {
    async create({ email, password, role }) {
        try {
            // Verificar si el usuario ya existe
            const existingUser = await UserModel.findOne({ email });
            if (existingUser) {
                throw new Error("Username already exists");
            }

            // Cifrar la contraseña
            const hashedPassword = await bcrypt.hash(password, 12);

            // Crear y guardar el nuevo usuario
            const newUser = new UserModel({
                email,
                password: hashedPassword,
                role
            });
            const savedUser = await newUser.save();

            return savedUser;
        } catch (error) {
            throw new Error(error.message);
        }
    }


    async login({ email, password }) {
        try {
            // Encontrar al usuario
            const user = await UserModel.findOne({ email });
            if (!user) {
                throw new Error('User not found');
            }
            
            // Verificar la contraseña
            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                throw new Error('Invalid credentials');
            }

             // Generar token JWT incluyendo el rol del usuario en el payload
            const token = jwt.sign(
            { userId: user._id, role: user.role }, 
            process.env.JWT_SECRET, 
            { expiresIn: '1h' }
           );

            // Eliminar el campo password antes de devolver el usuario
            const { password: _, ...userWithoutPassword } = user._doc;

            return {
                token,
                user: userWithoutPassword
            };
        } catch (error) {
            throw new Error(error.message);
        }
    }

}

module.exports = UserRepository;
