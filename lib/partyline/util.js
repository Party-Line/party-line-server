const crypto = require('crypto')

module.exports = {
    log: function(type, message, error, extra) {
        const date = new Date().toString().substr(0, 24) + ' '
        
        console.log(date + '[' + type + '] ' + message)
        
        if (error) {
            if (global.debug || !error.message) {
                if (error.message) {
                    debug = error.message
                } else {
                    if (typeof error === 'object') {
                        debug = JSON.stringify(error)
                    } else {
                        debug = error
                    }
                }
                
                console.log(date + '[dbg] ' + debug)
                
                if (extra) {
                    console.log(date + '[dbg] ' + extra)
                } else if (error.stack) {
                    console.log(date + '[dbg] ' + error.stack.split('\n')[1].trim())
                }
            }
        }
    },
    
    logError: function(error, extra) {
        let errorCode = 'Error Code #' + this.UUID4()
        
        this.log('err', errorCode, error, extra)
        
        return errorCode
    },
    
    parseConfig: function(config) {
        // debug
        
        if (typeof config.debug === 'boolean') {
            global.debug = config.debug
        }
        
        // paths
        
        if (!config.paths) {
            throw 'config.json is missing the server paths (paths)'
        } else {
            if (!config.paths.siteurl) {
                throw 'config.json is missing the Site URL (paths.siteurl)'
            }
            
            global.paths = config.paths
        }
        
        // db
        
        if (!config.db) {
            throw 'config.json is missing the database settings (db)'
        } else {
            if (!config.db.host) {
                throw 'config.json is missing the database host (db.host)'
            }
            
            if (!config.db.user) {
                throw 'config.json is missing the database user (db.user)'
            }
            
            if (!config.db.password) {
                throw 'config.json is missing the database user\'s password (db.password)'
            }
            
            if (!config.db.database) {
                throw 'config.json is missing the database name (db.database)'
            }
        }
        
        // jwt
        
        if (!config.jwt) {
            throw 'config.json is missing the JSON Web Token settings (jwt)'
        } else {
            if (!config.jwt.secret) {
                throw 'config.json is missing the JWT secret key (jwt.secret)'
            }
            
            if (!config.jwt.expiresIn) {
                throw 'config.json is missing the JWT expiration (jwt.expiresIn)'
            }
            
            if (!config.jwt.recheckIn) {
                throw 'config.json is missing the JWT refresh interval (jwt.recheckIn)'
            }
            
            global.jwt = config.jwt
            
            global.jwt.expiresIn = parseInt(global.jwt.expiresIn, 10) || 0
            global.jwt.recheckIn = parseInt(global.jwt.recheckIn, 10) || 0
        }
        
        // api
        
        if (!config.api) {
            throw 'config.json is missing the API settings (api)'
        } else {
            if (!config.api.sendgrid) {
                throw 'config.json is missing the API key for SendGrid (api.sendgrid)'
            } else {
                global.sendgrid.setApiKey(config.api.sendgrid)
            }
        }
        
        // email
        
        if (!config.email) {
            throw 'config.json is missing the email settings (email)'
        } else {
            if (!config.email.from) {
                throw 'config.json is missing the From email (email.from)'
            }
            
            global.email = config.email
        }
    },
    
    // https://gist.github.com/jed/982883
    UUID4: function() {
        let hex = []
        let ui8 = crypto.randomBytes(16)
        
        for (let i = 0; i < 256; i++) {
            hex[i] = (i < 16 ? '0' : '') + (i).toString(16).toUpperCase()
        }
        
        ui8[6] = ui8[6] & 0x0F | 0x40
        ui8[8] = ui8[8] & 0x3F | 0x80
        
        return (
            hex[ui8[0]] +
            hex[ui8[1]] +
            hex[ui8[2]] +
            hex[ui8[3]] +
            '-' +
            hex[ui8[4]] +
            hex[ui8[5]] +
            '-' +
            hex[ui8[6]] +
            hex[ui8[7]] +
            '-' +
            hex[ui8[8]] +
            hex[ui8[9]] +
            '-' +
            hex[ui8[10]] +
            hex[ui8[11]] +
            hex[ui8[12]] +
            hex[ui8[13]] +
            hex[ui8[14]] +
            hex[ui8[15]]
        )
    }
}