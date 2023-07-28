const crypto = require('crypto')
const jwt = require('jsonwebtoken')

const util = require('./util.js')
const send = require('./send.js')
const message = require('./message.js')
const channel = require('./channel.js')

module.exports = {
    create: function(account, reid, ws, deleted = false) {
        const notAvailable = ['admin', 'moderator', 'guest', 'partyline']
        let invalid = ''
        
        if (account.username.length < 2 || account.username.length > 15) {
            invalid = 'Your username must be between 2 - 15 characters.'
        } else if (/[^A-Za-z0-9\!\@\#\$\%\^\&\*\(\)\[\]\{\}\-\+\=\|\'\:\.\;\~\`\?]/.test(account.username)) {
            invalid = 'Your username has invalid characters.'
        } else if (notAvailable.some(function(b) { return account.username.toLowerCase().indexOf(b) >= 0 })) {
            invalid = 'This username is not available.'
        }
        
        if (invalid !== '') {
            ws.send(message.create(invalid, 'invalid', reid))
        } else {
            let query = 'SELECT * FROM user WHERE username = ?'
        
            global.db.query(query, account.username, function (error, results, fields) {
                if (error) {
                    const errorCode = util.logError(error, error.sql)
                    ws.send(message.create(errorCode, 'error', reid))
                } else if (results.length > 0) {
                    const loginExpired = parseInt(results[0].login_created) + (30 * 60)
                    const nowTimestamp = Math.floor(Date.now() / 1000)
                    
                    if (results[0].confirmed === 1 || loginExpired > nowTimestamp || deleted) {
                        invalid = 'This username is not available.'
                        ws.send(message.create(invalid, 'invalid', reid))
                    } else {
                        let query = 'DELETE FROM user WHERE id = ?'
                        
                        global.db.query(query, results[0].id, function (error, results, fields) {
                            if (error) {
                                const errorCode = util.logError(error, error.sql)
                                ws.send(message.create(errorCode, 'error', reid))
                            } else {
                                this.create(account, reid, ws, true)
                            }
                        })
                    }
                } else {
                    account.login = crypto.randomBytes(64).toString('base64')
                    account.login_created = Math.floor(Date.now() / 1000)
                    
                    global.db.query('INSERT INTO user SET ?', account, function (error, results, fields) {
                        let content = '{}'
                        
                        if (error) {
                            const errorCode = util.logError(error, error.sql)
                            content = message.create(errorCode, 'error', reid)
                        } else {
                            let link = global.paths.siteurl + '/login.html?key=' + encodeURIComponent(account.login)
                            let body = '<p><strong>Hi ' + account.username + '&nbsp;&nbsp;:-)</strong></p>'
                            body += '<p>Thanks for signing up!</p>'
                            body += '<p>Please click the following link to login to your new account.</p>'
                            body += '<p><a href="' + link + '">Login to Party Line</a></p>'
                            
                            const email = {
                                to: account.email,
                                from: global.email.from,
                                subject: 'Party Line New Account',
                                html: body,
                            }
                            
                            global.sendgrid.send(email)
                            
                            content = message.create(results.insertId, 'success', reid)
                        }
                        
                        ws.send(content)
                    })
                }
            })
        }
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
    
    login: function(key, reid, ws, clientId) {
        let query = 'SELECT * FROM user WHERE login = ? AND (login_created + (30 * 60)) >= UNIX_TIMESTAMP()'
        
        global.db.query(query, key, function (error, results, fields) {
            if (error) {
                const errorCode = util.logError(error, error.sql)
                ws.send(message.create(errorCode, 'error', reid))
            } else {
                if (results.length == 1) {
                    const uid = results[0].id
                    const username = results[0].username
                    const remember = results[0].login_remember
                    const jti = util.UUID4()
                    
                    query = 'UPDATE user SET confirmed = 1, token = ?, login = "", login_created = 0 WHERE id = ?'
                    
                    global.db.query(query, [jti, uid], function (error, results, fields) {
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
                                chk: nowTimestamp + global.jwt.recheckIn,
                                exp: nowTimestamp + global.jwt.expiresIn,
                                jti: jti
                            }, global.jwt.secret)
                            
                            content = message.create(token, 'success', reid)
                        }
                        
                        ws.send(content)
                    })
                } else {
                    const errorCode = util.logError('Unable to login with the following key', key)
                    ws.send(message.create(errorCode, 'error', reid))
                }    
            }
        })
    },
    
    loginLink: function(account, reid, ws) {
        let query = 'SELECT * FROM user WHERE username = ?'
        
        global.db.query(query, account.username, function (error, results, fields) {
            if (error) {
                const errorCode = util.logError(error, error.sql)
                ws.send(message.create(errorCode, 'error', reid))
            } else if (results.length === 0) {
                ws.send(message.create('You have entered an incorrect username.', 'invalid', reid))
            } else {
                const emailAddress = results[0].email
                
                const login = crypto.randomBytes(64).toString('base64')
                const loginCreated = Math.floor(Date.now() / 1000)
                
                query = 'UPDATE user SET login = ?, login_created = ?, login_remember = ? WHERE username = ?'
                const queryValues = [login, loginCreated, account.remember, account.username]
                
                global.db.query(query, queryValues, function (error, results, fields) {
                    let content = '{}'
                    
                    if (error) {
                        const errorCode = util.logError(error, error.sql)
                        content = message.create(errorCode, 'error', reid)
                    } else {
                        let link = global.paths.siteurl + '/login.html?key=' + encodeURIComponent(login)
                        let body = '<p><strong>Party Line ' + account.username + '&nbsp;&nbsp;;-)</strong></p>'
                        body += '<p>Please click the following link to login to your account.</p>'
                        body += '<p><a href="' + link + '">Login to Party Line</a></p>'
                        
                        const email = {
                            to: emailAddress,
                            from: global.email.from,
                            subject: 'Party Line Login',
                            html: body,
                        }
                        
                        global.sendgrid.send(email)
                        
                        content = message.create('', 'success', reid)
                    }
                    
                    ws.send(content)
                })
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
        
        let welcome = ''
        
        if (user.isGuest) {
            welcome = 'Welcome! Your name has been auto-generated as ' + message.highlight(user.name, 'name', 'l')
        } else {
            welcome = 'Welcome! You are logged in as ' + message.highlight(user.name, 'name', 'l')
        }
        
        user.client.send(message.create(welcome, 'channel-message'))
        
        channel.users(user.client)
        
        send.all(message.highlight(user.name, 'name', 'r') + ' has connected', 'channel-message', user.client)
    }
}