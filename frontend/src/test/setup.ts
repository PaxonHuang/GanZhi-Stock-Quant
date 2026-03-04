/**
 * Test setup file for Vitest
 * Configures Jest DOM matchers and testing library
 */
import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock echarts
vi.mock('echarts', () => {
  const mockInstance = {
    setOption: vi.fn(),
    dispose: vi.fn(),
    resize: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
  };

  return {
    __esModule: true,
    default: {
      init: vi.fn(() => mockInstance),
    },
    init: vi.fn(() => mockInstance),
    getInstanceByDom: vi.fn(() => mockInstance),
  };
});
