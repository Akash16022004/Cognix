import { YoutubeTranscript } from 'youtube-transcript/dist/youtube-transcript.esm.js';

async function test() {
  try {
    const t = await YoutubeTranscript.fetchTranscript('dQw4w9WgXcQ');
    console.log("Success:", t.slice(0, 1));
  } catch(e) {
    console.error(e);
  }
}

test();
