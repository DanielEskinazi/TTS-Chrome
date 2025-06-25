const { spawn } = require('child_process');
const path = require('path');
const os = require('os');

const extensionPath = path.join(__dirname, '../dist');

// Chrome executable paths for different platforms
const chromeExecutables = {
  darwin: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  win32: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  linux: 'google-chrome',
};

const platform = os.platform();
const chromeExecutable = chromeExecutables[platform] || 'google-chrome';

// Chrome flags for development
const chromeFlags = [
  `--load-extension=${extensionPath}`,
  '--auto-open-devtools-for-tabs',
  '--disable-extensions-except=' + extensionPath,
  '--user-data-dir=' + path.join(__dirname, '../.chrome-profile'),
  '--no-first-run',
  '--disable-default-apps',
  '--disable-sync',
  '--disable-features=ChromeWhatsNewUI',
  '--enable-logging=stderr',
  '--v=1',
];

console.log('Launching Chrome for extension development...');
console.log('Extension path:', extensionPath);

const chrome = spawn(chromeExecutable, chromeFlags, {
  stdio: 'inherit',
  detached: false,
});

chrome.on('error', (err) => {
  console.error('Failed to launch Chrome:', err);
  console.error('Chrome executable path:', chromeExecutable);
});

chrome.on('exit', (code) => {
  console.log(`Chrome exited with code ${code}`);
});

// Handle process termination
process.on('SIGINT', () => {
  chrome.kill();
  process.exit();
});