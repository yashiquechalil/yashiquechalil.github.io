let audioContext;
let device;
let y;
let x;

function setup() {
    canvas = createCanvas(720, 720);
   
    colorMode(HSB, 360, 100, 100);
    rectMode(CENTER);

    noStroke();

    const WAContext = window.AudioContext || window.webkitAudioContext;
    const audioContext = new WAContext();
    loadRNBO();
    canvas.mouseClicked(StartAudioContext);
    

}

async function loadRNBO() {

    const { createDevice } =  RNBO;

    await audioContext.resume();

    device = audioContext.createGain();
    
    device.connect(audioContext.destination);
     
     // Fetch the exported patcher
     let response, patcher;
     try {
         response = await fetch(rawPatcher);
         patcher = await response.json();
     
         if (!window.RNBO) {
             // Load RNBO script dynamically
             // Note that you can skip this by knowing the RNBO version of your patch
             // beforehand and just include it using a <script> tag
             await loadRNBOScript(patcher.desc.meta.rnboversion);
         }

    x = device.parametersById.get('doomFuzz/Mix');
    y = device.parametersById.get('doomFuzz/DoomFuzzDSP/Fuzz/Buzz');

} catch (err) {
    const errorContext = {
        error: err
    };
    if (response && (response.status >= 300 || response.status < 200)) {
        errorContext.header = `Couldn't load patcher export bundle`,
        errorContext.description = `Check app.js to see what file it's trying to load. Currently it's` +
        ` trying to load "${patchExportURL}". If that doesn't` + 
        ` match the name of the file you exported from RNBO, modify` + 
        ` patchExportURL in app.js.`;
    }
    if (typeof guardrails === "function") {
        guardrails(errorContext);
    } else {
        throw err;
    }
    return;
}
}

function StartAudioContext() {
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }
}

function draw() {
    background(mouseY / 2, 100, 100);

    fill(360 - mouseY /2, 100, 100);

    rect(360, 360, mouseX +1, mouseX +1);

    let yValue = map(mouseY, height, 0, 0, 1);

    let xValue = map(mouseX, 0, width, 0.01, 100);

    yValue = yValue / 1;

    xValue = xValue / 100;

    if(y) {
        y.normalizedValue = yValue;
    }

    if(x) {
        x.normalizedValue = xValue;
    }
}