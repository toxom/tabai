const path = require('path');

module.exports = {
    entry: {
        popup: './popup/popup.js',
        background: './background/background.js',
        content: './content/content.js'
    },
    output: {
        filename: '[name].bundle.js',  // This creates flat structure
        path: path.resolve(__dirname, 'dist')
    },
    resolve: {
        extensions: ['.js'],
        modules: ['node_modules']
    },
    mode: 'development',
    devtool: 'source-map'
};