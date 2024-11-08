import App from './app';
import $ from 'jquery';
import { v4 as uuid } from 'uuid';

let userID = localStorage['userID'];
if (!userID) {
    userID = uuid();
    localStorage['userID'] = userID;
}
$('body').append(new App(userID, "todo").ele);