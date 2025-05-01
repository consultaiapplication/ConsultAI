import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.18.0/firebase-app.js';
import {
	getAuth,
	signInWithEmailAndPassword,
	createUserWithEmailAndPassword,
	sendEmailVerification,
	signOut,
	onAuthStateChanged,
} from 'https://www.gstatic.com/firebasejs/9.18.0/firebase-auth.js';
import {
	getFirestore,
	collection,
	addDoc,
	getDocs,
	query,
	orderBy,
	limit,
	doc,
	deleteDoc,
	where,
} from 'https://www.gstatic.com/firebasejs/9.18.0/firebase-firestore.js';

const firebaseConfig = {
	apiKey: 'AIzaSyBZW8eCdqOCldl18HToKnN9BpxNGsMk0SM',
	authDomain: 'aiconsultations.firebaseapp.com',
	projectId: 'aiconsultations',
	storageBucket: 'aiconsultations.firebasestorage.app',
	messagingSenderId: '414954058649',
	appId: '1:414954058649:web:8d4d285e44078885245908',
	measurementId: 'G-ZL3Y5D4PL6',
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const loginView = document.getElementById('login-view');
const contactsView = document.getElementById('contacts-view');
const chatView = document.getElementById('chat-view');

const aiContacts = [
	'Lawyer',
	'Doctor',
	'Therapist',
	'Fitness Coach',
	'Financial Advisor',
	'Professor',
	'Technician',
	'Analyst',
	'Influencer',
	'Investigator',
	'Programmer',
];

let currentContact = localStorage.getItem('currentContact') || '';

function switchView(viewId, pushHistory = true) {
	const isDesktop = window.innerWidth >= 768;

	// Desktop Logout Button Management
	const desktopLogoutBtn = document.getElementById('desktopLogoutBtn');

	if (viewId === 'chat-view' && isDesktop) {
		// Create button if it doesn't exist and we're switching to chat view on desktop
		if (!desktopLogoutBtn) {
			const chatHeader = document.getElementById('chatHeader');
			const newLogoutBtn = document.createElement('button');
			newLogoutBtn.id = 'desktopLogoutBtn';
			newLogoutBtn.className = 'desktop-logout-btn';
			newLogoutBtn.innerHTML = '<i class="fa-solid fa-right-from-bracket"></i>';
			newLogoutBtn.addEventListener('click', logout);
			chatHeader.insertBefore(newLogoutBtn, chatHeader.firstChild);
		}
	} else if (desktopLogoutBtn) {
		// Remove button if we're switching away from chat view or on mobile
		desktopLogoutBtn.remove();
	}

	// View Switching Logic
	if (isDesktop && (viewId === 'contacts-view' || viewId === 'chat-view')) {
		document.getElementById('contacts-view').classList.add('active');
		document
			.getElementById('chat-view')
			.classList[viewId === 'chat-view' ? 'add' : 'remove']('active');

		document
			.querySelectorAll('.view:not(#contacts-view):not(#chat-view)')
			.forEach((v) => v.classList.remove('active'));
	} else {
		document
			.querySelectorAll('.view')
			.forEach((v) => v.classList.remove('active'));
		document.getElementById(viewId).classList.add('active');
	}

	// State Management
	localStorage.setItem('lastActiveView', viewId);

	if (pushHistory) {
		const currentUser = auth.currentUser;
		if (currentUser && viewId === 'contacts-view' && 
			window.location.hash === '#login-view') {
		  history.replaceState({ view: viewId }, '', `#${viewId}`);
	}  } else {
		history.pushState({ view: viewId }, '', `#${viewId}`);
	  }
}

window.addEventListener('popstate', (event) => {
	const user = auth.currentUser;
	if (user) {
	  // Prevent navigation to login view when logged in
	  let targetView = event.state?.view;
	  if (targetView === 'login-view') {
		history.replaceState({ view: 'contacts-view' }, '', '#contacts-view');
		switchView('contacts-view', false);
	  } else {
		switchView(targetView || 'contacts-view', false);
	  }
	} else {
	  // Redirect to login view when logged out
	  if (event.state?.view && event.state.view !== 'login-view') {
		history.replaceState({ view: 'login-view' }, '', '#login-view');
		switchView('login-view', false);
	  } else {
		switchView(event.state?.view || 'login-view', false);
	  }
	}
  });

onAuthStateChanged(auth, (user) => {
	if (user) {
		if (window.location.hash === '#login-view') {
			history.replaceState({ view: 'contacts-view' }, '', '#contacts-view');
		  }
		const lastActiveView =
			localStorage.getItem('lastActiveView') || 'contacts-view';
		renderContacts();

		// Check if desktop view (width >= 768px)
		const isDesktop = window.innerWidth >= 768;

		if (isDesktop) {
			// Always show contacts view on desktop
			switchView('contacts-view', false);

			// If no chat is open or it's the initial load, open first contact (Lawyer)
			if (
				!currentContact ||
				!document.querySelector('.view.active#chat-view')
			) {
				openChat(aiContacts[0]); // Open first contact by default
			} else {
				// Otherwise restore the last open chat
				openChat(currentContact);
			}
		} else {
			// Mobile behavior - single view at a time
			switchView(lastActiveView, false);
			if (lastActiveView === 'chat-view' && currentContact) {
				openChat(currentContact);
			}
		}
	} else {
		// User logged out - reset to login view
		switchView('login-view', false);
		localStorage.removeItem('currentContact');
	}
});

document.addEventListener('DOMContentLoaded', () => {
	const lastActiveView = localStorage.getItem('lastActiveView');
	const isLoggedIn = auth.currentUser !== null;

	if (isLoggedIn && lastActiveView) {
		switchView(lastActiveView, false);
	} else {
		const initialView = location.hash
			? location.hash.substring(1)
			: 'login-view';
		switchView(initialView, false);
	}
});

function login() {
	const email = document.getElementById('emailInput').value.trim();
	const password = document.getElementById('passwordInput').value.trim();

	if (email && password) {
		signInWithEmailAndPassword(auth, email, password)
			.then((userCredential) => {
				const user = userCredential.user;

				if (user.emailVerified) {
					history.replaceState({ view: 'contacts-view' }, '', '#contacts-view');
					renderContacts();

					// Check if desktop view
					const isDesktop = window.innerWidth >= 768;

					if (isDesktop) {
						// Desktop: Show both contacts and first chat immediately
						switchView('contacts-view');
						openChat(aiContacts[0]); // Auto-open first contact
					} else {
						// Mobile: Show only contacts view
						switchView('contacts-view');
					}
				} else {
					// Handle email not verified case
					document.getElementById('notice').textContent =
						'Please verify your email address before logging in.';
					signOut(auth);
					document.getElementById('emailInput').value = '';
					document.getElementById('passwordInput').value = '';
				}
			})
			.catch((error) => {
				// Handle login error
				document.getElementById('notice').textContent =
					'Incorrect Login Details';
				document.getElementById('notice').style.color = 'red';
				document.getElementById('emailInput').value = '';
				document.getElementById('passwordInput').value = '';
			});
	} else {
		// Handle empty fields
		document.getElementById('notice').textContent =
			'Please enter email and password.';
		document.getElementById('notice').style.color = 'red';
	}
}

document.getElementById('loginBtn').addEventListener('click', login);

function signUp() {
	const email = document.getElementById('signUpEmail').value.trim();
	const password = document.getElementById('signUpPassword').value.trim();

	if (email && password) {
		createUserWithEmailAndPassword(auth, email, password)
			.then((userCredential) => {
				const user = userCredential.user;
				sendEmailVerification(user)
					.then(() => {
						document.getElementById('notice').textContent =
							'Please verify your email address before logging in.';
					})
					.catch((error) => {
						document.getElementById('notice').textContent =
							'There was an error sending the verification email.';
					});
				renderContacts();
				switchView('login-view');
			})
			.catch((error) => {
				document.querySelector('#notice').textContent = error.message;
			});
	} else {
		document.querySelector('#notice').textContent =
			'Please enter an email and password.';
	}
}

document.getElementById('signUpBtn').addEventListener('click', signUp);

document.getElementById('showSignUp').addEventListener('click', (e) => {
	e.preventDefault();
	switchView('signUp-view');
});

document.getElementById('showLogin').addEventListener('click', (e) => {
	e.preventDefault();
	switchView('login-view');
});

function logout() {
	signOut(auth)
		.then(() => {
			const desktopLogoutBtn = document.getElementById('desktopLogoutBtn');
			if (desktopLogoutBtn) desktopLogoutBtn.remove();
			switchView('login-view');
		})
		.catch((error) => {
			console.error('Error signing out:', error);
		});
}

document.getElementById('logOutBtn').addEventListener('click', logout);

function renderContacts() {
	const list = document.getElementById('contactList');
	list.innerHTML = '';
	aiContacts.forEach((name) => {
		const li = document.createElement('li');
		li.textContent = name;
		li.onclick = () => openChat(name);
		list.appendChild(li);
	});
}

async function openChat(name) {
	currentContact = name;
	document.getElementById('chatTitle').innerHTML = `${name}&nbsp;`;
	const box = document.getElementById('chatBox');
	box.innerHTML = ''; // Clear existing messages

	// Add preview message for empty chat
	const previewMessage = document.createElement('div');
	previewMessage.className = 'preview-message';
	previewMessage.innerHTML = `
	  <div class="preview-content">
		<i class="fa-solid fa-user-tie"></i>
		<p>Consult a ${currentContact}</p>
	  </div>
	`;
	box.appendChild(previewMessage);

	// Fetch messages from Firestore
	const q = query(
		collection(db, 'chats'),
		where('contact', '==', name),
		orderBy('timestamp'),
		limit(5)
	);

	try {
		const querySnapshot = await getDocs(q);
		if (querySnapshot.size > 0) {
			// If messages exist, remove preview
			box.removeChild(previewMessage);
		}

		let contextMessages = [];
		querySnapshot.forEach((doc) => {
			const msg = doc.data();
			addMessage(msg.sender, msg.text);
			contextMessages.push({
				role: msg.sender === 'You' ? 'user' : 'assistant',
				content: msg.text,
			});
		});
		window.contextMessages = contextMessages;
	} catch (e) {
		console.error('Error fetching messages: ', e);
	}

	switchView('chat-view');
}

async function sendMessage() {
	const input = document.getElementById('userInput');
	const userMessage = input.value.trim();

	if (!userMessage || !currentContact) return;

	addMessage('You', userMessage);
	saveMessage(currentContact, 'You', userMessage);
	input.value = '';

	try {
		const aiReply = await generateReply(
			userMessage,
			window.contextMessages || []
		);
		addMessage(currentContact, aiReply);
		saveMessage(currentContact, currentContact, aiReply);
	} catch (error) {
		addMessage(currentContact, 'Error: Unable to fetch AI response.');
	}
}

document.getElementById('sendBtn').addEventListener('click', sendMessage);

async function saveMessage(contact, sender, text) {
	const messagesRef = collection(db, 'chats');
	try {
		await addDoc(messagesRef, {
			contact: contact,
			sender: sender,
			text: text,
			timestamp: new Date(),
		});
	} catch (e) {
		console.error('Error adding document: ', e);
	}
}

function addMessage(sender, text) {
	const box = document.getElementById('chatBox');

	// Remove preview message if it exists
	const preview = box.querySelector('.preview-message');
	if (preview) {
		box.removeChild(preview);
	}

	const msg = document.createElement('p');
	msg.textContent = text;
	msg.classList.add(sender === 'You' ? 'user-message' : 'ai-message');
	box.appendChild(msg);
	box.scrollTop = box.scrollHeight;
}

async function generateReply(userMessage, contextMessages) {
	const endpoint = 'https://api.groq.com/openai/v1/chat/completions';
	const apiKey = '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';

	const headers = {
		'Content-Type': 'application/json',
		Authorization: `Bearer ${apiKey}`,
	};

	const body = {
		model: 'llama-3.3-70b-versatile',
		messages: [
			...contextMessages,
			{ role: 'user', content: userMessage },
			{
				role: 'system',
				content: `You are a ${currentContact}, an AI consultant who remembers recent messages and responds in a professional, chat-like tone. Keep replies under 100 words unless asked to elaborate. When asked a question outside the ${currentContact} topic suggest consulting the appropriate consultant then deviate by offering ${currentContact} advice. Words, like Hi, Hello or anything with a greeting fashion should reset the conversation and avoid referring to previous context unless prompted`,
			},
		],
	};
	try {
		const response = await fetch(endpoint, {
			method: 'POST',
			headers,
			body: JSON.stringify(body),
		});

		const data = await response.json();
		return (
			data.choices?.[0]?.message?.content?.trim() ||
			"Sorry, I didn't receive a clear response."
		);
	} catch (error) {
		console.error('API error:', error);
		return "Sorry, I'm having trouble responding right now.";
	}
}

async function clearChat() {
	if (!currentContact) return;
	const confirmClear = confirm(`Clear all messages with ${currentContact}?`);
	if (!confirmClear) return;

	try {
		const q = query(
			collection(db, 'chats'),
			where('contact', '==', currentContact)
		);

		const querySnapshot = await getDocs(q);
		await Promise.all(querySnapshot.docs.map((doc) => deleteDoc(doc.ref)));

		const box = document.getElementById('chatBox');
		box.innerHTML = ''; // Clear the chat box

		// Show preview message again after clearing
		const previewMessage = document.createElement('div');
		previewMessage.className = 'preview-message';
		previewMessage.innerHTML = `
		<div class="preview-content">
		  <i class="fa-solid fa-user-tie"></i>
		  <p>Consult a ${currentContact}</p>
		</div>
	  `;
		box.appendChild(previewMessage);
	} catch (error) {
		console.error('Error clearing chat messages:', error);
	}
}

document.getElementById('clearBtn').addEventListener('click', clearChat);

if (auth.currentUser && window.innerWidth >= 768) {
	// If already logged in and on desktop, open both views
	renderContacts();
	switchView('contacts-view', false);
	openChat(aiContacts[0]); // Open first contact by default
}

const style = document.createElement('style');
style.textContent = `
  #desktopLogoutBtn {
    background: white;
    color: var(--primary-color);
    width: 50px;
    height: 50px;
    border-radius: 50%;
    border: none;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    margin-right: 15px;
    transition: var(--transition);
	margin-top: 14px;
  }

   .preview-message {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 70vh;
    color: var(--gray-color);
  }
  .preview-content {
    text-align: center;
  }
  .preview-message i {
    font-size: 5rem;
    color: var(--primary-color);
    margin-bottom: 1rem;
  }
  .preview-message p {
    font-size: 2rem;
	font-weight: bold;
	color: var(--primary-color);
    margin: 0;
  }
`;
document.head.appendChild(style);

document.getElementById('goBack').addEventListener('click', () => {
	// Mobile-only behavior: go back to contacts view
	const isDesktop = window.innerWidth >= 768;
	if (!isDesktop) {
		switchView('contacts-view');
	}
});

if ('serviceWorker' in navigator) {
	window.addEventListener('load', () => {
		navigator.serviceWorker
			.register('/service-worker.js')
			.then((reg) => console.log('Service Worker registered:', reg))
			.catch((err) => console.error('Service Worker error:', err));
	});
}

let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
	e.preventDefault();
	deferredPrompt = e;
	// Show your own install button
	document.getElementById('installBtn').style.display = 'block';

	document.getElementById('installBtn').addEventListener('click', () => {
		deferredPrompt.prompt();
		deferredPrompt.userChoice.then((choiceResult) => {
			if (choiceResult.outcome === 'accepted') {
				console.log('User accepted install prompt');
			}
			deferredPrompt = null;
		});
	});
});
