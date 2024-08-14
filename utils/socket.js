
const { Server } = require('socket.io');

// create socket
class Io {
    static io;
    static sockets = [];
    static getIo() {
        return this.io;
    }
    static setIo(server) {
        this.io = new Server(server, {
            cors: {
                origin: "*",
            }
        });
    }
    static getSockets() {
        return this.sockets;
    }
    static getSocket(id) {
        // console.log(this.sockets, this.sockets.findIndex(item => item.id === id));
        return this.sockets[this.sockets.findIndex(item => item.id === id)].socket;
    }
    static setSocket(id, socket) {
        const index = this.sockets.findIndex(item => item.id === id)
        if (index !== -1) {
            this.sockets[index] = { ...this.sockets[index], socket };
        } else {
            this.sockets.push({ id, socket });
        }
    }
}

exports.Io = Io;