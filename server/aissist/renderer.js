import { LeveldbPersistence } from 'y-leveldb';
import DB from '../../src/db'; // Import the DB class
const { ipcRenderer } = require('electron');
const { Graph } = require('graphlib');
const axios = require('axios');
const screenshotDesktop = require('screenshot-desktop');
const sharp = require('sharp');
const si = require('systeminformation');
const activeWin = require('@evgenys91/active-win');
const crypto = require('crypto');
const {Level} = require('level');
const fs = require('fs').promises;
const fssync = require('fs');
const path = require('path');
const tesseract = require('node-tesseract-ocr');

const interestingnessWeights = {
    screenshotChange: 1.0,
    windowChange: 1.0,
    processChange: 1.0,
    userActivity: 1.0
};

// UI Updates from Main
ipcRenderer.on('update-status', (event, status) => {
    const statusElem = document.getElementById('status');
    statusElem.innerText = status;
    statusElem.style.color = status === 'Paused' ? 'red' : 'green';
});

//////////////////////////////
// Utils & DB
//////////////////////////////
const Utils = {
    delay: ms => new Promise(r => setTimeout(r, ms)),
    getEnvNumber: (key, def) => isNaN(parseInt(process.env[key])) ? def : parseInt(process.env[key]),
    getEnvString: (key, def) => process.env[key] || def,
    showNotification: (title, msg) => {
        const n = document.getElementById('notification');
        n.innerText = `${title}: ${msg}`;
        n.style.display = 'block';
        setTimeout(() => { n.style.display = 'none'; }, 5000);
    },
    hashBuffer: buffer => crypto.createHash('sha256').update(buffer).digest('hex')
};

const dbPath = path.join(process.cwd(), 'db');
const imagesDir = path.join(dbPath, 'images');
if (!fssync.existsSync(imagesDir)) {
    fssync.mkdirSync(imagesDir, { recursive: true });
}

// ... (Existing code)

const provider = new LeveldbPersistence(dbPath); // Use dbPath from existing code
const db = new DB('aissist_user', provider); // Use a dedicated user ID for aissist


async function storeSnapshotInDB(snapshot) { //Consider removing this function if no longer needed.
    const tsKey = snapshot.timestamp.toISOString();
    // Save the image as a file
    const imgHash = Utils.hashBuffer(snapshot.screenshot);
    const imgFilename = `${imgHash}.jpg`;
    const imgPath = path.join(imagesDir, imgFilename);

    try {
        await fs.writeFile(imgPath, snapshot.screenshot);
    } catch (err) {
        console.error("Failed to write image:", err);
    }

    // Store snapshot metadata (without the raw screenshot)
    const { screenshot, ...meta } = snapshot;
    meta.timestamp = tsKey;
    // Store a reference to the image filename
    meta.screenshotRef = imgFilename;

    await db.put(`snapshot:${tsKey}`, meta);
}

async function querySnapshotsFromDB(start, end) {
    const query = {
        gte: `snapshot:${start.toISOString()}`,
        lte: `snapshot:${end.toISOString()}`
    };
    const snapshots = [];
    for await (const [k, v] of db.iterator(query))
        snapshots.push(v);
    return snapshots;
}

async function getRecentSnapshots(count) {
    const query = {
        reverse: true, limit: count
    };
    const snapshots = [];
    for await (const [k,v] of db.iterator(query))
        snapshots.push(v);
    // The snapshots are returned in reverse chronological order, which might be fine
    return snapshots;
}

//////////////////////////////
// Tools
//////////////////////////////
class Tool {
    constructor(name, cooldownMs, threshold) {
        this.name = name;
        this.cooldownMs = cooldownMs;
        this.threshold = threshold;
        this.lastRun = 0;
    }
    canRun(snapshot) {
        return (Date.now() - this.lastRun > this.cooldownMs) && (snapshot.interestingness >= this.threshold);
    }
    recordRun() { this.lastRun = Date.now(); }
}

