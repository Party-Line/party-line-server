const websocket = require('ws')

const util = require('./util.js')
const send = require('./send.js')
const message = require('./message.js')

module.exports = {
    message: function(content, user) {
        let cm = {
            id_cl: 1, // TODO
            id_ur: user.dbId,
            content: content,
            created: Math.floor(Date.now() / 1000)
        }
        
        global.db.query('INSERT INTO channel_message SET ?', cm, function (error, results, fields) {
            if (error) {
                const errorCode = util.logError(error, error.sql)
                ws.send(message.create(errorCode, 'error', reid))
            } else {
                let msgDate = util.utcToLocal(cm.created, user.timezone)
                send.all(message.format(user.name, msgDate, content), 'channel-message')
            }
        })
    },

    users: function(ws) {
        var usersInChannel = []
        
        for (var id in global.users) {
            if (global.users[id].client.readyState === websocket.OPEN) {
                var user = Object.assign({}, global.users[id])
                delete user.client
                
                usersInChannel.push(user)
            }
        }
        
        send.all(usersInChannel, 'channel-users')
    },
    
    create: function(channel, user, reid, ws, deleted = false) {
        const notAvailable = []
        let invalid = ''
        
        if (user.isGuest) {
            invalid = 'You must login to create a new channel.'
        } else if (channel.name.length < 3 || channel.name.length > 30) {
            invalid = 'Your channel name must be between 3 - 30 characters.'
        } else if (/[^A-Za-z0-9\!\@\#\$\%\^\&\*\(\)\[\]\{\}\-\+\=\|\'\:\.\;\~\`\?]/.test(channel.name)) {
            invalid = 'Your channel name has invalid characters.'
        } else if (notAvailable.some(function(b) { return channel.name.toLowerCase().indexOf(b) >= 0 })) {
            invalid = 'This channel name is not available.'
        }
        
        if (invalid !== '') {
            ws.send(message.create(invalid, 'invalid', reid))
        } else {
            let query = 'SELECT * FROM channel WHERE name = ?'
            
            global.db.query(query, channel.name, function (error, results, fields) {
                if (error) {
                    const errorCode = util.logError(error, error.sql)
                    ws.send(message.create(errorCode, 'error', reid))
                } else if (results.length > 0) {
                    invalid = 'This channel name is not available.'
                    ws.send(message.create(invalid, 'invalid', reid))
                } else {
                    let query = 'SELECT * FROM channel WHERE id_ur = ?'
                    
                    global.db.query(query, user.dbId, function (error, results, fields) {
                        if (error) {
                            const errorCode = util.logError(error, error.sql)
                            ws.send(message.create(errorCode, 'error', reid))
                        } else if (results.length >= 3) {
                            invalid = 'You may only own or moderate a maximum of 3 public channels.'
                            ws.send(message.create(invalid, 'invalid', reid))
                        } else {
                            channel.id_ur = user.dbId
                            channel.created = Math.floor(Date.now() / 1000)
                            
                            global.db.query('INSERT INTO channel SET ?', channel, function (error, results, fields) {
                                let content = '{}'
                                
                                if (error) {
                                    const errorCode = util.logError(error, error.sql)
                                    content = message.create(errorCode, 'error', reid)
                                } else {
                                    content = message.create(results.insertId, 'success', reid)
                                }
                                
                                ws.send(content)
                            })
                        }
                    })
                }
            })
        }
    }
}