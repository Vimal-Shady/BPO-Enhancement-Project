let mediaRecorder
let audioChunks = []

function startRecording() {
  navigator.mediaDevices
    .getUserMedia({ audio: true })
    .then((stream) => {
      mediaRecorder = new MediaRecorder(stream)
      mediaRecorder.start()

      mediaRecorder.ondataavailable = (event) => {
        audioChunks.push(event.data)
      }

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunks)
        const formData = new FormData()
        formData.append("file", audioBlob, "recording.wav")

        fetch("/upload", {
          method: "POST",
          body: formData,
        })
          .then((response) => response.json())
          .then((data) => {
            console.log(data)
            alert(`Transcription: ${data.transcription}\nSentiment: ${data.sentiment.label} (${data.sentiment.score})`)
          })
          .catch((error) => console.error("Error:", error))
      }
    })
    .catch((error) => {
      console.error("Error accessing microphone:", error)
      alert("Could not access the microphone. Please check your permissions and ensure your device is connected.")
    })
}

function stopRecording() {
  mediaRecorder.stop()
  audioChunks = []
}

// Add event listeners to buttons in your HTML
document.getElementById("startButton").addEventListener("click", startRecording)
document.getElementById("stopButton").addEventListener("click", stopRecording)
;``

