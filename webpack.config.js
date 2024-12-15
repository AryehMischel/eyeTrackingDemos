const path = require('path');

module.exports = {
  entry: {
    eyeTracking: './src/eyeTracking.js',
    headTracking: './src/headTracking.js',
    combinedTracking: './src/combinedTracking.js',
  },
  output: {
    filename: '[name].bundle.js', // Generates dissolveShader.bundle.js, portalShader.bundle.js, etc.
    path: path.resolve(__dirname, 'public/dist'),
  },
  mode: 'development', // Set the mode to 'development' or 'production'
  module: {
    rules: [
      {
        test: /\.glsl$/,
        use: 'raw-loader'
      }
    ]
  },
 
  stats: {
    errorDetails: true
  }
};