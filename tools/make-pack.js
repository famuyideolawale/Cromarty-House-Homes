// Builds ../investor-pack.pdf from pack.html.  Run from the project folder:  node tools/make-pack.js
const {chromium}=require('playwright');const path=require('path');
(async()=>{const b=await chromium.launch();const p=await b.newPage();
 await p.goto('file://'+path.join(__dirname,'pack.html'));await p.waitForFunction(()=>window.packReady);await p.waitForTimeout(1500);
 await p.pdf({path:path.join(__dirname,'..','investor-pack.pdf'),format:'A4',printBackground:true,preferCSSPageSize:true});await b.close();console.log('investor-pack.pdf written')})();
