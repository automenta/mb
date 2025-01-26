import { $ } from './imports';
import { BaseView } from './util/base-view';
import { UserInfo } from './types';
import { Awareness } from './imports';
import '/ui/css/friends.css';

export default class FriendsView extends BaseView {
    constructor(root: JQuery, getAwareness: () => Awareness) {
        super(root, { getAwareness });
    }

    protected getViewClass(): string {
        return 'friends-list-page';
    }

    render() {
        this.clearView();
        this.container.append(
            this.renderHeader('Friends'),
            $('<input>', { type: 'text', class: 'friends-search', placeholder: 'Search friends...' })
                .on('input', this.updateFriends.bind(this)),
            $('<ul>').addClass('friends-list')
        );
        this.updateFriends();
        this.getAwareness?.().on('change', this.updateFriends.bind(this));
    }

    private updateFriends() {
        const searchTerm = this.container.find('.friends-search').val() as string || '';
        const awarenessStates = this.getAwareness().getStates();
        let users: UserInfo[] = [];
        for (let clientId in awarenessStates) {
            const state = awarenessStates[clientId];
            if (state.user) {
                users.push(state.user);
            }
        }
        const filteredUsers = users.filter(user =>
            user.name?.toLowerCase().includes(searchTerm.toLowerCase())
        );
        this.renderFriendsList(filteredUsers);
    }

    private renderFriendsList(users: UserInfo[]) {
        const ul = this.container.find('ul.friends-list').empty();
        users.forEach(user => {
            const statusIcon = user.status === 'online' ? '🟢' : user.status === 'away' ? '🌙' : '🔴';
            ul.append($('<li>').html(`${user.name} <span class="status">${statusIcon}</span>`));
        });
    }
}
