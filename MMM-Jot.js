
Module.register("MMM-Jot", {
  defaults: {
    maxLines: 15, // max number of lines shown at once
    clearDelay: 30000  // clear the screen after transcription ends
  },

  getStyles() {
    return ["MMM-Jot.css"];
  },

  start() {
    this.transcriptLines = [];
    this.partialTranscript = "";
  },

  notificationReceived(notification, payload) {
    if(notification == "START_LISTENING") {
      this.sendSocketNotification("START_LISTENING", {
        clearDelay: this.config.clearDelay
      });
    } else if(notification == "STOP_LISTENING") {
      this.sendSocketNotification("STOP_LISTENING");
    }
  },

  socketNotificationReceived(notification, payload) {
    if (notification === "TRANSCRIPT") {
      if (payload.partial) {
        this.partialTranscript = payload.partial;
      }
      if (payload.final) {
        this.transcriptLines.push(payload.final);
        if (this.transcriptLines.length > this.config.maxLines) {
          this.transcriptLines.shift(); // remove oldest line
        }
        this.partialTranscript = ""; // clear partial once final is added
      }
      this.updateDom();
    } else if (notification === "TRANSCRIPTION_ENDED") {
      let secondsLeft = this.config.clearDelay / 1000;
      this.partialTranscript = `Transcription ended. Text will clear in ${secondsLeft} seconds.`;
      this.updateDom();
    
      // Clear any existing countdown interval
      if (this.countdownInterval) {
        clearInterval(this.countdownInterval);
      }
    
      this.countdownInterval = setInterval(() => {
        secondsLeft -= 1;
        if (secondsLeft > 0) {
          this.partialTranscript = `Transcription ended. Text will clear in ${secondsLeft} seconds.`;
          this.updateDom();
        } else {
          clearInterval(this.countdownInterval);
          this.countdownInterval = null;
        }
      }, 1000);
    }
    
    else if (notification === "CLEAR_SCREEN") {
      this.clearScreen();
    }
    
  },

  getDom() {
    const wrapper = document.createElement("div");
    wrapper.id = "jot-wrapper";
    wrapper.className = "Jot";

    this.transcriptLines.forEach((line) => {
      const div = document.createElement("div");
      div.innerText = line;
      wrapper.appendChild(div);
    });

    if (this.partialTranscript) {
      const partial = document.createElement("div");
      partial.innerHTML = `<i style="opacity: 0.6;">${this.partialTranscript}</i>`;
      wrapper.appendChild(partial);
    }

    return wrapper;
  },
  clearScreen() {
    this.transcriptLines = [];
    this.partialTranscript = "";
    const wrapper = document.getElementById("jot-wrapper");
    if (wrapper) {
      wrapper.innerHTML = "";
    }
  }
});
