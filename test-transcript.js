import { YoutubeTranscript } from 'youtube-transcript/dist/youtube-transcript.esm.js';

async function test() {
  try {
    const t = await YoutubeTranscript.fetchTranscript('dQw4w9WgXcQ');
    console.log("Success:", Array.isArray(t) ? t[0] : t.slice(0, 100));
  } catch (err) {
    console.error("Error:", err);
  }
}

test();
