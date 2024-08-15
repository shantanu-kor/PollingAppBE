const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const formData = require("express-form-data");
const os = require("os");
const http = require('http');
const { Io } = require('./utils/socket');

const authRoutes = require('./routes/authRoutes');
const pollRoutes = require('./routes/pollRoutes');
const authMiddleware = require('./middlewares/auth');

const mongoose = require('mongoose');
const connectDB = require('./utils/database');

const User = require('./models/user');
const jwt = require('jsonwebtoken');

require('dotenv').config();

/**
 * Options are the same as multiparty takes.
 * But there is a new option "autoClean" to clean all files in "uploadDir" folder after the response.
 * By default, it is "false".
 */
const options = {
  uploadDir: os.tmpdir(),
  autoClean: true
};

const app = express();
const server = http.createServer(app);

let io = Io.setIo(server);
io = Io.getIo();

app.use(cors({
  origin: "*",
}))
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// parse data with connect-multiparty. 
app.use(formData.parse(options));
// delete from the request all empty files (size == 0)
app.use(formData.format());
// change the file objects to fs.ReadStream 
app.use(formData.stream());
// union the body and the files
app.use(formData.union());

// connect to mongodb
connectDB();

// paths
app.use('/', (req, res, next) => {
  res.status(200).send("<h1>The backend is working I guess...</h1>");
})
app.use('/auth', authRoutes);
app.use('/polls', pollRoutes);

// socket
io.use(authMiddleware.authenticateSocket);
io.on('connection', (socket) => {
  // make a room for every user
  console.log('user connected with socket id: ' + socket.id);
  Io.setSocket(socket.user._id.toString(), socket);
  socket.join(socket.user._id.toString());
  console.log("user room added: " + socket.user._id.toString());

  // send voted notification
  socket.on('voted_poll', (data) => {
    io.to(data.poll_userId).emit('voted_poll_notify', data.pollId);
  });
});

server.listen(process.env.PORT, () => {
  console.log(`Listening on port ${process.env.PORT}`)
});