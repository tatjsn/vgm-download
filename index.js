import got from 'got';
import { JSDOM } from 'jsdom';
import fs from 'node:fs';
import stream from 'node:stream';
import { promisify } from 'node:util';

const pipeline = promisify(stream.pipeline);

async function run2(url, track) {
  const html = await got(url).text();
  const dom = new JSDOM(html);
  const { document } = dom.window;
  let type = 'flac';
  let urls = Array.from(document.querySelectorAll('#pageContent a[href$=flac]')).map(elem => elem.href);
  if (!urls.length) {
    type = 'mp3';
    urls = Array.from(document.querySelectorAll('#pageContent a[href$=mp3]')).map(elem => elem.href);
  }
  if (!urls.length) {
    throw new Error('No downloadable link');
  }
  const [target] = urls;
  const [_, album, song] = Array.from(document.querySelectorAll('#pageContent b')).map(elem => elem.textContent);
  const formattedTrack = `0${track}`.slice(-2);
  const fileName = `${formattedTrack} - ${song} - ${album}.${type}`;
  console.log('Downloading', fileName, 'from', target);
  await pipeline(
    got.stream(target),
    fs.createWriteStream(fileName)
  )
}

async function run() {
  if (!process.env.ROOT_URL) {
    throw new Error('ROOT_URL must be provided');
  }
  const rootUrl = new URL(process.env.ROOT_URL);
  const html = await got(rootUrl.href).text();
  const dom = new JSDOM(html);
  const { document } = dom.window;
  const urls = Array.from(document.querySelectorAll('#songlist .clickable-row a')).map(elem => elem.href);
  const uniqueUrls = new Set(urls);
  console.log('# tracks =', uniqueUrls.size)
  let track = 1;
  for (const url of uniqueUrls) {
    await run2(rootUrl.origin + url, track);
    track += 1;
  }
}

run();
