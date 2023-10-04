const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: String,
  socketId: String,
  profileImage: String, // Campo para almacenar la URL de la foto de perfil
});

module.exports = mongoose.model('User', userSchema);
