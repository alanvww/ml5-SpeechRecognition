class SpeechRecognition {
  constructor(model = 'whisper-tiny', options = {}) {
    this.options = options;
    this.modelName = this.getModelName(model);
    this.queue = [];
    this.timerId = null;
    this.isLoading = true;
    this.loadModel();
  }

  getModelName(model) {
    const modelMap = {
      'whisper-tiny': 'Xenova/whisper-tiny.en',
      'whisper-large-v2': 'Xenova/whisper-large-v2'// The model is loaded but doesn't works. Looks like it requires more parameters.
    };

    return modelMap[model] || 'Xenova/whisper-tiny.en';
  }

  async loadModel() {
    this.isLoading = true;
    if (ml5.transformers === undefined) {
      ml5.transformers = import(
        "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.0.0-alpha.20"
      );
    }
    ml5.transformers = await ml5.transformers;
    console.log(
      "Loaded transformers.js version " + ml5.transformers.env.version
    );

    ml5.transformerModels = ml5.transformerModels || {};
    if (this.modelName in ml5.transformerModels === false) {
      ml5.transformerModels[this.modelName] = ml5.transformers.pipeline(
        "automatic-speech-recognition",
        this.modelName
      );
    }
    ml5.transformerModels[this.modelName] = await ml5.transformerModels[
      this.modelName
    ];
    this.model = ml5.transformerModels[this.modelName];
    console.log("Loaded " + this.modelName);
    this.isLoading = false;
  }

  async ready() {
    await ml5.transformers;
    await ml5.transformerModels[this.modelName];
  }

  isModelLoading() {
    return this.isLoading;
  }

  async transcribe(audioData, callback) {
    await this.ready();

    const job = {
      audioData: audioData,
      callback: callback,
    };

    const promise = new Promise((resolve, reject) => {
      job.resolve = resolve;
      job.reject = reject;
    });

    this.queue.push(job);

    if (!this.timerId) {
      this.timerId = setTimeout(() => {
        this.work();
      }, 0);
    }

    return promise;
  }

  async work() {
    const job = this.queue.shift();

    try {
      const result = await this.model(job.audioData, this.options);
      
      if (typeof job.callback == 'function') {
        job.callback(result.text);
      }
      job.resolve(result.text);

    } catch (e) {
      if (typeof job.callback == 'function') {
        job.callback(null, e.message);
      }
      job.reject(e.message);
    }

    if (this.queue.length > 0) {
      this.timerId = setTimeout(() => {
        this.work();
      }, 0);
    } else {
      this.timerId = null;
    }
  }
}

if (typeof ml5 == 'undefined') {
  console.warn("If you are using ml5.js, make sure to include ml5-SpeechRecognition.js after ml5.js in your HTML file.");
  ml5 = {};
}
ml5.speechRecognition = function (model = 'whisper-tiny', options = {}) {
  return new SpeechRecognition(model, options);
};