class OCRTool extends Tool {
    constructor(cooldown=5000, thresh=0.5) { super('OCR', cooldown, thresh); }
    async run(snapshot) {
        const tmpPath = path.join(process.cwd(), `ocr_${Date.now()}.png`);
        try {
            await fs.writeFile(tmpPath, snapshot.screenshot);
            const text = await tesseract.recognize(tmpPath, { lang: 'eng', oem: 1, psm: 3 });
            snapshot.ocrResult = { text: text.trim(), confidence: 0 };
        } catch { snapshot.ocrResult = { text: '', confidence: 0 }; }
        finally { await fs.unlink(tmpPath).catch(()=>{}); }
        this.recordRun();
    }
}

class VisionLLMTool extends Tool {
    constructor(url, model, cooldown=120000, thresh=0.7) {
        super('VisionLLM', cooldown, thresh);
        this.url = url; this.model = model;
    }
    async run(snapshot) {
        try {
            const resp = await axios.post(this.url, {
                model: this.model,
                messages: [{ role: 'user', content: 'Analyze screenshot.', images: [snapshot.screenshot.toString('base64')] }],
                stream: false
            });
            snapshot.llmAnalysis = snapshot.llmAnalysis || {};
            snapshot.llmAnalysis.vision = resp.data?.message?.content || 'No response';
        } catch { snapshot.llmAnalysis = { ...snapshot.llmAnalysis, vision: 'Vision analysis failed.' }; }
        this.recordRun();
    }
}

class TextLLMTool extends Tool {
    constructor(url, model, cooldown=60000, thresh=0.9) {
        super('TextLLM', cooldown, thresh);
        this.url = url; this.model = model;
    }
    async run(snapshot) {
        const recent = await getRecentSnapshots(5);
        const prompt = recent.map((s,i)=>`Snapshot ${i+1}:\nOCR:${s.ocrResult?.text||''}\nVision:${s.llmAnalysis?.vision||''}`).join('\n\n');
        const userPrompt = `Given these snapshots, infer any possible user goals or intentions:\n\n${prompt}\n\nUser goals:`;

        try {
            const resp = await axios.post(this.url, {
                model: this.model,
                messages: [{ role: 'user', content: userPrompt }],
                stream: false
            });
            snapshot.llmAnalysis = snapshot.llmAnalysis || {};
            snapshot.llmAnalysis.text = resp.data?.message?.content || 'No response';
        } catch { snapshot.llmAnalysis = { ...snapshot.llmAnalysis, text: 'Text analysis failed.' }; }
        this.recordRun();
    }
}

//////////////////////////////
// Collectors
//////////////////////////////
class ProcessCollector {
    constructor(topN=5){this.topN=topN;}
    async collect() {
        const procs = await si.processes();
        const byCPU = procs.list.sort((a,b)=>b.cpu-a.cpu).slice(0,this.topN);
        const byMem = procs.list.sort((a,b)=>b.memRss - a.memRss).slice(0,this.topN);
        const combined = [...byCPU,...byMem];
        return Array.from(new Map(combined.map(p=>[p.pid,{pid:p.pid,name:p.name,cpu:+p.cpu.toFixed(2),memory:+(p.memRss/(1024*1024)).toFixed(2)}])).values());
    }
}

class WindowCollector {
    async collect() {
        try {
            const w = await activeWin();
            if(!w) return {title:'Unknown',owner:'Unknown',processId:-1,bounds:{}};
            return { title:w.title||'No Title', owner:w.owner?.name||'Unknown', processId:w.id||-1, bounds:w.bounds||{} };
        }catch{ return {title:'Error',owner:'Error',processId:-1,bounds:{}}; }
    }
}

class DuplicateDetector {
    constructor(){ this.prevHash = null; }
    isDuplicate(buffer){
        const h = Utils.hashBuffer(buffer);
        if(this.prevHash===h) return true;
        this.prevHash=h;return false;
    }
}

