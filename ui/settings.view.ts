import {Store} from "./store";

export class SettingsView {
    private readonly ele: JQuery;
    private readonly store: Store;

    constructor(ele: JQuery, store: Store) {
        this.ele = ele;
        this.store = store;
        this.render();
    }

    render(): void {
        const signalingServers =
            this.store.db.config.getSignalingServers().join(", ");
        this.ele.html(`
            <h2>Settings</h2>
            <div>
                <h3>Signaling Servers</h3>
                <p>Enter signaling server URLs separated by commas:</p>
                <textarea id="signalingServers" rows="5" cols="50">${signalingServers}</textarea>
                <button id="saveSignalingServers">Save</button>
            </div>
        `);

        this.ele.find("#saveSignalingServers").on("click", () => {
            const servers = (this.ele.find("#signalingServers").val() as string)
                .split(",")
                .map((s) => s.trim())
                .filter((s) => s.length > 0);
            this.store.db.config.setSignalingServers(servers);
            alert("Signaling servers saved.");
        });
    }
}
