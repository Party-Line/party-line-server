const util = require('./util.js')

module.exports = {
    create: function(content, type, reid) {
        id = util.UUID4()
        
        return JSON.stringify({
            id: id,
            content: content,
            type: type,
            reid: reid
        })
    },
    
    highlight: function(text, type, margin) {
        const marginClass = (margin) ? ' mb-' + margin : ''
        return '<span class="pl-chat-highlight-' + type + marginClass + '">' + text + '</span>'
    },
    
    format: function(name, date, content) {
        let msgName = this.highlight(name, 'name', 'l') + ' says'
        let msgDate = (date) ? new Date(date * 1000).toLocaleString('en-US', { timeStyle: 'short' }) : ''
        
        let msg = ''
        
        msg += '<div class="col">'
        
        msg += '<div class="row gx-1">'
        msg += '<div class="col-10 pl-chat-message-info">' + msgName + '</div>'
        msg += '<div class="col-2 pl-chat-message-date text-end"><small>' + msgDate + '</small></div>'
        msg += '</div>'
        
        msg += '<div class="row">'
        msg += '<div class="col pl-chat-message-content">' + content + '</div>'
        msg += '</div>'
        
        msg += '</div>'
        
        return msg
    },
    
    formatSystem: function(info, date) {
        let msgDate = (date) ? new Date(date * 1000).toLocaleString('en-US', { timeStyle: 'short' }) : ''
        
        let msg = ''
        
        msg += '<div class="col">'
        
        msg += '<div class="row gx-1">'
        msg += '<div class="col-10 pl-chat-message-info">' + info + '</div>'
        msg += '<div class="col-2 pl-chat-message-date text-end"><small>' + msgDate + '</small></div>'
        msg += '</div>'
        
        msg += '</div>'
        
        return msg
    },
    
    formatLine: function(info, color, pos) {
        let msgInfo = ''
        
        msgInfo += '<div class="row align-items-center gx-2">'
        
        switch (pos) {
            // left
            case 'l' :
                msgInfo += '<div class="col-1 text-' + color + ' pb-1 fw-bold"><small>' + info + '</small></div>'
                msgInfo += '<div class="col-11"><hr class="border-' + color + '" /></div>'
                
                break
            
            // center
            case 'c' :
                msgInfo += '<div class="col-5"><hr class="border-' + color + '" /></div>'
                
                msgInfo += '<div class="col-2 pb-1 text-' + color + ' fw-bold">'
                msgInfo += '<div class="text-center"><small>' + info + '</small></div>'
                msgInfo += '</div>'
                
                msgInfo += '<div class="col-5"><hr class="border-secondary" /></div>'
                
                break
            
            // right
            case 'r' :
                msgInfo += '<div class="col-11"><hr class="border-' + color + '" /></div>'
                msgInfo += '<div class="col-1 text-' + color + ' pb-1 fw-bold"><small>' + info + '</small></div>'
                
                break
            
            default :
                msgInfo += '<div class="col"><hr class="border-' + color + '" /></div>'
        }
        
        msgInfo += '</div>'
                        
        let msg = ''
        
        msg += '<div class="col">'
        
        msg += '<div class="row">'
        msg += '<div class="col pl-chat-message-line">' + msgInfo + '</div>'
        msg += '</div>'
        
        msg += '</div>'
        
        return msg
    }
}