//////////////////////////////
// Snapshot Manager
//////////////////////////////
class SnapshotManager {
    constructor(subRegion) {
        this.subRegion=subRegion;
        this.processCollector=new ProcessCollector();
        this.windowCollector=new WindowCollector();
        this.duplicateDetector=new DuplicateDetector();
        this.tools=[
            new OCRTool(),
            new VisionLLMTool(Utils.getEnvString('VISION_OLLAMA_URL','http://localhost:11434/api/chat'), Utils.getEnvString('VISION_MODEL','llava:7b')),
            new TextLLMTool(Utils.getEnvString('NON_VISION_OLLAMA_URL','http://localhost:11434/api/chat'), Utils.getEnvString('NON_VISION_MODEL','llava:7b'))
        ];
        this.lastScreenshotHash=null;
        this.lastActiveWindow=null;
        this.lastTopProcess=null;
    }

    async captureScreenshot(){
        const buf = await screenshotDesktop({format:'png'});
        let finalBuf = buf;
        // Convert PNG to JPEG
        finalBuf = await sharp(buf).jpeg({quality:80}).toBuffer();
        if(this.subRegion){
            const {x,y,width,height}=this.subRegion;
            finalBuf = await sharp(finalBuf).extract({left:x,top:y,width,height}).jpeg({quality:80}).toBuffer();
        }
        return finalBuf;
    }

    computeInterestingness(snap) {
        // Base score
        let score=0.5;

        // Check differences in screenshot
        const currHash = Utils.hashBuffer(snap.screenshot);
        if (this.lastScreenshotHash && this.lastScreenshotHash!==currHash) score+=0.3 * interestingnessWeights.screenshotChange;

        // Check window change
        if (this.lastActiveWindow && this.lastActiveWindow!==snap.activeWindow.title) score+=0.2 * interestingnessWeights.windowChange;

        // Check top process change
        const topProc = snap.processes?.[0]?.name||'none';
        if(this.lastTopProcess && this.lastTopProcess!==topProc) score+=0.1 * interestingnessWeights.processChange;

        // Simulate user activity factor
        const userActivity = Math.random(); // placeholder
        score += (userActivity - 0.5) * 0.2 * interestingnessWeights.userActivity;

        // Clamp score
        score = Math.max(0, Math.min(score,1.0));

        // Update last-known states
        this.lastScreenshotHash=currHash;
        this.lastActiveWindow=snap.activeWindow.title;
        this.lastTopProcess=topProc;

        return score;
    }

    async createSnapshot() {
        const buf=await this.captureScreenshot();
        const dup=this.duplicateDetector.isDuplicate(buf);
        const ts=new Date();
        let processes=[],activeWindow={};
        if(!dup) [processes,activeWindow]=await Promise.all([this.processCollector.collect(), this.windowCollector.collect()]);
        const snap={timestamp:ts,processes,activeWindow,screenshot:buf,ocrResult:{text:'',confidence:0},llmAnalysis:{},isDuplicate:dup};
        snap.interestingness=dup?0:this.computeInterestingness(snap);
        for(const t of this.tools) if(!dup && t.canRun(snap)) await t.run(snap);
        return snap;
    }
}

//////////////////////////////
// Analyzer
//////////////////////////////
class ScreenshotAnalyzer {
    constructor(config){
        this.cfg=config;
        this.snapMgr=config.snapshotManager;
        this.paused=false;
        this.baseInterval = this.cfg.analysisInterval; // e.g. 10s default
        this.minInterval = 5000; // 5s minimum
        this.maxInterval = 60000; // 60s maximum
    }
    async run(onUpdate,onNotify){
        while(true){
            if(!this.paused){
                try{
                    const snap=await this.snapMgr.createSnapshot();
                    await storeSnapshotInDB(snap);
                    onUpdate(snap);

                    // Adjust interval based on interestingness
                    let factor = 1.0;
                    if(snap.interestingness > 0.8) factor = 0.5;
                    else if(snap.interestingness < 0.3) factor = 2.0;

                    const dynamicInterval = Math.min(
                        Math.max(this.baseInterval * factor, this.minInterval),
                        this.maxInterval
                    );
                    await Utils.delay(dynamicInterval);

                    continue;
                }catch(e){
                    onNotify('Error',e.message||e);
                    console.log(e);
                }
            }
            await Utils.delay(this.cfg.analysisInterval);
        }
    }
    setPaused(p){this.paused=p;}
}

