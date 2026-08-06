'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const { app, BrowserWindow } = require('electron');

app.whenReady().then(async () => {
  const root = path.join(__dirname, '..');
  const source = path.join(root, 'assets', 'icon.svg');
  const destination = path.join(root, 'assets', 'icon.png');
  const svg = await fs.readFile(source, 'utf8');
  const window = new BrowserWindow({
    width: 512,
    height: 512,
    x: 0,
    y: 0,
    show: true,
    frame: false,
    skipTaskbar: true,
    transparent: true,
    backgroundColor: '#00000000',
  });

  const document = `<!doctype html><style>html,body{width:100%;height:100%;margin:0;background:transparent;overflow:hidden}svg{display:block;width:512px;height:512px}</style>${svg}`;
  await window.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(document)}`);
  await new Promise((resolve) => setTimeout(resolve, 200));
  const image = await window.webContents.capturePage();
  await fs.writeFile(destination, image.toPNG());
  window.destroy();
  app.quit();
}).catch((error) => {
  console.error(error);
  app.exit(1);
});
