// Chat Room Constants
const INTERESTS = [
    "Technology", "Business", "Marketing", "Design",
    "Finance", "Healthcare", "Education", "Engineering",
    "Research", "Sales", "HR", "Legal",
    "Consulting", "Real Estate", "Media", "Arts"
];

// DOM Elements
const roomsList = document.getElementById('roomsList');
const chatMessages = document.getElementById('chatMessages');
const messageForm = document.getElementById('messageForm');
const messageInput = document.getElementById('messageInput');
const currentRoomTitle = document.getElementById('currentRoom');
const participantCount = document.getElementById('participantCount');
const participantsList = document.getElementById('participantsList');
const roomInterests = document.getElementById('roomInterests');
const createRoomBtn = document.getElementById('createRoomBtn');
const createRoomModal = document.getElementById('createRoomModal');
const createRoomForm = document.getElementById('createRoomForm');
const cancelCreateRoom = document.getElementById('cancelCreateRoom');

// State
let currentRoom = null;
let socket = null;
let rooms = [];
let username = null;

// Initialize chat functionality
function initializeChat() {
    username = localStorage.getItem('username') || prompt('Enter your name to join chat:');
    if (!username) {
        window.location.href = 'index.html';
        return;
    }
    localStorage.setItem('username', username);

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    socket = new WebSocket(wsUrl);

    socket.onopen = () => {
        console.log('Connected to chat server');
        socket.send(JSON.stringify({ type: 'getRooms' }));
    };

    socket.onmessage = handleWebSocketMessage;
    socket.onerror = (error) => console.error('WebSocket Error:', error);
    socket.onclose = () => setTimeout(initializeChat, 5000);

    setupRoomCreation();
}

// Handle WebSocket messages
function handleWebSocketMessage(event) {
    const data = JSON.parse(event.data);
    switch (data.type) {
        case 'rooms':
            updateRoomsList(data.rooms);
            break;
        case 'message':
            displayMessage(data.message);
            break;
        case 'roomJoined':
            handleRoomJoined(data.room);
            break;
        case 'participantsUpdate':
            updateParticipants(data.participants);
            break;
        default:
            console.warn('Unknown message type:', data.type);
    }
}

// Update rooms list in sidebar
function updateRoomsList(newRooms) {
    rooms = newRooms;
    roomsList.innerHTML = '';
    rooms.forEach(room => {
        const roomElement = document.createElement('div');
        roomElement.className = `room-item ${currentRoom?.id === room.id ? 'active' : ''}`;
        roomElement.innerHTML = `<h3>${room.name}</h3><p>${room.participants.length} participants</p>`;
        roomElement.onclick = () => joinRoom(room.id);
        roomsList.appendChild(roomElement);
    });
}

// Join a chat room
function joinRoom(roomId) {
    if (!socket || socket.readyState !== WebSocket.OPEN) return;
    socket.send(JSON.stringify({ type: 'joinRoom', roomId, username }));
}

// Handle successful room join
function handleRoomJoined(room) {
    currentRoom = room;
    currentRoomTitle.textContent = room.name;
    messageInput.disabled = false;
    chatMessages.innerHTML = '';
    updateRoomDetails(room);
}

// Update room details sidebar
function updateRoomDetails(room) {
    participantCount.textContent = `${room.participants.length} participants`;
    participantsList.innerHTML = '';
    room.participants.forEach(participant => {
        const li = document.createElement('li');
        li.className = 'participant-item';
        li.innerHTML = `<div class="participant-avatar">${participant.username[0]}</div><span>${participant.username}</span>`;
        participantsList.appendChild(li);
    });
    roomInterests.innerHTML = '';
    room.interests.forEach(interest => {
        const span = document.createElement('span');
        span.className = 'interest-tag';
        span.textContent = interest;
        roomInterests.appendChild(span);
    });
}

// Update participants list when receiving participants update from server
function updateParticipants(participants) {
    if (!currentRoom) return;
    currentRoom.participants = participants;
    participantCount.textContent = `${participants.length} participants`;
    participantsList.innerHTML = '';
    participants.forEach(participant => {
        const li = document.createElement('li');
        li.className = 'participant-item';
        li.innerHTML = `<div class="participant-avatar">${participant.username[0]}</div><span>${participant.username}</span>`;
        participantsList.appendChild(li);
    });
}

// Display a chat message
function displayMessage(message) {
    const messageElement = document.createElement('div');
    messageElement.className = `message ${message.username === username ? 'sent' : 'received'}`;
    messageElement.innerHTML = `<div class="message-header"><strong>${message.username}</strong><span>${new Date(message.timestamp).toLocaleTimeString()}</span></div><div class="message-content">${message.content}</div>`;
    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Setup room creation functionality
function setupRoomCreation() {
    // Populate interests selection
    const interestsSelect = document.getElementById('roomInterestsSelect');
    INTERESTS.forEach(interest => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'interest-button';
        button.textContent = interest;
        button.onclick = () => button.classList.toggle('selected');
        interestsSelect.appendChild(button);
    });

    // Show modal
    createRoomBtn.onclick = () => {
        createRoomModal.classList.add('show');
    };

    // Hide modal
    cancelCreateRoom.onclick = () => {
        createRoomModal.classList.remove('show');
    };

    // Handle room creation
    createRoomForm.onsubmit = (e) => {
        e.preventDefault();
        
        const roomName = document.getElementById('roomName').value;
        const selectedInterests = Array.from(
            document.querySelectorAll('#roomInterestsSelect .interest-button.selected')
        ).map(button => button.textContent);

        if (roomName && selectedInterests.length > 0) {
            socket.send(JSON.stringify({
                type: 'createRoom',
                room: {
                    name: roomName,
                    interests: selectedInterests
                }
            }));
            
            createRoomModal.classList.remove('show');
            createRoomForm.reset();
            document.querySelectorAll('#roomInterestsSelect .interest-button').forEach(
                button => button.classList.remove('selected')
            );
        }
    };
}

// Handle sending messages
messageForm.onsubmit = (e) => {
    e.preventDefault();
    if (!socket || socket.readyState !== WebSocket.OPEN) return;
    const message = messageInput.value.trim();
    if (message && currentRoom) {
        socket.send(JSON.stringify({ type: 'message', roomId: currentRoom.id, content: message, username }));
        messageInput.value = '';
    }
};

// Initialize chat when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeChat);
