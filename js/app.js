// Semi-circular wave animation aligned to the left integrated with RNBO setup
let lines = []; // Array to hold multiple lines
let numLines = 100; // Number of semi-circular waves
let waveHeight = 20; // Amplitude of the waves
let waveLength = 2000; // Wavelength of the waves
let speed = 0.01; // Speed of the wave animation
let lineSpacing = 20; // Space between the lines

let canvas, w, h, sketchStarted = false, context, fft, startParam, buzzParam, mixParam;
let isPlaying = false;
let waveform = [];
let startButton, playIcon, pauseIcon;

async function rnboSetup(context) { 
    const patchExportURL = "export/patch.export.json";

    const outputNode = context.createGain();
    outputNode.connect(context.destination);

    response = await fetch(patchExportURL);
    const doomPatcher = await response.json();

    const doomDevice = await RNBO.createDevice({ context, patcher: doomPatcher });

    startParam = doomDevice.parametersById.get('start');
    mixParam = doomDevice.parametersById.get('doomFuzz/Mix');
    buzzParam = doomDevice.parametersById.get('doomFuzz/DoomFuzzDSP/Fuzz/Buzz');

    fft.setInput(outputNode);

    doomDevice.node.connect(outputNode);
    context.suspend();
}

function setup() {
    w = windowWidth;
    h = 800;
    canvas = createCanvas(w, h);
    canvas.parent('patcherCanvas');
    noFill();
    strokeWeight(50); // Lines are now 10px in width
    angleMode(RADIANS);

    // Create circular start/stop button
    startButton = createButton('');
    startButton.style('background-color', '#ffffff');
    startButton.style('border', 'none');
    startButton.style('border-radius', '50%');
    startButton.style('width', '80px');
    startButton.style('height', '80px');
    startButton.style('display', 'flex');
    startButton.style('justify-content', 'center');
    startButton.style('align-items', 'center');
    startButton.style('box-shadow', '0px 4px 6px rgba(0, 0, 0, 0.1)');
    startButton.style('position','fixed');
    startButton.style('left','90%');
    startButton.style('top','80%');
    startButton.mousePressed(resumeAudio);

    // Create play and pause icons
    playIcon = createSpan('▶');
    playIcon.style('font-size', '36px');
    playIcon.style('color', '#000');
    pauseIcon = createSpan('❚❚');
    pauseIcon.style('font-size', '36px');
    pauseIcon.style('color', '#000');
    pauseIcon.hide();
    startButton.child(playIcon);
    startButton.child(pauseIcon);

    context = getAudioContext();
    fft = new p5.FFT(0.8, 2048);
    rnboSetup(context);

    for (let i = 0; i < numLines; i++) {
        lines.push(new SemiCircularWave(i));
    }
}

function resumeAudio() {
    sketchStarted = true;
    if (getAudioContext().state !== 'running') {
        context.resume(); 
    }

    if (isPlaying == false) {
        startParam.enumValue = 'start';
        isPlaying = true;
        playIcon.hide();
        pauseIcon.show();
    } else {
        startParam.enumValue = 'stop';
        isPlaying = false;
        pauseIcon.hide();
        playIcon.show();
    }
}

function draw() {
    background(211, 211, 211); // Light background
    translate(-height / 2, height / 2); // Align animation to the left

    // Map mouse inputs to audio parameters
    let yValue = map(mouseY, height, 0, 0, 1) / 1;
    let xValue = map(mouseX, 0, width, 0.01, 100) / 100;

    if (buzzParam) {
        buzzParam.normalizedValue = yValue;
    }

    if (mixParam) {
        mixParam.normalizedValue = xValue;
    }

    // Update FFT waveform
    waveform = fft.waveform();

    // Draw semi-circular waves
    for (let line of lines) {
        line.update(waveform);
        line.display();
    }
}

class SemiCircularWave {
    constructor(index) {
        this.index = index;
        this.radius = 100 + index * (50 + lineSpacing);
    }

    update(waveform) {
        this.waveform = waveform;
        this.time = frameCount * speed;
    }

    display() {
        stroke(lerpColor(color(0, 128, 128), color(100, 200, 255), this.index / numLines));
        beginShape();
        for (let angle = -HALF_PI; angle <= HALF_PI; angle += 0.1) {
            let audioModulation = this.waveform ? this.waveform[Math.floor(map(angle, -HALF_PI, HALF_PI, 0, this.waveform.length))] * waveHeight : 0;
            let x = cos(angle) * (this.radius + (audioModulation * 2));
            let y = sin(angle) * (this.radius + (audioModulation * 10));
            curveVertex(x, y);
        }
        endShape();
    }
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
}
