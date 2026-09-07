import {startServer} from '../apps/rover/server.mjs';
import {startFieldServer} from '../apps/field-lab/server.mjs';
import {pathToFileURL} from 'node:url';import {resolve} from 'node:path';
/** Own only the servers created by this call; never replace another listening process. */
export async function startWorkbenches({roverPort=4173,fieldPort=4174}={}){
 for(const p of [roverPort,fieldPort])if(!Number.isInteger(p)||p<0||p>65535)throw new TypeError('Invalid local workbench port.');
 const rover=await startServer(roverPort);let field;
 try{field=await startFieldServer(fieldPort);}catch(error){await rover.close();throw error;}
 let closing=null;
 return {rover,field,close:()=>closing??=Promise.all([field.close(),rover.close()]).then(()=>{})};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 try{const apps=await startWorkbenches();console.log('STONE — connected local workbenches');console.log('Start here: '+apps.field.url+'#drone');console.log('Rover: '+apps.rover.url);console.log('All four sections are available from either navigation bar. Ctrl+C closes both.');
 for(const signal of ['SIGINT','SIGTERM'])process.once(signal,async()=>{await apps.close();process.exit(0);});
 }catch(error){console.error('Workbench startup failed: '+error.message+'. Existing services were left untouched.');process.exitCode=1;}
}
