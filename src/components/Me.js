import $ from 'jquery';

export default class MePage {
    constructor(shadowRoot, getUser, getAwareness) {
        this.shadowRoot = shadowRoot;
        this.getUser = getUser;
        this.getAwareness = getAwareness;
        this.$ = element => $(element, this.shadowRoot);
    }

    render() {
        const user = this.getUser();
        const listener = e => this.getAwareness().setLocalStateField('user', {
            ...user,
            [e.target.id.replace('user-', '')]: e.target.value
        });

        // Clear and get container
        this.$('#editor-container').empty().append(
            $('<div/>', {
                class: 'profile-page'
            }).append(
                $('<div/>', {
                    class: 'profile-field'
                }).append(
                    $('<label/>', {
                        for: 'user-name',
                        text: 'Name: '
                    }),
                    $('<input/>', {
                        type: 'text',
                        id: 'user-name',
                        placeholder: 'Name',
                        value: user.name
                    }).on('input', listener)
                ),
                $('<div/>', { class: 'profile-field' }).append(
                    $('<label/>', {
                        for: 'user-color',
                        text: 'Color: '
                    }),
                    $('<input/>', {
                        type: 'color',
                        id: 'user-color',
                        value: user.color
                    }).on('input', listener)
                )
            )
        );
    }
}