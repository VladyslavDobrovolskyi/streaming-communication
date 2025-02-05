const ACTIONS = {
	JOIN: 'join',
	LEAVE: 'leave',
	SHARE_ROOMS: 'share-rooms',
	ADD_PEER: 'add-peer',
	REMOVE_PEER: 'remove-peer',
	RELAY_SDP: 'relay-sdp',
	RELAY_ICE: 'relay-ice',
	ICE_CANDIDATE: 'ice-candidate',
	SESSION_DESCRIPTION: 'session-description',
	VIDEO_PLAY: 'video-play',
	VIDEO_PAUSE: 'video-pause',
	VIDEO_SEEK: 'video-seek',
	REQUEST_SYNC: 'request-sync',
	SYNC_STATE: 'sync-state',
	SYNC_CAMERA: 'sync-camera',
	SYNC_MICROPHONE: 'sync-microphone',
	SEND_CHAT_MESSAGE: 'send-chat-message',
	RECEIVE_CHAT_MESSAGE: 'receive-chat-message',
}

export default ACTIONS
