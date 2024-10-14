import {
	pipeline,
	env,
} from 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2';

let isRecording = false;
let mediaRecorder;
let audioChunks = [];
let transcriber;
let currentPlayingButton = null;

const status = document.getElementById('status');
const recordButton = document.getElementById('recordButton');
const memoList = document.getElementById('memoList');
const audioPlayer = document.getElementById('audioPlayer');

// Initialize the transcriber
async function initializeTranscriber() {
	try {
		transcriber = await pipeline(
			'automatic-speech-recognition',
			'Xenova/whisper-tiny.en'
		);
		status.textContent = 'Model loaded. Ready to record.';
		recordButton.disabled = false;
	} catch (error) {
		console.error('Error initializing transcriber:', error);
		status.textContent = 'Error loading model. Please refresh the page.';
	}
}

initializeTranscriber();

recordButton.addEventListener('click', toggleRecording);

async function toggleRecording() {
	if (!isRecording) {
		try {
			const stream = await navigator.mediaDevices.getUserMedia({
				audio: true,
			});
			mediaRecorder = new MediaRecorder(stream);
			mediaRecorder.ondataavailable = (event) => {
				audioChunks.push(event.data);
			};
			mediaRecorder.onstop = processAudio;
			mediaRecorder.start();
			isRecording = true;
			recordButton.textContent = 'Stop Recording';
			recordButton.style.backgroundColor = '#f44336';
			status.textContent = 'Recording...';
		} catch (err) {
			console.error('Error accessing microphone:', err);
			status.textContent =
				'Unable to access the microphone. Please check your browser settings.';
		}
	} else {
		mediaRecorder.stop();
		isRecording = false;
		recordButton.textContent = 'Start Recording';
		recordButton.style.backgroundColor = '#4CAF50';
		status.textContent = 'Processing audio...';
	}
}

async function processAudio() {
	const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
	audioChunks = [];

	try {
		const audioContext = new (window.AudioContext ||
			window.webkitAudioContext)();
		const audioBuffer = await audioContext.decodeAudioData(
			await audioBlob.arrayBuffer()
		);

		// Convert AudioBuffer to Float32Array
		const audioData = audioBuffer.getChannelData(0);

		// Resample to 16000 Hz (Whisper's expected sample rate)
		const resampledData = resampleAudio(
			audioData,
			audioBuffer.sampleRate,
			16000
		);

		const result = await transcriber(resampledData);
		displayMemo(result.text, audioBlob);
		window.addMemoToCanvas(result.text); // Add text to canvas
		status.textContent = 'Ready to record.';
	} catch (error) {
		console.error('Error processing audio:', error);
		status.textContent =
			'An error occurred while processing the audio. Please try again.';
	}
}

function resampleAudio(audioData, oldSampleRate, newSampleRate) {
	const ratio = oldSampleRate / newSampleRate;
	const newLength = Math.round(audioData.length / ratio);
	const result = new Float32Array(newLength);

	for (let i = 0; i < newLength; i++) {
		const oldIndex = Math.floor(i * ratio);
		result[i] = audioData[oldIndex];
	}

	return result;
}

function displayMemo(text, audioBlob) {
	const memoItem = document.createElement('div');
	memoItem.classList.add('memo-item');

	const textSpan = document.createElement('span');
	textSpan.textContent = text;
	memoItem.appendChild(textSpan);

	const playButton = document.createElement('button');
	playButton.classList.add('play-button');
	playButton.textContent = '▶️';
	playButton.addEventListener('click', () =>
		togglePlayback(playButton, audioBlob)
	);
	memoItem.appendChild(playButton);

	memoList.insertBefore(memoItem, memoList.firstChild);
}

function togglePlayback(button, audioBlob) {
	if (currentPlayingButton && currentPlayingButton !== button) {
		currentPlayingButton.textContent = '▶️';
	}

	if (button.textContent === '▶️') {
		audioPlayer.src = URL.createObjectURL(audioBlob);
		audioPlayer.play();
		button.textContent = '⏸️';
		currentPlayingButton = button;
	} else {
		if (audioPlayer.paused) {
			audioPlayer.play();
			button.textContent = '⏸️';
		} else {
			audioPlayer.pause();
			button.textContent = '▶️';
		}
	}

	audioPlayer.onended = () => {
		button.textContent = '▶️';
		currentPlayingButton = null;
	};
}

audioPlayer.addEventListener('play', () => {
	if (currentPlayingButton) {
		currentPlayingButton.textContent = '⏸️';
	}
});

audioPlayer.addEventListener('pause', () => {
	if (currentPlayingButton) {
		currentPlayingButton.textContent = '▶️';
	}
});