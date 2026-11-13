const fs = require('fs');
const https = require('https');

const data = JSON.parse(fs.readFileSync("/Users/parthbadgujar/.gemini/antigravity/brain/91081592-96f8-4478-8a4e-862f9aa9af6e/.system_generated/steps/15/output.txt"));

const targets = {
  Dashboard: "f5da6000eace487b8bcc0a4d3522f263",
  BookService: "68e5e7e5b7d144c690fd3892d1c02056",
  ServiceHistory: "f011581bb9ab490bbff3eab085aa4c29",
  MyVehicles: "f7345a2a6f4f485e8b63f4d2cbbdbaf6"
};

function download(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

async function run() {
  for (const [name, id] of Object.entries(targets)) {
    const screen = data.screens.find(s => s.name.includes(id));
    if (screen) {
      const html = await download(screen.htmlCode.downloadUrl);
      fs.writeFileSync(`src/pages/${name}.html`, html);
      console.log(`Saved ${name}.html`);
    } else {
      console.log(`Not found: ${id}`);
    }
  }
}

run();
