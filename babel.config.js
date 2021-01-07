
module.exports = function(api){
    api.cache(true);
    return {
        "presets" : [
            // We don't need to convert import/export statements.
            // @see https://stackoverflow.com/questions/63563485/how-can-i-preserve-dynamic-import-statements-with-babel-preset-env
            [ "@babel/preset-env", { "modules": false } ],
            "@babel/preset-react",
        ],
        "plugins": [
            "@babel/plugin-syntax-dynamic-import",
            "@babel/plugin-proposal-object-rest-spread",
            "@babel/plugin-proposal-class-properties",
            "babel-plugin-minify-dead-code-elimination"
        ],
        "comments": true
    };
};
