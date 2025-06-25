// Background script for TTS Chrome Extension
console.log('TTS Background script loaded');

// Service worker initialization
chrome.runtime.onInstalled.addListener((details) => {
  console.log('Extension installed:', details.reason);
});

// Handle extension icon click
chrome.action.onClicked.addListener((tab) => {
  console.log('Extension icon clicked on tab:', tab.id);
});

export {};
