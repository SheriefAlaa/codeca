import css from '../css/app.scss';

// import 'phoenix_html';

import channel from './socket';

// things

function pushPeerMessage(type, content) {
  channel.push('peer-message', {
    body: JSON.stringify({
      type,
      content,
    }),
  });
}

const mediaConstraints = {
  audio: true,
  video: true,
};

const devices = navigator.mediaDevices;

const connectButton = document.getElementById('connect');
const callButton = document.getElementById('call');
const disconnectButton = document.getElementById('disconnect');

const remoteVideo = document.getElementById('remote-stream');
const localVideo = document.getElementById('local-stream');

let peerConnection;
let remoteStream = new MediaStream();

setVideoStream(remoteVideo, remoteStream);

const offerOptions = {
  offerToReceiveAudio: 1,
  offerToReceiveVideo: 1
};

disconnectButton.disabled = true;
callButton.disabled = true;
connectButton.onclick = function(e) {
  connect().then((val) => {
    log('connected');
  }).catch(function(e){
    log('error', e)
  });
};
callButton.onclick = call;
disconnectButton.onclick = disconnect;

async function connect() {
  log('entered connect!')
  connectButton.disabled = true;
  disconnectButton.disabled = false;
  callButton.disabled = false;
  const localStream = await devices.getUserMedia(mediaConstraints);
  setVideoStream(localVideo, localStream);
  peerConnection = createPeerConnection(localStream);
}

async function call() {
  let offer = await peerConnection.createOffer(offerOptions);
  peerConnection.setLocalDescription(offer);
  pushPeerMessage('video-offer', offer);
}

function createPeerConnection(stream) {
  var ICE_config= {
    'iceServers': [
      {
        'url': 'stun:stun.l.google.com:19302'
      },
      {
        'url': 'turn:192.158.29.39:3478?transport=udp',
        'credential': 'JZEOEt2V3Qb0y27GRntt2u2PAYA=',
        'username': '28224511:1379330808'
      },
      {
        'url': 'turn:192.158.29.39:3478?transport=tcp',
        'credential': 'JZEOEt2V3Qb0y27GRntt2u2PAYA=',
        'username': '28224511:1379330808'
      }
    ]
  }

  // let pc = new RTCPeerConnection({
  //   'iceServers': [
  //     {
  //       urls: 'stun:stun.stunprotocol.org',
  //     }
  //   ]
  // });

  let pc = new RTCPeerConnection(ICE_config);
  pc.ontrack = handleOnTrack;
  pc.onicecandidate = handleIceCandidate;
  stream.getTracks().forEach(track => pc.addTrack(track));
  return pc;
}

function handleOnTrack(event) {
  log('handleOnTrack')
  log(event);
  remoteStream.addTrack(event.track);
}

function handleIceCandidate(event) {
  log('handleIceCandidate')
  if (!!event.candidate) {
    pushPeerMessage('ice-candidate', event.candidate);
  }
}

function disconnect() {
  connectButton.disabled = false;
  disconnectButton.disabled = true;
  callButton.disabled = true;
  unsetVideoStream(localVideo);
  unsetVideoStream(remoteVideo);
  peerConnection.close();
  peerConnection = null;
  remoteStream = new MediaStream();
  setVideoStream(remoteVideo, remoteStream);
  pushPeerMessage('disconnect', {});
}

function receiveRemote(offer) {
  let remoteDescription = new RTCSessionDescription(offer);
  peerConnection.setRemoteDescription(remoteDescription);
}

async function answerCall(offer) {
  receiveRemote(offer);
  let answer = await peerConnection.createAnswer();
  peerConnection
    .setLocalDescription(answer)
    .then(() =>
      pushPeerMessage('video-answer', peerConnection.localDescription)
    );
}

channel.on('peer-message', payload => {
  const message = JSON.parse(payload.body);
  switch (message.type) {
    case 'video-offer':
      log('offered: ', message.content);
      answerCall(message.content);
      break;
    case 'video-answer':
      log('answered: ', message.content);
      receiveRemote(message.content);
      break;
    case 'ice-candidate':
      log('candidate: ', message.content);
      let candidate = new RTCIceCandidate(message.content);
      peerConnection
        .addIceCandidate(candidate)
        .catch(reportError('adding and ice candidate'));
      break;
    case 'disconnect':
      disconnect();
      break;
    default:
      reportError('unhandled message type')(message.type);
  }
});

function setVideoStream(videoElement, stream) {
  videoElement.srcObject = stream;
}

function unsetVideoStream(videoElement) {
  if (videoElement.srcObject) {
    videoElement.srcObject.getTracks().forEach(track => track.stop());
  }
  videoElement.removeAttribute('src');
  videoElement.removeAttribute('srcObject');
}

const reportError = where => error => {
  console.error(where, error);
};

function log() {
  console.log(...arguments);
}
