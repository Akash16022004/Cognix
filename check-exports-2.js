import yt from 'youtube-transcript-api';
console.log("Default export:", typeof yt);
if (typeof yt === 'object') console.log("Keys:", Object.keys(yt));
if (typeof yt === 'function') console.log("Function name:", yt.name);
