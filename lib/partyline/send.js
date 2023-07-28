const websocket = require('ws')

const message = require('./message.js')

module.exports = {
    all: function(content, type, exclude) {
        for (var id in global.users) {
            var client = global.users[id].client
            
            if (client != exclude && client.readyState === websocket.OPEN) {
                client.send(message.create(content, type))
            }
        }
    }
}