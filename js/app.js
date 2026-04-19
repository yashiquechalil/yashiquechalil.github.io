// WebGL/Mesh-like particle system integrated with RNBO setup
let particles = [];
const numParticles = 120;
const connectDistance = 120;

let canvas, w, h, sketchStarted = false, context, fft, startParam, buzzParam, mixParam, doomFreq;
let isPlaying = false;
let waveform = [];
let startButton, playIcon, pauseIcon;

async function rnboSetup(context) { 
    const patchExportURL = "export/patch.export.json";

    const outputNode = context.createGain();
    outputNode.connect(context.destination);

    const response = await fetch(patchExportURL);
    const doomPatcher = await response.json();

    const doomDevice = await RNBO.createDevice({ context, patcher: doomPatcher });

    startParam = doomDevice.parametersById.get('start');
    mixParam = doomDevice.parametersById.get('doomFuzz/Mix');
    buzzParam = doomDevice.parametersById.get('doomFuzz/DoomFuzzDSP/Fuzz/Buzz');
    doomFreq = doomDevice.parametersById.get('doomFuzz/DoomFuzzDSP/Doom/DoomFreqShift');

    fft.setInput(outputNode);

    doomDevice.node.connect(outputNode);
    context.suspend();
}

function setup() {
    w = windowWidth;
    h = windowHeight; // Full window height for the particle network
    canvas = createCanvas(w, h);
    canvas.parent('patcherCanvas');
    angleMode(RADIANS);

    // Create circular start/stop button
    let hero = select('#hero');
    startButton = createButton('');
    if (hero) {
        startButton.parent(hero);
    }
    startButton.addClass('start-button');
    startButton.mousePressed(resumeAudio);
    
    // Create play and pause icons
    playIcon = createSpan('▶');
    pauseIcon = createSpan('❚❚');
    pauseIcon.hide();
    startButton.child(playIcon);
    startButton.child(pauseIcon);
    playIcon.addClass('icon play-icon'); 
    pauseIcon.addClass('icon pause-icon'); 

    // Initialize audio
    context = getAudioContext();
    fft = new p5.FFT(0.8, 2048);
    rnboSetup(context);
    readOrient();

    // Initialize particles
    for (let i = 0; i < numParticles; i++) {
        particles.push(new Particle(random(width), random(height)));
    }
}

function resumeAudio() {
    sketchStarted = true;
    if (getAudioContext().state !== 'running') {
        context.resume(); 
    }

    if (isPlaying == false) {
        if(startParam) startParam.enumValue = 'start';
        isPlaying = true;
        playIcon.hide();
        pauseIcon.show();
    } else {
        if(startParam) startParam.enumValue = 'stop';
        isPlaying = false;
        pauseIcon.hide();
        playIcon.show();
    }
}

function draw() {
    clear(); // Clear canvas completely so trail effects don't break scrolling or overlap text endlessly

    // Map mouse inputs to audio parameters
    let yValue = map(mouseY, height, 0, 0, 1) / 1;
    let xValue = map(mouseX, 0, width, 0.01, 100) / 100;

    if (buzzParam) {
        buzzParam.normalizedValue = constrain(yValue, 0, 1);
    }
    if (mixParam) {
        mixParam.normalizedValue = constrain(xValue, 0, 1);
    }

    // Update FFT waveform
    waveform = fft.waveform();
    
    // Calculate global audio intensity (RMS approximated from waveform array)
    let audioIntensity = 0;
    if (waveform.length > 0) {
        let sum = 0;
        for (let i = 0; i < waveform.length; i++) {
            sum += waveform[i] * waveform[i];
        }
        audioIntensity = sqrt(sum / waveform.length);
    }

    // Update and draw particles
    for (let i = 0; i < particles.length; i++) {
        let p = particles[i];
        p.update(audioIntensity);
        p.display();
        
        // Draw connections
        for (let j = i + 1; j < particles.length; j++) {
            let other = particles[j];
            let d = dist(p.pos.x, p.pos.y, other.pos.x, other.pos.y);
            
            // Interaction distance expands based on audio intensity
            let dynamicConnectDistance = connectDistance + (audioIntensity * 200);
            
            if (d < dynamicConnectDistance) {
                let alpha = map(d, 0, dynamicConnectDistance, 150, 0);
                stroke(20, 20, 20, alpha);
                strokeWeight(map(d, 0, dynamicConnectDistance, 1.5, 0.1) + (audioIntensity * 3));
                
                // If distortion is high (cursor is high up on the screen yValue approaches 1)
                // Draw a jagged, agitated line instead of a straight one
                if (yValue > 0.1 && audioIntensity > 0.01) {
                    let segments = floor(map(yValue, 0, 1, 2, 8)); // More segments = more jagged
                    let agitationMagnitude = map(yValue, 0, 1, 0, 15) * audioIntensity * 10;
                    
                    noFill();
                    beginShape();
                    vertex(p.pos.x, p.pos.y);
                    for(let s = 1; s < segments; s++) {
                        let t = s / segments;
                        // Interpolate point
                        let ix = lerp(p.pos.x, other.pos.x, t);
                        let iy = lerp(p.pos.y, other.pos.y, t);
                        // Add perpendicular agitation
                        let offsetX = random(-agitationMagnitude, agitationMagnitude);
                        let offsetY = random(-agitationMagnitude, agitationMagnitude);
                        vertex(ix + offsetX, iy + offsetY);
                    }
                    vertex(other.pos.x, other.pos.y);
                    endShape();
                } else {
                    // Draw normal straight line
                    line(p.pos.x, p.pos.y, other.pos.x, other.pos.y);
                }
            }
        }
    }
}

class Particle {
    constructor(x, y) {
        this.pos = createVector(x, y);
        this.vel = p5.Vector.random2D().mult(random(0.2, 1.2));
        this.acc = createVector(0, 0);
        this.baseSize = random(1, 4);
        this.mass = this.baseSize;
    }

    update(intensity) {
        // Audio reactivity increases velocity
        this.vel.add(this.acc);
        this.vel.limit(2 + (intensity * 10)); // Max speed goes up when loud
        this.pos.add(this.vel);
        this.acc.mult(0); // Reset acceleration
        
        // Mouse repulsion 
        let mouseNode = createVector(mouseX, mouseY);
        let d = dist(this.pos.x, this.pos.y, mouseNode.x, mouseNode.y);
        if (d < 150) {
            let force = p5.Vector.sub(this.pos, mouseNode);
            force.setMag(map(d, 0, 150, 1.5, 0)); // Stronger repulsion closer to mouse
            this.vel.add(force);
        }

        // Wrap around screen
        if (this.pos.x < 0) this.pos.x = width;
        if (this.pos.x > width) this.pos.x = 0;
        if (this.pos.y < 0) this.pos.y = height;
        if (this.pos.y > height) this.pos.y = 0;
    }

    display() {
        noStroke();
        fill(20, 20, 20, 200);
        ellipse(this.pos.x, this.pos.y, this.baseSize * 1.5);
    }
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
}

function readOrient() {
    if (window.DeviceOrientationEvent && typeof window.addEventListener === 'function') {
        window.addEventListener(
            "deviceorientation",
            (event) => {
                const rotateDegrees = event.alpha; 
                const leftToRight = event.gamma; 
                const frontToBack = event.beta; 
                handleOrientationEvent(frontToBack, leftToRight, rotateDegrees);
            },
            true
        );
    }
}

const handleOrientationEvent = (frontToBack, leftToRight, rotateDegrees) => {
    if (doomFreq) {
        doomFreq.normalizedValue = constrain(map(leftToRight, -90, 90, 0, 1), 0, 1);
    }
};

