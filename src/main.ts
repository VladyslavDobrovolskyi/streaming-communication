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

const PORT = process.env.PORT || 9999

// Define a io

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
	console.log('New client connected:', socket.id)
	console.log('Namesapce:', io)
	console.log('sockets:', io.sockets)
	console.log('adapter:', io.sockets.adapter)
	shareRoomsInfo()

	socket.on(ACTIONS.JOIN, config => {
		console.log('Пользователь заджойнился')
		const { room: roomID } = config
		const { rooms: joinedRooms } = socket
		console.log('Команата:', roomID)
		console.log('Komnati:', joinedRooms)
		if (Array.from(joinedRooms).includes(roomID)) {
			return console.warn(`Already joined to ${roomID}`)
		}

		const clients = Array.from(io.sockets.adapter.rooms.get(roomID) || [])

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
		shareRoomsInfo()
	})

	function leaveRoom() {
		const { rooms } = socket

		Array.from(rooms)
			.filter(roomID => validate(roomID) && version(roomID) === 4)
			.forEach(roomID => {
				const clients = Array.from(io.sockets.adapter.rooms.get(roomID) || [])

				clients.forEach(clientID => {
					io.to(clientID).emit(ACTIONS.REMOVE_PEER, {
						peerID: socket.id,
					})

					socket.emit(ACTIONS.REMOVE_PEER, {
						peerID: clientID,
					})
				})

				socket.leave(roomID)
			})

		shareRoomsInfo()
	}

	socket.on(ACTIONS.LEAVE, leaveRoom)
	socket.on('disconnecting', leaveRoom)

	socket.on(ACTIONS.RELAY_SDP, ({ peerID, sessionDescription }) => {
		io.to(peerID).emit(ACTIONS.SESSION_DESCRIPTION, {
			peerID: socket.id,
			sessionDescription,
		})
	})

	socket.on(ACTIONS.RELAY_ICE, ({ peerID, iceCandidate }) => {
		io.to(peerID).emit(ACTIONS.ICE_CANDIDATE, {
			peerID: socket.id,
			iceCandidate,
		})
	})
})

server.listen(PORT, () => {
	console.log(`Server is running on port ${PORT}`)
})