//////////////////////////////
// Config & Start
//////////////////////////////
class Config {
    constructor(){
        this.analysisInterval=Utils.getEnvNumber('ANALYSIS_INTERVAL',10000);
        this.subRegion={x:0,y:0,width:640,height:480};
        this.snapshotManager=new SnapshotManager(this.subRegion);
    }
}

const config=new Config();
const analyzer=new ScreenshotAnalyzer(config);

function updateStatus(msg,col='green'){
    const e=document.getElementById('status');
    e.innerText=msg; e.style.color=col;
}
function updateData(snap){
    document.getElementById('data').innerHTML = `<pre>${JSON.stringify(snap,(k,v)=>k==='screenshot'?'[Image Buffer Omitted]':v,2)}</pre>`;
}
function displayNotification(t,m){
    Utils.showNotification(t,m);
    if(t==='Paused') {
        updateStatus('Paused','red');
        analyzer.setPaused(true);
    }
    if(t==='Resumed'){
        updateStatus('Running','green');
        analyzer.setPaused(false);
    }
    if(t==='Error')updateStatus(`Error: ${m}`,'red');
}

// Query
document.getElementById('query-btn').addEventListener('click', async()=>{
    const startInput=document.getElementById('start').value;
    const endInput=document.getElementById('end').value;
    if(!startInput||!endInput){alert('Provide start/end times');return;}
    const st=new Date(startInput), en=new Date(endInput);
    if(st>en){alert('Start must be before end');return;}
    const snaps=await querySnapshotsFromDB(st,en);
    const r=document.getElementById('query-results');
    r.innerHTML='';
    if(snaps.length===0){r.innerHTML='<p>No snapshots</p>';return;}
    snaps.forEach((s,i)=>{
        const pre=document.createElement('pre');
        pre.textContent=`Snapshot ${i+1}:\n`+JSON.stringify(s,(k,v)=>k==='screenshotRef'?`[Image: ${s.screenshotRef}]`:v,2);
        r.appendChild(pre);
    });
});

async function loadTimeline(count=50) {
    const snaps = await getRecentSnapshots(count);
    const timeline = document.getElementById('timeline');
    timeline.innerHTML = '';
    for (const snap of snaps) {
        const div = document.createElement('div');
        div.style.cursor = 'pointer';
        div.style.display = 'flex';
        div.style.flexDirection = 'column';
        div.style.alignItems = 'center';
        div.style.fontSize = '12px';

        // Choose an icon based on top process
        // const topProc = snap.processes?.[0]?.name || 'generic';
        // let icon = '🖼️';
        // if (topProc.toLowerCase().includes('chrome')) icon = '🌐';
        // else if (topProc.toLowerCase().includes('code')) icon = '💻';
        // else if (topProc.toLowerCase().includes('word')) icon = '📝';
        // const iconElem = document.createElement('div');
        // iconElem.textContent = icon;
        // iconElem.style.fontSize = '24px';
        // div.appendChild(iconElem);

        const url = URL.createObjectURL(new Blob([await fs.readFile(
            path.join('db/images', snap.screenshotRef)
        )], {type: 'image/jpeg'}));

        const imgElem = document.createElement('img');
        imgElem.src = url;
        imgElem.width = 100; // small thumbnail
        div.appendChild(imgElem);

        const timeElem = document.createElement('div');
        timeElem.textContent = new Date(snap.timestamp).toLocaleTimeString();
        div.appendChild(timeElem);

        div.addEventListener('click', () => {
            document.getElementById('timeline-details-content').innerHTML =
                `<pre>${JSON.stringify(snap,(k, v)=>
                    k==='screenshotRef'?`[Stored as ${snap.screenshotRef}]`:v,2)}</pre>`;
        });

        timeline.appendChild(div);
    }
}

// Initial load of timeline
loadTimeline();
// Periodic refresh of timeline to animate changes
setInterval(() => {
    loadTimeline();
}, 10000);

analyzer.run(updateData,displayNotification);
