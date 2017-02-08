/*********
Contains the static text used for homepage, help pages, and other misc. locations
*********/

var statics = {


};

// Clear out whitespace.
Object.getOwnPropertyNames(statics).forEach(function(key){
    // newlines & spaces -> single space | spaces around html linebreak incl. linebreak -> linebreak | spaces at start -> nothing
    statics[key] = statics[key].replace(/[\r\n(\s+)]+/g," ").replace(/((\s+)<br>(\s+))/g, "<br>").replace(/(^\s+)/g,'');
});

module.exports = statics;