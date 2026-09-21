const fs=require("fs");const path=require("path");const https=require("https");
const dir=path.join(process.cwd(),"bin");fs.mkdirSync(dir,{recursive:true});
const isWin=process.platform==="win32";
const asset=isWin?"yt-dlp.exe":process.platform==="darwin"?"yt-dlp_macos":"yt-dlp_linux";
const dest=path.join(dir,isWin?"yt-dlp.exe":"yt-dlp");
const start="https://github.com/yt-dlp/yt-dlp/releases/latest/download/"+asset;
function get(url,redirects=0){
  if(redirects>8) throw new Error("Too many redirects");
  https.get(url,{headers:{"User-Agent":"SoulFlame-Downloader-Build"}},r=>{
    if(r.statusCode>=300&&r.statusCode<400&&r.headers.location){r.resume();return get(new URL(r.headers.location,url).toString(),redirects+1)}
    if(r.statusCode!==200) throw new Error("yt-dlp download HTTP "+r.statusCode);
    const tmp=dest+".tmp";const out=fs.createWriteStream(tmp);r.pipe(out);
    out.on("finish",()=>{out.close(()=>{fs.renameSync(tmp,dest);if(!isWin)fs.chmodSync(dest,0o755);console.log("yt-dlp installed:",dest)})});
  }).on("error",e=>{console.error(e);process.exit(1)});
}
get(start);