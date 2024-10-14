let whisper;
let isRecording = false;
let mediaRecorder;
let audioChunks = [];
let memos = [];
let recordButton;

function setup() {
  createCanvas(windowWidth, windowHeight);
  whisper = ml5.speechRecognition('whisper-tiny');
  
  recordButton = createButton('Start Recording');
  recordButton.position(20, 20);
  recordButton.mousePressed(toggleRecording);
  recordButton.attribute('disabled', '');
  
  textAlign(CENTER, CENTER);
  textSize(16);
}

function draw() {
  if (whisper.isModelLoading()) {
    background(200, 200, 255);  // Light blue background while loading
    fill(0);
    text("Loading Whisper model...", width/2, height/2);
    recordButton.attribute('disabled', '');
  } else {
    background(240);
    memos.forEach((memo) => {
      fill(memo.color.r, memo.color.g, memo.color.b);
      text(memo.text, memo.x, memo.y);
    });
    recordButton.removeAttribute('disabled');
  }

  // Display recording status
  if (isRecording) {
    fill(255, 0, 0);
    ellipse(width - 30, 30, 20, 20);
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

async function toggleRecording() {
  if (!isRecording) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder = new MediaRecorder(stream);
      mediaRecorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };
      mediaRecorder.onstop = processAudio;
      mediaRecorder.start();
      isRecording = true;
      recordButton.html('Stop Recording');
    } catch (err) {
      console.error('Error accessing microphone:', err);
    }
  } else {
    mediaRecorder.stop();
    isRecording = false;
    recordButton.html('Start Recording');
  }
}

async function processAudio() {
  const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
  audioChunks = [];

  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const audioBuffer = await audioContext.decodeAudioData(await audioBlob.arrayBuffer());
    const audioData = audioBuffer.getChannelData(0);
    const resampledData = resampleAudio(audioData, audioBuffer.sampleRate, 16000);

    whisper.transcribe(resampledData, (text) => {
      if (text) {
        addMemoToCanvas(text);
      }
    });
  } catch (error) {
    console.error('Error processing audio:', error);
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

function addMemoToCanvas(text) {
  const x = random(width);
  const y = random(height);
  const color = {
    r: random(256),
    g: random(256),
    b: random(256),
  };
  memos.push({ text, x, y, color });
}