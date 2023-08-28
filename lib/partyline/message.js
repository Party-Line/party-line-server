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
        let msgDate = new Date(date * 1000).toLocaleString('en-US', { timeStyle: 'short' })
        
        let msg = ''
        
        msg += '<div class="col">'
        
        msg += '<div class="row">'
        msg += '<div class="col pl-chat-message-name">' + msgName + '</div>'
        msg += '<div class="col pl-chat-message-date text-end"><small>' + msgDate + '</small></div>'
        msg += '</div>'
        
        msg += '<div class="row">'
        msg += '<div class="col pl-chat-message-content">' + content + '</div>'
        msg += '</div>'
        
        msg += '</div>'
        
        return msg
    }
}