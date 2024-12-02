import $ from "jquery";
import '/ui/css/frens.css';

export default class FrensView {
    private readonly root: JQuery;
    private readonly getAwareness: Function;
    private readonly container: JQuery;

    constructor(root:JQuery, getAwareness:Function) {
        this.root = root;
        this.getAwareness = getAwareness;
        this.container = $('<div>').addClass('frens-list-page');
    }

    render() {
        this.container.empty();

        this.root.find('.main-view').empty().append(this.container);

        this.container.html(`
            <h3>FRENS</h3>
            <ul></ul>
        `);

        const   updateFrens = () => {
            const users: any[] = [];
            this.getAwareness().getStates().forEach((state: { user: any; }) => {
                if (state.user) users.push(state.user);
            });

            const ul = this.container.find('ul').empty();

            this.fren_item(users, ul);
            //users.forEach(user => ul.append($('<li>').text(user.name).css('color', user.color)));
        };

        updateFrens();
        this.getAwareness().on('change', updateFrens);
    }

    private fren_item(users: any[], ul: JQuery<HTMLUListElement>) {
        users.forEach(user => ul.append($('<li>').text(user.name)));
    }
}
