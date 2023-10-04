const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
  message: String,
  user: String,
  image: String,
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Chat', chatSchema);