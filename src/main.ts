import ACTIONS from './actions'
import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import { validate, version } from 'uuid'

const app = express()
const server = createServer(app)
const io = new Server(server, {
	transports: ['websocket'],
})

const PORT = process.env.PORT || 9999

function getClientRooms() {
	const { rooms } = io.sockets.adapter
	return Array.from(rooms.keys()).filter(roomID => validate(roomID) && version(roomID) === 4)
}

function shareRoomsInfo() {
	io.emit(ACTIONS.SHARE_ROOMS, {
		rooms: getClientRooms(),
	})
}

io.on('connection', socket => {
	console.log(`[INFO] New client connected: ${socket.id}`)
	shareRoomsInfo()

	socket.on(ACTIONS.JOIN, config => {
		const { room: roomID } = config
		const { rooms: joinedRooms } = socket
		console.log(`[INFO] Client ${socket.id} attempting to join room: ${roomID}`)

		if (Array.from(joinedRooms).includes(roomID)) {
			console.warn(`[WARN] Client ${socket.id} already joined room: ${roomID}`)
			return
		}

		const clients = Array.from(io.sockets.adapter.rooms.get(roomID) || [])
		console.log(`[INFO] Room ${roomID} has ${clients.length} clients before client ${socket.id} joins`)

		clients.forEach(clientID => {
			console.log(`[DEBUG] Notifying client ${clientID} about new peer: ${socket.id}`)
			io.to(clientID).emit(ACTIONS.ADD_PEER, {
				peerID: socket.id,
				createOffer: false,
			})
			socket.emit(ACTIONS.ADD_PEER, {
				peerID: clientID,
				createOffer: true,
			})
		})

		socket.join(roomID)
		console.log(`[INFO] Client ${socket.id} joined room: ${roomID}`)
		shareRoomsInfo()
	})

	function leaveRoom() {
		const { rooms } = socket
		console.log(`[INFO] Client ${socket.id} is leaving rooms: ${Array.from(rooms).join(', ')}`)

		Array.from(rooms)
			.filter(roomID => validate(roomID) && version(roomID) === 4)
			.forEach(roomID => {
				const clients = Array.from(io.sockets.adapter.rooms.get(roomID) || [])
				console.log(`[INFO] Room ${roomID} had ${clients.length} clients before client ${socket.id} left`)

				clients.forEach(clientID => {
					console.log(`[DEBUG] Removing client ${socket.id} from peer list of ${clientID}`)
					io.to(clientID).emit(ACTIONS.REMOVE_PEER, {
						peerID: socket.id,
					})
					socket.emit(ACTIONS.REMOVE_PEER, {
						peerID: clientID,
					})
				})

				socket.leave(roomID)
				console.log(`[INFO] Client ${socket.id} left room: ${roomID}`)
			})

		shareRoomsInfo()
	}

	socket.on(ACTIONS.LEAVE, leaveRoom)
	socket.on('disconnecting', leaveRoom)

	socket.on(ACTIONS.RELAY_SDP, ({ peerID, sessionDescription }) => {
		console.log(
			`[INFO] Client ${socket.id} is relaying SDP to peer ${peerID}. SDP Type: ${sessionDescription.type}`
		)
		io.to(peerID).emit(ACTIONS.SESSION_DESCRIPTION, {
			peerID: socket.id,
			sessionDescription,
		})
	})

	socket.on(ACTIONS.RELAY_ICE, ({ peerID, iceCandidate }) => {
		console.log(`[INFO] Client ${socket.id} is relaying ICE candidate to peer ${peerID}`)
		if (iceCandidate) {
			console.debug(`[DEBUG] ICE Candidate details: ${JSON.stringify(iceCandidate, null, 2)}`)
		}
		io.to(peerID).emit(ACTIONS.ICE_CANDIDATE, {
			peerID: socket.id,
			iceCandidate,
		})
	})

	socket.on(ACTIONS.REQUEST_SYNC, ({ roomID }) => {
		console.log(`[INFO] Client ${socket.id} requested sync for room: ${roomID}`)
		socket.to(roomID).emit(ACTIONS.REQUEST_SYNC)
	})

	socket.on(ACTIONS.SYNC_CAMERA, ({ roomID, socketId, isCameraDisabled }) => {
		console.log(
			`[INFO] Client ${socketId}  ${isCameraDisabled ? 'disable' : 'enable '} the camera in the room: ${roomID}`
		)
		socket.to(roomID).emit(ACTIONS.SYNC_CAMERA, { socketId, isCameraDisabled })
	})
	socket.on(ACTIONS.SYNC_STATE, ({ roomID, time, isPlaying }) => {
		console.log(
			`[INFO] Client ${socket.id} syncing state for room: ${roomID}. Time: ${time}, isPlaying: ${isPlaying}`
		)
		socket.to(roomID).emit(ACTIONS.SYNC_STATE, { time, isPlaying })
	})

	socket.on(ACTIONS.VIDEO_PLAY, ({ roomID, time }) => {
		console.log(`[INFO] Client ${socket.id} is playing video in room: ${roomID} at time: ${time}`)
		socket.to(roomID).emit(ACTIONS.VIDEO_PLAY, { time })
	})

	socket.on(ACTIONS.VIDEO_PAUSE, ({ roomID, time }) => {
		console.log(`[INFO] Client ${socket.id} is pausing video in room: ${roomID} at time: ${time}`)
		socket.to(roomID).emit(ACTIONS.VIDEO_PAUSE, { time })
	})

	socket.on(ACTIONS.VIDEO_SEEK, ({ roomID, time, direction }) => {
		console.log(
			`[INFO] Client ${socket.id} is seeking video in room: ${roomID} to time: ${time} (Direction: ${direction})`
		)
		socket.to(roomID).emit(ACTIONS.VIDEO_SEEK, { time, direction })
	})
})

server.listen(PORT, () => {
	console.log(`[INFO] Server is running on port ${PORT}`)
})
