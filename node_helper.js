const NodeHelper = require("node_helper");
const recorder = require("node-record-lpcm16");
const speech = require("@google-cloud/speech");
const path = require("path");
const fs = require("fs");

const client = new speech.SpeechClient({
  keyFilename: path.join(__dirname, "key/service-account.json")
});

module.exports = NodeHelper.create({
  start() {
    this.recording = null;
    this.recognizeStream = null;
    this.currentLogFile = null;
    this.cleanOldLogs();
    console.log("[MMM-Jot] Node helper started.");
  },

  socketNotificationReceived(notification, payload) {
    if (notification === "START_LISTENING") {
      this.clearDelay = payload.clearDelay;
      this.startRecording();
    }  else if (notification === "STOP_LISTENING") {
      this.stopRecording();
    }
  },

  startRecording() {
    const request = {
      config: {
        encoding: 'LINEAR16',
        sampleRateHertz: 16000,
        languageCode: 'en-US',
      },
      interimResults: true,
    };

    // Create log file for this session
    const logDir = path.join(__dirname, 'logs');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir);
    }
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    this.currentLogFile = path.join(logDir, `conversation-${timestamp}.txt`);

    this.recognizeStream = client
      .streamingRecognize(request)
      .on('error', (err) => {
        console.error('[ERROR]', err);
        this.handleStreamEnded();
      })
      .on('data', data => {
        const transcript = data.results[0]?.alternatives[0]?.transcript || '';
        const isFinal = data.results[0]?.isFinal || false;

        if (isFinal) {
          this.appendTranscriptToFile(transcript);
        }

        const payload = {
          partial: isFinal ? null : transcript,
          final: isFinal ? transcript : null
        };

        this.sendSocketNotification("TRANSCRIPT", payload);

      })
      .on('end', () => {
        this.handleStreamEnded()
      });

    this.recording = recorder.record({
      sampleRateHertz: 16000,
      threshold: 0,
      verbose: false,
      recordProgram: 'rec',
      silence: '10.0',
    });
    
    const recordingStream = this.recording.stream().on('error', console.error);
    
    recordingStream.pipe(this.recognizeStream);
    console.log('Listening, press Ctrl+C to stop.');
  },

  handleStreamEnded() {
    console.log('[MMM-Jot] Transcription stream ended.');
    this.sendSocketNotification("TRANSCRIPTION_ENDED");
    setTimeout(() => {
      this.sendSocketNotification("CLEAR_SCREEN");
    }, this.clearDelay);
  },

  stopRecording() {
    if (this.recording) {
      this.recording.stop();
      console.log("[MMM-Jot] Recording stopped.");
    }
  },

  appendTranscriptToFile(transcript) {
    if (!this.currentLogFile) return;
    const timestamp = new Date().toLocaleTimeString();
    const line = `[${timestamp}] ${transcript}\n`;

    fs.appendFile(this.currentLogFile, line, err => {
      if (err) {
        console.error("Error appending to transcript file:", err);
      } else {
        console.log(`Transcript saved to ${this.currentLogFile}`);
      }
    });
  },

  cleanOldLogs() {
    const logDir = path.join(__dirname, 'logs');
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;

    if (fs.existsSync(logDir)) {
      fs.readdir(logDir, (err, files) => {
        if (err) return console.error("Log cleanup error:", err);

        files.forEach(file => {
          const filePath = path.join(logDir, file);
          fs.stat(filePath, (err, stats) => {
            if (!err && (now - stats.mtimeMs > dayMs)) {
              fs.unlink(filePath, err => {
                if (err) console.error("Failed to delete old log:", err);
                else console.log(`Deleted old log: ${filePath}`);
              });
            }
          });
        });
      });
    }
  }
});
