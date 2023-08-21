// openssl req -x509 -newkey rsa:4096 -keyout secret.pem -out public.pem -days 2000 -nodes

const fs = require('fs')
const path = require('path')
const http = require('http')
const https = require('https')
const mysql = require('mysql')
const websocket = require('ws')
const jwt = require('jsonwebtoken')

const util = require('./lib/partyline/util.js')
const send = require('./lib/partyline/send.js')
const message = require('./lib/partyline/message.js')
const channel = require('./lib/partyline/channel.js')
const account = require('./lib/partyline/account.js')

global.sendgrid = require('@sendgrid/mail')

global.debug = false
global.paths = {}
global.email = {}
global.jwt = {}

global.users = []
global.guest = 0

global.db = null

let config

let webPort = 8080
let webServer = null
let wssConfig = null
let wssServer = null

try {
    config = JSON.parse(
        fs.readFileSync(path.resolve(__dirname, 'config.json'))
    )
    
    util.parseConfig(config)
} catch (error) {
    util.log('err', 'Unable to parse config.json', error)
    process.exit(1)
}

try {
    global.db = mysql.createConnection({
        host : config.db.host,
        user : config.db.user,
        password : config.db.password,
        database : config.db.database
    })
} catch (error) {
    util.log('err', 'Unable to create database connection', error)
    process.exit(1)
}

global.db.on('error', function(error) {
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        util.log('err', 'Unable to connect to the database', error)
        process.exit(1)
    } else {
        util.log('err', 'MySQL Error: ' + error)
    }
})

global.db.connect()

try {
    if (config.paths.siteurl.substring(0, 7) === 'http://') {
        webServer = http.createServer()
    } else {
        webServer = https.createServer({
            cert: fs.readFileSync(path.resolve(__dirname, 'public.pem')),
             key: fs.readFileSync(path.resolve(__dirname, 'secret.pem'))
        })
    }
    
    wssConfig = { server: webServer }
    wssServer = new websocket.Server(wssConfig)
} catch (error) {
    util.log('err', 'Unable to start the web socket server', error)
    process.exit(1)
}

wssServer.on('error', function(error) {
    util.log('err', 'WebSocket Error: ' + error)
})

wssServer.on('listening', function(ws, request) {
    util.log('sys', 'Listening on *:' + webPort)
})

wssServer.on('connection', function(ws, request) {
    const clientId = request.headers['sec-websocket-key']
    
    ws.on('close', function() {
        if (users[clientId]) {
            const clientName = users[clientId].name
            
            util.log('sys', clientName + ' has disconnected')
            send.all(message.highlight(clientName, 'name', 'r') + ' has disconnected', 'channel-message', ws)
            
            channel.users(ws)
        }
    })
    
    ws.on('message', function(msg) {
        try {
            msg = JSON.parse(msg)
            
            if (msg.jwt) {
                jwt.verify(msg.jwt, global.jwt.secret, function(error, token) {
                    if (error) {
                        let errorCode = ''
                        
                        if (error.name !== 'TokenExpiredError') {
                            errorCode = util.logError('JWT Error: ' + error, msg.jwt)
                        }
                        
                        ws.send(message.create(errorCode, 'account-logout'))
                    } else {
                        let runCommand = function() {
                            global.users[clientId] = {
                                client: ws,
                                clientId: clientId,
                                dbId: token.uid,
                                name: token.username,
                                isGuest: false
                            }
                            
                            let user = global.users[clientId]
                            
                            try {
                                const content = msg.content
                                
                                switch (msg.type) {
                                    case 'account-create' :
                                        account.create(content, msg.id, ws)
                                        break
                                    case 'account-login' :
                                        account.login(content, msg.id, ws, clientId)
                                        break
                                    case 'account-login-link' :
                                        account.loginLink(content, msg.id, ws)
                                        break
                                    case 'account-connect' :
                                        account.connect(user)
                                        break
                                    case 'channel-message' :
                                        channel.message(content, user)
                                        break
                                    case 'channel-create' :
                                        channel.create(content, user, msg.id, ws)
                                        break
                                }
                            } catch (e) {
                                util.log('err', 'Unable to run command', e)
                            }
                        }
                        
                        try {
                            const nowTimestamp = Math.floor(Date.now() / 1000)
                            
                            if (token.chk < nowTimestamp) {
                                account.token(token, ws, runCommand)
                            } else {
                                runCommand()
                            }
                        } catch (e) {
                            const errorCode = util.logError(e)
                            ws.send(message.create(errorCode, 'account-logout'))
                        }
                    }
                })
            } else {
                try {
                    switch (msg.type) {
                        case 'account-login' :
                            const content = msg.content
                            account.login(content, msg.id, ws, clientId)
                            break
                        case 'keepalive' :
                            ws.send(message.create('', msg.type))
                            break
                        default :
                            const errorCode = util.logError('JWT Missing', msg.type)
                            ws.send(message.create(errorCode, msg.type))
                    }
                } catch (e) {
                    util.log('err', 'Unable to run command', e)
                }
            }
        } catch (e) {
            util.log('err', 'Unable to parse message', e)
        }
    })
})

webServer.on('close', function() {
    global.db.end()
})

webServer.listen(webPort)