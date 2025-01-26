import { $ } from './imports';
import BaseView from './util/base-view';
import { UserInfo } from './types';
import { Awareness } from './imports';
import '/ui/css/friends.css';

export default class FriendsView extends BaseView {
    private getAwareness: () => Awareness;

    constructor(root: JQuery, getAwareness: () => Awareness) {
        super(root);
        this.getAwareness = getAwareness;
    }

    protected getViewClass(): string {
        return 'friends-list-page';
    }

    render() {
        this.root.empty().append(
            this.renderHeader('Friends'), 
            $('<input>', { type: 'text', class: 'friends-search', placeholder: 'Search friends...' })
                .on('input', this.updateFriends.bind(this)),
            $('<ul>').addClass('friends-list')
        );
        this.getAwareness().on('change', this.updateFriends.bind(this));
        return this.root; 
    }

    private updateFriends() {
        const searchTerm = (Array.isArray(this.root.find('.friends-search').val()) ? '' : (this.root.find('.friends-search').val() ?? '').toString()).toLowerCase();
        const awarenessStates = this.getAwareness().getStates();
        const users = Array.from(awarenessStates.entries())
            .filter(([, state]) => state && state.user)
            .map(([, state]) => state.user);
        const filteredUsers = users.filter(user => user.name?.toLowerCase().includes(searchTerm));
        this.renderFriendsList(filteredUsers);
    }

    private renderFriendsList(users: UserInfo[]) {
        const ul = this.root.find('ul.friends-list').empty(); 
        users.forEach(user => {
            let statusIcon = '';
            switch (user.status) {
                case 'online': statusIcon = '🟢'; break;
                case 'away': statusIcon = '🌙'; break;
                default: statusIcon = '🔴';
            }
            ul.append($('<li>').html(`${user.name} <span class="status">${statusIcon}</span>`));
        });
    }
}
