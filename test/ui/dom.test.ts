import {describe, expect, test} from 'vitest';

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

    test('adds and removes elements', () => {
        const parent = document.createElement('div');
        const child = document.createElement('p');
        parent.appendChild(child);
        document.body.appendChild(parent);

        expect(parent.children.length).toBe(1);

        parent.removeChild(child);
        expect(parent.children.length).toBe(0);
    });


    test('manipulates element attributes', () => {
        const div = document.createElement('div');
        div.setAttribute('data-test', 'true');
        document.body.appendChild(div);

        expect(div.getAttribute('data-test')).toBe('true');

        div.setAttribute('data-test', 'false');
        expect(div.getAttribute('data-test')).toBe('false');

        div.removeAttribute('data-test');
        expect(div.getAttribute('data-test')).toBe(null);
    });

    test('matches snapshot', () => {
        const div = document.createElement('div');
        const h1 = document.createElement('h1');
        h1.textContent = 'Test';
        div.appendChild(h1);

        expect(div).toMatchSnapshot();
    });

    test('handles text content updates', () => {
        const p = document.createElement('p');
        p.textContent = 'Initial text';
        document.body.appendChild(p);

        expect(p.textContent).toBe('Initial text');

        p.textContent = 'Updated text';
        expect(p.textContent).toBe('Updated text');
    });

    test('handles innerHTML updates', () => {
        const div = document.createElement('div');
        div.innerHTML = '<h1>Initial content</h1>';
        document.body.appendChild(div);

        expect(div.innerHTML).toBe('<h1>Initial content</h1>');

        div.innerHTML = '<h2>Updated content</h2>';
        expect(div.innerHTML).toBe('<h2>Updated content</h2>');
    });

    test('handles classList manipulation', () => {
        const div = document.createElement('div');
        document.body.appendChild(div);

        expect(div.classList.length).toBe(0);

        div.classList.add('test-class');
        expect(div.classList.contains('test-class')).toBe(true);

        div.classList.remove('test-class');
        expect(div.classList.contains('test-class')).toBe(false);
    });

    test('handles style updates', () => {
        const div = document.createElement('div');
        document.body.appendChild(div);

        expect(div.style.color).toBe('');

        div.style.color = 'red';
        expect(div.style.color).toBe('red');

        div.style.color = '';
        expect(div.style.color).toBe('');
    });
});