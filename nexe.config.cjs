const { compile } = require('nexe');

compile({
  input: './main.js',  // Your entry file
  output: 'crosst-chat-ts',  // Output executable file
  resources: [
    'boot/**/*',
    'hazel/**/*',
    'init/**/*',
    'src/**/*'
  ],
  targets: [
    'windows-x64-14.5.0',
    'linux-x64-14.5.0',
    'macos-x64-14.5.0'
  ]
})