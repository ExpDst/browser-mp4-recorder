import { createFFmpeg } from '@ffmpeg/ffmpeg';

let ffmpeg = null;
let ffmpegLoading = false;

// Before the recorder object can be used.
// This init function should be called.
// It loads ffmpeg.
export const init = async (folderPath, onCompletion = () => {}) => {
    if (ffmpegLoading) {
        return;
    }
    ffmpegLoading = true;

    try {
        if (!ffmpeg) {
           let _ffmpeg = createFFmpeg({
                log: true,
                // on the root of the project 'ffmpeg-core.js' should be present.
                corePath: `${folderPath}/ffmpeg-core.js`,
            });
            await _ffmpeg.load();
            ffmpeg = _ffmpeg;
        }
    }
    catch(err){
        ffmpegLoading = false;
    }
    ffmpegLoading = false;

    onCompletion && onCompletion();
}

export const Recorder = {
    state: {
        recording: false,
        filePart: 0,
        screenStream: null,
        recorder: null,
        chunks: [],

        // Lock for download function.
        downloadLock: false,
    },
    startRecording: async function (onCompilationComplete) {
        if(!ffmpeg){
            return false;
        }

        if (this.state.recorder) {
            await this.stopRecording();
        }
        const screenStream = await navigator.mediaDevices.getDisplayMedia(
            {
                video:
                {
                    height: { ideal: 1080 },
                    mediaStreamSource: { exact: ["desktop"] },
                    frameRate: { ideal: 30 }
                }
            }
        );
        const micStream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
        const audioTrack = micStream.getAudioTracks()[0];
        const videoTrack = screenStream.getVideoTracks()[0];
        const streamToUse = new MediaStream([audioTrack, videoTrack]);
        this.state.recording = true;
        this.state.filePart = 0;
        var options = { mimeType: 'video/webm;codecs=h264' };
        const recorder = new MediaRecorder(streamToUse, options);
        recorder.ondataavailable = (event) => {
            try {
                if (event.data.size > 0) {
                    this.state.chunks.push(event.data);
                }
                if (this.state.recording === false) {
                    this.state.recorder = null;
                    // Close screen capture stream.
                    screenStream && screenStream.getTracks().forEach(t => t.stop());
                    micStream && micStream.getTracks().forEach(t => t.stop());
                }
                this.download(onCompilationComplete);
            } catch (err) {
                onCompilationComplete && onCompilationComplete();
            }
        };
        recorder.start();
        this.state.recorder = recorder;
        return true;
    },
    stopRecording: async function () {
        if(!ffmpeg){
            return false;
        }

        if (!this.state.recorder) {
            return false;
        };
        this.state.recording = false;
        this.state.recorder.stop();
        return true;
    },
    download: async function download(onCompilationComplete) {
        if (this.state.chunks.length === 0) return;
        if (this.state.downloadLock === true) return;

        this.state.downloadLock = true;
        while (this.state.chunks.length > 0) {
            let blob = new Blob([this.state.chunks.shift()], {
                type: 'video/webm;codecs=h264'
            });

            await ffmpeg.write('test.webm', blob);
            await ffmpeg.transcode('test.webm', 'recording.mp4', '-vcodec copy -qscale 0');
            const data = ffmpeg.read('recording.mp4');


            var url = URL.createObjectURL(new Blob([data.buffer], { type: 'video/mp4' }));
            var a = document.createElement('a');
            document.body.appendChild(a);
            a.style = 'display: none';
            a.href = url;
            a.download = `recording-${this.state.filePart}.mp4`;
            a.click();
            window.URL.revokeObjectURL(url);
            this.state.filePart += 1;

            onCompilationComplete && onCompilationComplete();

            // Remove the files from ffmpeg.
            try {
                await ffmpeg.remove('test.webm');
            } catch {
            }

            try {
                await ffmpeg.remove('recording.mp4');
            } catch {
            }
        }
        this.state.downloadLock = false;
    }
};