import $ from 'jquery';
import * as Y from 'yjs';
import { Awareness } from 'y-protocols/awareness';

export interface UserInfo {
  userId: string;
  name: string;
  color: string;
}

class PresenceManager {
  private awareness: Awareness;
  private presenceTimeout: number = 30000; // 30 seconds

  constructor(doc: Y.Doc) {
    this.awareness = new Awareness(doc);
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
  private readonly getUser: Function;
  private awareness: Function;
  private $: (selector: string, context?: any) => JQuery;

  constructor(ele, getUser, awareness) {
    this.getUser = getUser;
    this.awareness = awareness;
    this.$ = (selector, context?) => $(selector, context || ele);
  }

  render() {
    const user = this.getUser();
    const listener = e =>
      this.awareness().setLocalStateField('user', {
        ...user,
        [e.target.id.replace('user-', '')]: e.target.value,
      });

    // Clear and get container
    this.$('.main-view')
      .empty()
      .append(
        $('<div/>', {
          class: 'profile-page',
        }).append(
          $('<div/>', {
            class: 'profile-field',
          }).append(
            $('<label/>', {
              for: 'user-name',
              text: 'Name: ',
            }),
            $('<input/>', {
              type: 'text',
              class: 'user-name',
              placeholder: 'Name',
              value: user.name,
            }).on('input', listener)
          ),
          $('<div/>', { class: 'profile-field' }).append(
            $('<label/>', {
              for: 'user-color',
              text: 'Color: ',
            }),
            $('<input/>', {
              type: 'color',
              class: 'user-color',
              value: user.color,
            }).on('input', listener)
          )
        )
      );
  }
}