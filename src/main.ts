/* eslint-disable @typescript-eslint/ban-ts-comment */
//@ts-nocheck

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

app.use((req, res, next) => {
	res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
	res.setHeader('Pragma', 'no-cache')
	res.setHeader('Expires', '0')
	next()
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
	console.log(`New client connected: ${socket.id}`)
	shareRoomsInfo()

	socket.on(ACTIONS.JOIN, config => {
		const { room: roomID } = config
		const { rooms: joinedRooms } = socket
		console.log(`Client ${socket.id} is attempting to join room: ${roomID}`)
		if (Array.from(joinedRooms).includes(roomID)) {
			console.warn(`Client ${socket.id} already joined to room: ${roomID}`)
			return
		}

		const clients = Array.from(io.sockets.adapter.rooms.get(roomID) || [])
		console.log(`Room ${roomID} has ${clients.length} clients`)

		clients.forEach(clientID => {
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
		console.log(`Client ${socket.id} joined room: ${roomID}`)
		shareRoomsInfo()
	})

	function leaveRoom() {
		const { rooms } = socket
		console.log(`Client ${socket.id} is leaving rooms: ${Array.from(rooms).join(', ')}`)

		Array.from(rooms)
			.filter(roomID => validate(roomID) && version(roomID) === 4)
			.forEach(roomID => {
				const clients = Array.from(io.sockets.adapter.rooms.get(roomID) || [])
				console.log(`Room ${roomID} has ${clients.length} clients before client ${socket.id} leaves`)

				clients.forEach(clientID => {
					io.to(clientID).emit(ACTIONS.REMOVE_PEER, {
						peerID: socket.id,
					})
					socket.emit(ACTIONS.REMOVE_PEER, {
						peerID: clientID,
					})
				})

				socket.leave(roomID)
				console.log(`Client ${socket.id} left room: ${roomID}`)
			})

		shareRoomsInfo()
	}

	socket.on(ACTIONS.LEAVE, leaveRoom)
	socket.on('disconnecting', leaveRoom)

	socket.on(ACTIONS.RELAY_SDP, ({ peerID, sessionDescription }) => {
		console.log(`Client ${socket.id} is relaying SDP to peer ${peerID}`)
		io.to(peerID).emit(ACTIONS.SESSION_DESCRIPTION, {
			peerID: socket.id,
			sessionDescription,
		})
	})

	socket.on(ACTIONS.RELAY_ICE, ({ peerID, iceCandidate }) => {
		console.log(`Client ${socket.id} is relaying ICE candidate to peer ${peerID}`)
		io.to(peerID).emit(ACTIONS.ICE_CANDIDATE, {
			peerID: socket.id,
			iceCandidate,
		})
	})
})

server.listen(PORT, () => {
	console.log(`Server is running on port ${PORT}`)
})
