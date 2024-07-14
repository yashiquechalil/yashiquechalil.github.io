let audioContext;
let device;
let y;
let x;

function setup() {
    canvas = createCanvas(720, 720);
    noCursor();
    colorMode(HSB, 360, 100, 100);
    rectMode(CENTER);

    noStroke();

    audioContext = new (window.AudioContext || window.webkitAudioContext)();

    loadRNBO();

    canvas.mouseClicked(startAudioContext);

}

async function loadRNBO() {

    const { createDevice } =  RNBO;

    await audioContext.resume();

    const rawPatcher = await fetch('patch.export.json');

    const patcher = await rawPatcher.json();

    device = await creatDevice({ context: audioContext, patcher});
    
    device.node.connect(audioContext.destination);

    x = device.parametersById.get('x');
    y = device.parametersById.get('y');

}

function StartAudioContext(){
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }
}

function draw() {
    background(mouseY / 2, 100, 100);

    fill(360 -mouse /2, 100, 100);

    rect(360, 360, mouseX +1, mouseX +1);

    let yValue = map(mouseY, height, 0, 1, 1000);

    let xValue = map(mousex, 0, width, 100, 5000);

    yValue = yValue / 1000;

    xValue = xValue / 5000;

    if(y) {
        y.normalizedValue = yValue;
    }

    if (x) {
        x.normalizedValue = xValue;
    }
}