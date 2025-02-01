//untested

import * as IPFS from 'ipfs-core';

let ipfs, myPeerId, peers = {}, peerConnection;

const iceServers = [{urls: 'stun:stun.l.google.com:19302'}];

async function init() {
    ipfs = await IPFS.create();
    myPeerId = (await ipfs.id()).id;
    await subscribe('my-webrtc-app');
}

async function subscribe(topic) {
    ipfs.pubsub.subscribe(topic, async ({from, data}) => {
        if (from === myPeerId) return;

        const msg = JSON.parse(data);
        const type = msg.type;
        if (type === 'peer_discovery' && !peers[from])
            await connect(from, msg.sdpOffer);
        else if (['sdp_offer', 'sdp_answer'].includes(type))
            await (type === 'sdp_offer' ? handleOffer : handleAnswer)(from, new RTCSessionDescription(JSON.parse(msg[type.replace('_', '')])));
        else if (type === 'ice_candidate')
            await handleIceCandidate(from, new RTCIceCandidate(msg.candidate));
    });
    publish(topic, {type: 'peer_discovery'});
}

async function publish(topic, msg) {
    await ipfs.pubsub.publish(topic, JSON.stringify(msg));
}

async function connect(peerId, offer) {
    peerConnection = new RTCPeerConnection({iceServers});
    addIceCandidateHandler(peerId);

    if (!offer) {
        offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        await publish('my-webrtc-app', {type: 'sdp_offer', offer: JSON.stringify(offer), to: peerId});
    } else {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        await publish('my-webrtc-app', {type: 'sdp_answer', answer: JSON.stringify(answer), to: peerId});
    }

    peers[peerId] = peerConnection; // Store connection
}


async function handleOffer(peerId, offer) {
    peerConnection = new RTCPeerConnection({iceServers});
    addIceCandidateHandler(peerId);
    await peerConnection.setRemoteDescription(offer);
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    await publish('my-webrtc-app', {type: 'sdp_answer', answer: JSON.stringify(answer), to: peerId});
    peers[peerId] = peerConnection;
}

async function handleAnswer(peerId, answer) {
    await peers[peerId].setRemoteDescription(answer);
}

async function handleIceCandidate(peerId, candidate) {
    await peers[peerId].addIceCandidate(candidate);
}

function addIceCandidateHandler(peerId) {
    peerConnection.onicecandidate = (event) => {
        if (event.candidate) publish('my-webrtc-app', {type: 'ice_candidate', candidate: event.candidate, to: peerId});
    };
}
