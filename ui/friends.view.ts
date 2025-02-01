import {$, Awareness} from './imports';
import View from './util/view';
import {UserInfo} from './types';
import '/ui/css/friends.css';

export default class FriendsView extends View {
    private getAwareness: () => Awareness;

    constructor(root: JQuery, getAwareness: () => Awareness) {
        super(root);
        this.getAwareness = getAwareness;
    }

    render() {
        this.root.empty().append(
            this.renderHeader('Friends'),
            $('<input>', {type: 'text', class: 'friends-search', placeholder: 'Search friends...'})
                .on('input', this.updateFriends.bind(this)),
            $('<ul>').addClass('friends-list')
        );
        this.getAwareness().on('change', this.updateFriends.bind(this));
        return this.root;
    }

    protected getViewClass(): string {
        return 'friends-list-page';
    }

    private updateFriends() {
        const searchTerm = this.root.find('.friends-search').val();
        const searchTermStr = (searchTerm as string ?? '').toLowerCase();
        const awarenessStates = this.getAwareness().getStates();
        const users = Array.from(awarenessStates.entries())
            .filter(([, state]) => state && state.user)
            .map(([, state]) => state.user);
        const filteredUsers = users.filter(user => user.name?.toLowerCase().includes(searchTermStr));
        this.renderFriendsList(filteredUsers);
    }

    private renderFriendsList(users: UserInfo[]) {
        const ul = this.root.find('ul.friends-list').empty();
        let statusIcon = '🔴';
        users.forEach(user => {
            switch (user.status) {
                case 'online':
                    statusIcon = '🟢';
                    break;
                case 'away':
                    statusIcon = '🌙';
                    break;
            }
            ul.append($('<li>').html(`${user.name} <span class="status">${statusIcon}</span>`));
        });
    }
}
