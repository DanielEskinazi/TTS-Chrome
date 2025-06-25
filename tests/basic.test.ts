// Basic test to verify Jest setup
describe('Basic Setup', () => {
  test('should pass basic test', () => {
    expect(true).toBe(true);
  });

  test('should have Chrome APIs mocked', () => {
    expect(chrome).toBeDefined();
    expect(chrome.runtime).toBeDefined();
    expect(chrome.tts).toBeDefined();
    expect(chrome.storage).toBeDefined();
  });
});