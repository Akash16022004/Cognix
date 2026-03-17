import pkg from 'youtube-transcript';
console.log(Object.keys(pkg));
const { YoutubeTranscript } = pkg;
async function test() {
  try {
    const t = await YoutubeTranscript.fetchTranscript('dQw4w9WgXcQ');
    console.log(t.slice(0, 1));
  } catch(e) { console.error(e); }
}
test();
