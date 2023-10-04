// server.js

const express = require('express');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);
const path = require('path');
const mongoose = require('mongoose');
const User = require('./chat-web-socket-io/userModel');
const Chat = require('./chat-web-socket-io/chatModel');

const PORT = process.env.PORT || 8000;
const list_users = {};

mongoose.connect('mongodb://127.0.0.1:27017/chat', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

app.use(express.static(path.join(__dirname, 'views')));

server.listen(PORT, () => {
  console.log(
    '-+-+-+-+- Servidor iniciado -+-+-+-+-+-\n' +
      ' -+-+-+- http://127.0.0.1:' +
      PORT +
      ' -+-+-+-'
  );
});

io.on('connection', async (socket) => {
  socket.on('register', async ({ username, fileDataURL }) => {
    // Verificar si el usuario ya existe en la base de datos
    const existingUser = await User.findOne({ username }).exec();

    if (existingUser) {
      list_users[username] = socket.id;
      socket.username = username;

      // Actualizamos la foto de perfil si se proporciona
      if (fileDataURL) {
        existingUser.profileImage = fileDataURL;
        await existingUser.save();
      }

      // Emitir el evento 'login' y enviar la URL de la imagen de perfil
      socket.emit('login', { profileImage: existingUser.profileImage });

      io.emit('activeSessions', list_users);

      // Retrieve and send user messages from the database
      try {
        const messages = await Chat.find({ user: socket.username }).exec();
        socket.emit('userMessages', messages);
      } catch (error) {
        console.error('Error retrieving user messages:', error);
      }
    } else {
      list_users[username] = socket.id;
      socket.username = username;

      // Save the user to MongoDB
      const newUser = new User({
        username,
        socketId: socket.id,
      });

      // Si se proporciona una foto de perfil, la almacenamos
      if (fileDataURL) {
        newUser.profileImage = fileDataURL;
      }

      await newUser.save();

      // Emitir el evento 'login' y enviar la URL de la imagen de perfil
      socket.emit('login', { profileImage: newUser.profileImage });

      io.emit('activeSessions', list_users);
    }
  });

  socket.on('disconnect', () => {
    delete list_users[socket.username];
    io.emit('activeSessions', list_users);
  });

  socket.on('sendMessage', async ({ message, image }) => {
    // Save the chat message to MongoDB
    await Chat.create({
      message,
      user: socket.username,
      image,
    });

    io.emit('sendMessage', { message, user: socket.username, image });
  });

  socket.on('sendMessagesPrivate', async ({ message, image, selectUser }) => {
    if (list_users[selectUser]) {
      // Save the private chat message to MongoDB
      await Chat.create({
        message,
        user: socket.username,
        image,
      });

      io.to(list_users[selectUser]).emit('sendMessage', {
        message,
        user: socket.username,
        image,
      });
      io.to(list_users[socket.username]).emit('sendMessage', {
        message,
        user: socket.username,
        image,
      });
    } else {
      console.error('El usuario al que intentas enviar el mensaje no existe!');
    }
  });
});
