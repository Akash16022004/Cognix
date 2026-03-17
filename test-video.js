import { YoutubeTranscript } from 'youtube-transcript/dist/youtube-transcript.esm.js';

async function testTranscript() {
  const videoId = 'O3NU5dLDU2Q';
  console.log(`Testing transcript for video ID: ${videoId}`);
  try {
    const transcript = await YoutubeTranscript.fetchTranscript(videoId);
    console.log('Transcript found:', JSON.stringify(transcript.slice(0, 2), null, 2));
    console.log('Total transcript length:', transcript.length);
  } catch (error) {
    console.error('Transcript Error:', error.message);
  }
}

testTranscript();
