export default class MePage {
    constructor(shadowRoot, getUser, getAwareness) {
        this.shadowRoot = shadowRoot;
        this.getUser = getUser;
        this.getAwareness = getAwareness;
    }

    render() {
        const editorContainer = this.shadowRoot.querySelector('#editor-container');
        editorContainer.innerHTML = '';

        const container = document.createElement('div');
        container.classList.add('profile-page');
        editorContainer.appendChild(container);

        const user = this.getUser();

        const nameLabel = document.createElement('label');
        nameLabel.textContent = 'Name: ';
        nameLabel.setAttribute('for', 'user-name');

        const listener = e => this.getAwareness().setLocalStateField('user', {...user, name: e.target.value});

        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.id = 'user-name';
        nameInput.placeholder = 'Name';
        nameInput.value = user.name;
        nameInput.addEventListener('input', e => listener);

        const colorLabel = document.createElement('label');
        colorLabel.textContent = 'Color: ';
        colorLabel.setAttribute('for', 'user-color');

        const colorInput = document.createElement('input');
        colorInput.type = 'color';
        colorInput.id = 'user-color';
        colorInput.value = user.color;
        colorInput.addEventListener('input', listener);

        const nameDiv = document.createElement('div');
        nameDiv.classList.add('profile-field');
        nameDiv.appendChild(nameLabel);
        nameDiv.appendChild(nameInput);

        const colorDiv = document.createElement('div');
        colorDiv.classList.add('profile-field');
        colorDiv.appendChild(colorLabel);
        colorDiv.appendChild(colorInput);

        container.appendChild(nameDiv);
        container.appendChild(colorDiv);
    }
}
