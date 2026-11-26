/* Picture of the kit board under software GL. node board_shot.cjs <out.jpg> [rep] [w] [h]   (also prints console errors) */
'use strict';
const http=require('http'),fs=require('fs'),path=require('path');const ROOT=path.join(__dirname,'..'),MIME={'.html':'text/html','.js':'text/javascript'};
let pup;for(const n of ['puppeteer','puppeteer-core']){try{pup=require(n);break;}catch(e){}}if(!pup)pup=require('/home/user/gods-eye-view-patch-town/node_modules/puppeteer');
const out=process.argv[2],rep=process.argv[3]||'1',extra=process.argv[6]||'',W=+(process.argv[4]||1400),H=+(process.argv[5]||800);
const server=http.createServer((req,res)=>{const f=path.join(ROOT,decodeURIComponent(req.url.split('?')[0]));fs.readFile(f,(e,b)=>{if(e){res.writeHead(404);return res.end();}res.writeHead(200,{'content-type':MIME[path.extname(f)]||'application/octet-stream'});res.end(b);});});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port+'/sea_proto/kit_board.html?rep='+rep+extra;
 const b=await pup.launch({headless:'new',args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--no-sandbox']});
 const p=await b.newPage();await p.setViewport({width:W,height:H});const errs=[];p.on('console',m=>{if(m.type()==='error')errs.push(m.text());});p.on('pageerror',e=>errs.push(e.message));
 await p.goto(base,{waitUntil:'load'});await p.waitForFunction('window.__board&&window.__board.ready',{timeout:60000});await new Promise(r=>setTimeout(r,2500));
 await p.screenshot({path:out,type:'jpeg',quality:85});console.log(errs.length?'ERRORS '+errs.join(' | '):'no console errors');await b.close();server.close();})();
