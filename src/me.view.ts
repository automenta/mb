import $ from 'jquery';

interface UserPresence {
    userId: string;
    cursor: {
        position: number;
        selection?: [number, number];
    };
    lastActive: number;
    status: 'active' | 'idle' | 'away';
}

class PresenceManager {
    private awareness: Y.Awareness;
    private presenceTimeout: number = 30000; // 30 seconds

    constructor(doc: Y.Doc) {
        this.awareness = new Y.Awareness(doc);
        this.startPresenceTracking();
    }

    private startPresenceTracking() {
        setInterval(() => {
            const states = this.awareness.getStates();
            states.forEach((state, clientId) => {
                if (Date.now() - state.lastActive > this.presenceTimeout) {
                    this.awareness.setLocalState({ status: 'away' });
                }
            });
        }, 5000);
    }
}

export default class MeView {
    private getUser: Function;
    private awareness: Function;
    private $: (element) => JQueryStatic;

    constructor(ele, getUser, awareness) {
        this.getUser = getUser;
        this.awareness = awareness;
        this.$ = element => $(element, ele);
    }

    render() {
        const user = this.getUser();
        const listener = e => this.awareness().setLocalStateField('user', {
            ...user,
            [e.target.id.replace('user-', '')]: e.target.value
        });

        // Clear and get container
        this.$('#main-view').empty().append(
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