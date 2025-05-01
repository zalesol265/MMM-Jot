const NodeHelper = require("node_helper");
const recorder = require("node-record-lpcm16");
const speech = require("@google-cloud/speech");
const path = require("path");

const client = new speech.SpeechClient({
  keyFilename: path.join(__dirname, "key/service-account.json")
});

module.exports = NodeHelper.create({
  start() {
    this.recording = null;
    this.recognizeStream = null;
    console.log("[MMM-Jot] Node helper started.");
  },

  socketNotificationReceived(notification, payload) {
    if (notification === "START_LISTENING") {
      this.startRecording();
    } else if (notification === "STOP_LISTENING") {
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
      
      this.recognizeStream = client
        .streamingRecognize(request)
        .on('error', console.error)
        .on('data', data => {
          const transcript = data.results[0]?.alternatives[0]?.transcript || '';
          const isFinal = data.results[0]?.isFinal || false;

          const payload = {
            partial: isFinal ? null : transcript,
            final: isFinal ? transcript : null
          };

          this.sendSocketNotification("TRANSCRIPT", payload);

          process.stdout.write(
            transcript
              ? `Transcription: ${transcript}\n`
              : '\n\nReached transcription time limit, press Ctrl+C\n'
          );
        });

      // Start recording and send the microphone input to the Speech API.
      // Ensure SoX is installed, see https://www.npmjs.com/package/node-record-lpcm16#dependencies
      this.recording = recorder
        .record({
          sampleRateHertz: 16000,
          threshold: 0,
          // Other options, see https://www.npmjs.com/package/node-record-lpcm16#options
          verbose: false,
          recordProgram: 'rec', // Try also "arecord" or "sox"
          silence: '10.0',
        })
        .stream()
        .on('error', console.error);
      this.recording.pipe(this.recognizeStream);
      console.log('Listening, press Ctrl+C to stop.');
    }
});
