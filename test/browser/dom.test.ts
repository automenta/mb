import { describe, expect, test } from 'vitest';
import '../setup.js';

describe('DOM Operations', () => {
  test('creates and interacts with button', () => {
    const button = document.createElement('button');
    button.textContent = 'Click me';
    document.body.appendChild(button);

    expect(button.textContent).toBe('Click me');
    
    let clicked = false;
    button.addEventListener('click', () => clicked = true);
    button.click();
    
    expect(clicked).toBe(true);
  });

  test('matches snapshot', () => {
    const div = document.createElement('div');
    const h1 = document.createElement('h1');
    h1.textContent = 'Test';
    div.appendChild(h1);
    
    expect(div).toMatchSnapshot();
  });
});