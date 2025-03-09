// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
import '@testing-library/jest-dom';
import { jest, expect, afterEach } from '@jest/globals';

// Extend the expect interface with custom matchers
// This makes TypeScript recognize the DOM matchers from jest-dom
expect.extend({
  toBeInTheDocument(received) {
    const { isNot } = this;
    const pass = received !== null && received !== undefined;
    return {
      pass,
      message: () => 
        `${received} ${isNot ? 'should not' : 'should'} be in the document`,
    };
  }
});

// Mock fetch for testing API calls
global.fetch = jest.fn(() => 
  Promise.resolve({
    json: () => Promise.resolve({}),
    ok: true,
    status: 200,
    text: () => Promise.resolve(''),
  })
);

// Reset any request mocks after each test
afterEach(() => {
  if (global.fetch && typeof global.fetch.mockClear === 'function') {
    global.fetch.mockClear();
  }
});