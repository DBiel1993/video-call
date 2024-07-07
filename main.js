const startButton = document.getElementById('startButton');
const hangupButton = document.getElementById('hangupButton');
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');

let localStream;
let peerConnection;
let socket;

const servers = {
    iceServers: [
        {
            urls: "stun:stun.stunprotocol.org"
        }
    ]
};

startButton.addEventListener('click', startCall);
hangupButton.addEventListener('click', hangUp);

async function startCall() {
    startButton.disabled = true;
    hangupButton.disabled = false;

    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    localVideo.srcObject = localStream;

    peerConnection = new RTCPeerConnection(servers);
    peerConnection.onicecandidate = handleICECandidateEvent;
    peerConnection.ontrack = handleTrackEvent;
    localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);

    socket = new WebSocket('ws://localhost:8080');
    socket.onopen = () => {
        sendToServer({ type: 'offer', sdp: peerConnection.localDescription });
    };
    socket.onmessage = async (event) => {
        const data = JSON.parse(event.data);
        switch (data.type) {
            case 'offer':
                await handleOffer(data.sdp);
                break;
            case 'answer':
                await handleAnswer(data.sdp);
                break;
            case 'ice-candidate':
                await handleICECandidate(data.candidate);
                break;
            default:
                break;
        }
    };
}

function handleICECandidateEvent(event) {
    if (event.candidate) {
        sendToServer({ type: 'ice-candidate', candidate: event.candidate });
    }
}

function handleTrackEvent(event) {
    remoteVideo.srcObject = event.streams[0];
}

async function handleOffer(offer) {
    if (!peerConnection) {
        startCall();
    }

    await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    sendToServer({ type: 'answer', sdp: peerConnection.localDescription });
}

async function handleAnswer(answer) {
    await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
}

async function handleICECandidate(candidate) {
    try {
        await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (e) {
        console.error('Error adding received ice candidate', e);
    }
}

function sendToServer(message) {
    socket.send(JSON.stringify(message));
}

function hangUp() {
    peerConnection.close();
    peerConnection = null;

    localStream.getTracks().forEach(track => track.stop());

    startButton.disabled = false;
    hangupButton.disabled = true;

    if (socket) {
        socket.close();
    }
}