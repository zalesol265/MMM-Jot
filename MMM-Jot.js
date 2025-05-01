
Module.register("MMM-Jot", {
  defaults: {
    maxLines: 15, // max number of lines shown at once
    clearDelay: 30000  // clear the screen after transcription ends
  },

  start() {
    this.transcriptLines = [];
    this.partialTranscript = "";
    this.sendSocketNotification("START_LISTENING", {
      clearDelay: this.config.clearDelay
    });
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
      this.partialTranscript = "Transcription ended. Text will clear in 30 seconds.";
      this.updateDom();
    } else if (notification === "CLEAR_SCREEN") {
      this.clearScreen();
    }
    
  },

  getDom() {
    const wrapper = document.createElement("div");
    wrapper.id = "jot-wrapper";
    wrapper.className = "Jot";
    wrapper.style.maxHeight = "300px";
    wrapper.style.overflowY = "hidden";
    wrapper.style.display = "flex";
    wrapper.style.flexDirection = "column";
    wrapper.style.justifyContent = "flex-end";
    wrapper.style.padding = "10px";
    wrapper.style.fontSize = "1.2em";
    wrapper.style.lineHeight = "1.4em";
    wrapper.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
    wrapper.style.borderRadius = "10px";
    wrapper.style.color = "white";

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
