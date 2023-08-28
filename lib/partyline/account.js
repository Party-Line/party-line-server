const crypto = require('crypto')
const jwt = require('jsonwebtoken')

const util = require('./util.js')
const send = require('./send.js')
const message = require('./message.js')
const channel = require('./channel.js')

module.exports = {
    create: function(account, reid, ws, clientId = false) {
        let self = this
        
        let query = 'SELECT * FROM user WHERE username = ?'
    
        global.db.query(query, account.username, function (error, results, fields) {
            if (error) {
                const errorCode = util.logError(error, error.sql)
                ws.send(message.create(errorCode, 'error', reid))
            } else if (results.length == 0) {
                account.login = crypto.randomBytes(64).toString('base64')
                account.login_created = Math.floor(Date.now() / 1000)
                
                global.db.query('INSERT INTO user SET ?', account, function (error, results, fields) {
                    let content = '{}'
                    
                    if (error) {
                        const errorCode = util.logError(error, error.sql)
                        ws.send(message.create(errorCode, 'error', reid))
                    } else {
                        self.login(account.username, reid, ws, clientId)
                    }
                })
            } else {
                const errorCode = util.logError('This username is already being used.', username)
                ws.send(message.create(errorCode, 'error', reid))
            }
        })
    },
    
    createGuest: function(clientId, ws) {
        global.guest++
        
        global.users[clientId] = {
            client: ws,
            clientId: clientId,
            name: 'Guest' + global.guest,
            isGuest: true
        }
        
        // 15 characters is our maximum username size
        if (global.guest > 9999999999) {
            global.guest = 0
        }
    },
    
    login: function(user, reid, ws, clientId) {
        let self = this
        let username = user.username
        let timezone = user.timezone
        
        let query = 'SELECT * FROM user WHERE username = ?'
        
        global.db.query(query, username, function (error, results, fields) {
            if (error) {
                const errorCode = util.logError(error, error.sql)
                ws.send(message.create(errorCode, 'error', reid))
            } else {
                if (results.length == 0) {
                    self.create({ username: username }, reid, ws, clientId)
                } else if (results.length == 1) {
                    const uid = results[0].id
                    const username = results[0].username
                    const remember = results[0].login_remember
                    const jti = util.UUID4()
                    
                    query = 'UPDATE user SET confirmed = 1, token = ?, login = "", login_created = 0, timezone = ? WHERE id = ?'
                    
                    global.db.query(query, [jti, timezone, uid], function (error, results, fields) {
                        let content = '{}'
                        
                        if (error) {
                            const errorCode = util.logError(error, error.sql)
                            content = message.create(errorCode, 'error', reid)
                        } else {
                            const nowTimestamp = Math.floor(Date.now() / 1000)
                            
                            const token = jwt.sign({
                                uid: uid,
                                username: username,
                                remember: remember,
                                timezone: timezone,
                                chk: nowTimestamp + global.jwt.recheckIn,
                                exp: nowTimestamp + global.jwt.expiresIn,
                                jti: jti
                            }, global.jwt.secret)
                            
                            content = message.create(token, 'success', reid)
                        }
                        
                        ws.send(content)
                    })
                } else {
                    const errorCode = util.logError('Unable to login with the following username', username)
                    ws.send(message.create(errorCode, 'error', reid))
                }    
            }
        })
    },
    
    token: function(tokenOld, ws, callback) {
        let query = 'SELECT * FROM user WHERE id = ? AND token = ?'
        
        global.db.query(query, [tokenOld.uid, tokenOld.jti], function (error, results, fields) {
            if (error) {
                const errorCode = util.logError(error, error.sql)
                ws.send(message.create(errorCode, 'account-logout'))
            } else {
                if (results.length == 1) {
                    const jti = util.UUID4()
                    
                    query = 'UPDATE user SET token = ? WHERE id = ?'
                    
                    global.db.query(query, [jti, tokenOld.uid], function (error, results, fields) {
                        let content = '{}'
                        
                        if (error) {
                            const errorCode = util.logError(error, error.sql)
                            ws.send(message.create(errorCode, 'account-logout'))
                        } else {
                            const nowTimestamp = Math.floor(Date.now() / 1000)
                            
                            const token = jwt.sign({
                                uid: tokenOld.uid,
                                username: tokenOld.username,
                                remember: tokenOld.remember,
                                timezone: tokenOld.timezone,
                                chk: nowTimestamp + global.jwt.recheckIn,
                                exp: tokenOld.exp,
                                jti: jti
                            }, global.jwt.secret)
                            
                            content = message.create(token, 'account-token')
                        }
                        
                        ws.send(content, callback)
                    })
                } else {
                    const errorCode = util.logError('Unable to refresh token for user #' + tokenOld.uid, tokenOld.jti)
                    ws.send(message.create(errorCode, 'account-logout'))
                }    
            }
        })
    },
    
    connect: function(user) {
        util.log('sys', user.name + ' has connected')
        user.client.send(message.create(user, 'account-connect'))
        
        let query = 'SELECT cm.*, ur.username FROM channel_message cm INNER JOIN user ur ON cm.id_ur = ur.id WHERE cm.id_cl = 1 ORDER BY created'
        
        global.db.query(query, [], function (error, results, fields) {
            if (error) {
                const errorCode = util.logError(error, error.sql)
                ws.send(message.create(errorCode, 'account-connect'))
            } else {
                let msgDayLast = 0
                
                for (key in results) {
                    let result = results[key]
                    let msgDate = util.utcToLocal(result.created, user.timezone)
                    
                    let msgDay = new Date(msgDate * 1000).toLocaleString('en-US', {
                        year: '2-digit', month: '2-digit', day: '2-digit'
                    })
                    
                    if (msgDay != msgDayLast) {
                        // TODO: create a message function for formatting lines
                        let dayLine = '<div class="row align-items-center gx-2"><div class="col-5"><hr class="border-secondary" /></div><div class="col-2 text-secondary pb-1 fw-bold"><div class="text-center"><small>' + msgDay + '</small></div></div><div class="col-5"><hr class="border-secondary" /></div></div>'
                        dayLine = '<div class="pl-chat-message-content col">' + dayLine + '</div>'
                        
                        user.client.send(message.create(dayLine, 'channel-message'))
                        
                        msgDayLast = msgDay
                    }
                    
                    let content = message.format(result.username, msgDate, result.content)
                    
                    user.client.send(message.create(content, 'channel-message'))
                }
                
                let newLine = '<div class="row align-items-center gx-2"><div class="col-11"><hr class="border-danger" /></div><div class="col-1 text-danger pb-1 fw-bold"><small>New</small></div></div>'
                newLine = '<div class="pl-chat-message-content col">' + newLine + '</div>'
                
                user.client.send(message.create(newLine, 'channel-message'))
                
                let welcome = ''
                
                if (user.isGuest) {
                    welcome += 'Welcome! Your name has been auto-generated as ' + message.highlight(user.name, 'name', 'l')
                } else {
                    welcome += 'Welcome! You are logged in as ' + message.highlight(user.name, 'name', 'l')
                }
                
                welcome = '<div class="pl-chat-message-content col">' + welcome + '</div>'
                
                user.client.send(message.create(welcome, 'channel-message'))
            }
        })
        
        channel.users(user.client)
        
        send.all(message.highlight(user.name, 'name', 'r') + ' has connected', 'channel-message', user.client)
    }
}