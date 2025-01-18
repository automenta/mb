import $ from "jquery";
import '/ui/css/Friends.css';

export default class FriendsView {
    private readonly root: JQuery;
    private readonly getAwareness: Function;
    private readonly container: JQuery;

    constructor(root:JQuery, getAwareness:Function) {
        this.root = root;
        this.getAwareness = getAwareness;
        this.container = $('<div>').addClass('Friends-list-page');
    }

    render() {
        this.container.empty();

        this.root.find('.main-view').empty().append(this.container);

        this.container.html(`
            <h3>Friends</h3>
            <ul></ul>
        `);

        const   updateFriends = () => {
            const users: any[] = [];
            this.getAwareness().getStates().forEach((state: { user: any; }) => {
                if (state.user) users.push(state.user);
            });

            const ul = this.container.find('ul').empty();

            this.item(users, ul);
            //users.forEach(user => ul.append($('<li>').text(user.name).css('color', user.color)));
        };

        updateFriends();
        this.getAwareness().on('change', updateFriends);
    }

    private item(users: any[], ul: JQuery<HTMLUListElement>) {
        users.forEach(user => ul.append($('<li>').text(user.name)));
    }
}
