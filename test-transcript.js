import TranscriptClient from 'youtube-transcript-api';

async function test() {
  try {
    const client = new TranscriptClient();
    await client.ready;
    const t = await client.getTranscript('dQw4w9WgXcQ');
    console.log("Success:", Array.isArray(t) ? t[0] : t.slice(0, 100));
  } catch (err) {
    console.error("Error:", err);
  }
}

test();
