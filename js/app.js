let audioContext;
let device;
let y;
let x;

function setup() {
    canvas = createCanvas(720, 720);
   
    colorMode(HSB, 360, 100, 100);
    rectMode(CENTER);

    noStroke();

    audioContext = new (window.AudioContext || window.webkitAudioContext)(); 
    loadRNBO();
    canvas.mouseClicked = () => { audioContext.resume() };
    
    

}

async function loadRNBO() {

    const { createDevice } =  RNBO;

    await audioContext.resume();


/*   
    // Fetch the exported patcher
    let response, patcher;
    try {
        response = await fetch('export/patch.export.json');
        patcher = await response.json();

        if (!window.RNBO) {
            // Load RNBO script dynamically
            // Note that you can skip this by knowing the RNBO version of your patch
            // beforehand and just include it using a <script> tag
            await loadRNBOScript(patcher.desc.meta.rnboversion);
        }
*/
    const rawPatcher = await fetch('export/patch.export.json');
    const patcher = await rawPatcher.json();
    device = await createDevice({context: audioContext, patcher});
    
    device.node.connect(audioContext.destination);

    x = device.parametersById.get('doomFuzz/Mix');
    y = device.parametersById.get('doomFuzz/DoomFuzzDSP/Fuzz/Buzz');


  
}


function StartAudioContext() {
    if (audioContext.state === 'suspended'){
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

