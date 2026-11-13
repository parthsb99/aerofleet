const fs = require('fs');

const indexHtml = fs.readFileSync('index.html', 'utf-8');
const dashboardHtml = fs.readFileSync('src/pages/Dashboard.html', 'utf-8');

// Extract head contents from Dashboard.html (specifically tailwind config, style tags, and fonts)
const headMatch = dashboardHtml.match(/<head>([\s\S]*?)<\/head>/i);
if (headMatch) {
  let headContent = headMatch[1];
  // Remove title, meta tags, and charset from headContent as index.html already has them
  headContent = headContent.replace(/<title>.*?<\/title>/ig, '');
  headContent = headContent.replace(/<meta.*?>/ig, '');
  
  // Inject into index.html before </head>
  const newIndexHtml = indexHtml.replace('</head>', `${headContent}\n  </head>`);
  // also add class="dark" to html tag
  const finalIndexHtml = newIndexHtml.replace('<html lang="en">', '<html class="dark" lang="en">');
  fs.writeFileSync('index.html', finalIndexHtml);
}

const pages = ['Dashboard', 'BookService', 'ServiceHistory', 'MyVehicles'];

for (const page of pages) {
  const html = fs.readFileSync(`src/pages/${page}.html`, 'utf-8');
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (bodyMatch) {
    let bodyContent = bodyMatch[1];
    
    // Convert to JSX component
    const jsx = `
import React from 'react';

export default function ${page}() {
  return (
    <div dangerouslySetInnerHTML={{ __html: \`${bodyContent.replace(/`/g, '\\`').replace(/\$/g, '\\$')}\` }} />
  );
}
`;
    fs.writeFileSync(`src/pages/${page}.jsx`, jsx);
    console.log(`Created ${page}.jsx`);
  }
}
