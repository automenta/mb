import { DatastorePlugin } from './db.plugin';
import { NetworkPlugin } from './net.plugin';

export class PluginManager {
  private datastorePlugins: { [name: string]: DatastorePlugin } = {};
  private networkPlugins: { [name: string]: NetworkPlugin } = {};

  async registerDatastorePlugin(plugin: DatastorePlugin): Promise<void> {
    await plugin.init({}); // Initialize with an empty config for now
    this.datastorePlugins[plugin.name] = plugin;
  }

  async registerNetworkPlugin(plugin: NetworkPlugin): Promise<void> {
    await plugin.init({}); // Initialize with an empty config for now
    this.networkPlugins[plugin.name] = plugin;
  }

  getDatastorePlugin(name: string): DatastorePlugin | undefined {
    return this.datastorePlugins[name];
  }

  getNetworkPlugin(name: string): NetworkPlugin | undefined {
    return this.networkPlugins[name];
  }

  async closeAllPlugins(): Promise<void> {
    const datastorePromises = Object.values(this.datastorePlugins).map(plugin => plugin.close());
    const networkPromises = Object.values(this.networkPlugins).map(plugin => plugin.disconnect());
    await Promise.all([...datastorePromises, ...networkPromises]);
  }
}