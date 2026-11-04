import {chromium} from 'playwright';
const b=await chromium.launch({executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});
const p=await b.newPage({viewport:{width:390,height:844}});
p.on('pageerror',e=>console.log('PAGEERROR',String(e).slice(0,200)));
p.on('response',r=>{if(r.status()>=400)console.log('HTTP',r.status(),r.url());});
await p.goto('http://127.0.0.1:4187/',{waitUntil:'load'});
try{await p.locator('#status').waitFor({state:'detached',timeout:20000});console.log('BOOT OK');}catch{console.log('BOOT STUCK');}
await b.close();
