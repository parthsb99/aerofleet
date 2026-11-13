const fs = require('fs');

const pages = ['Dashboard', 'BookService', 'ServiceHistory', 'MyVehicles'];

for (const page of pages) {
  const filePath = `src/pages/${page}.jsx`;
  let content = fs.readFileSync(filePath, 'utf-8');
  
  // Replace href="#" with actual paths based on text
  content = content.replace(/href="#"([^>]*)>\s*<span[^>]*>.*?<\/span>\s*<span[^>]*>(Dashboard)<\/span>/g, 'href="/"$1> <span class="material-symbols-outlined">dashboard</span> <span class="font-body-md font-semibold">Dashboard</span>');
  
  // A bit robust regex to just find the text "Book a Service" etc and replace its parent a tag's href.
  // Actually, let's just do simple global replacements if we know the structure.
  
  // We can just add onClick handler on the wrapper to handle navigation? 
  // No, dangerouslySetInnerHTML doesn't allow onClick. 
  
  // Let's manually write a regex to replace href="#" with the correct path for the sidebar links.
  const routes = {
    'Dashboard': '/',
    'Book a Service': '/book-service',
    'Service History': '/service-history',
    'My Vehicles': '/my-vehicles'
  };
  
  for (const [name, path] of Object.entries(routes)) {
    // Find <a ... href="#" ...> ... name ... </a>
    // Since it spans multiple lines, we can use [\s\S]
    const regex = new RegExp(`href="#"([\\s\\S]*?>[\\s\\S]*?${name}[\\s\\S]*?<\\/a>)`, 'g');
    content = content.replace(regex, `href="${path}"$1`);
  }
  
  fs.writeFileSync(filePath, content);
}
