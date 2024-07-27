let canvas, w, h, sketchStarted = false, context, fft, startParam, buzzParam, mixParam;
var bNormalize = true;
// if > 0, ignores levels below this threshold
var centerClip = 0;

// setup RNBO and connect to p5 context
async function rnboSetup(context) { 
    const patchExportURL = "export/patch.export.json";

    // pass in context from p5
    const outputNode = context.createGain();
    outputNode.connect(context.destination);

    // load rnbo patch
    response = await fetch(patchExportURL);
    const doomPatcher = await response.json();

    const doomDevice = await RNBO.createDevice({ context, patcher: doomPatcher });

    // link parameters to change 
    startParam = doomDevice.parametersById.get('start');
    mixParam = doomDevice.parametersById.get('doomFuzz/Mix');
    buzzParam = doomDevice.parametersById.get('doomFuzz/DoomFuzzDSP/Fuzz/Buzz');

    // establish signal chain: p5 Synth → rnbo Patch → Output
    // connect synth to reverb patch
    // synth.connect(doomDevice.node)

    fft.setInput(outputNode);

    // connect reverb patch to output
    doomDevice.node.connect(outputNode);
    context.suspend();
}

// this gets called once during initialization
function setup() {
    w = 800; // width of the browser window
    h = 800; // height of the browser window

    // create a canvas for drawing, with dimensions 500x500px
    canvas = createCanvas(w, h) ;
    canvas.position((windowWidth -w) /2, (windowHeight - h)/2);

    noFill();

    // default mode is radians
    angleMode(RADIANS);
    translate(w/2, h/2);

    // make the background of the canvas yellow
    //background('yellow') ;

    // fill any shapes that you draw on screen with red
    //fill('red'); 

    // don't add any strokes/outlines to shapes
    // by default they have a black stroke
    //noStroke();

    // create button - the text inside the function call
    // is the text displayed on screen
    startButton = createButton('Start Sketch'); 

    // position the button at the center of the screen
    startButton.position(w/2, h/2);

    // tell the button what function to call when it is pressed
    startButton.mousePressed(resumeAudio) ;

    context = getAudioContext(); // get p5 audio context

    fft = new p5.FFT();

    // synth = new p5.MonoSynth() // create a synth
    // synth.setADSR(10, 1, 1, 5) // set an envelope
    // synth.amp(0.1) // set a lower amplitude to be careful with volumes

    rnboSetup(context); // call RNBO setup function and pass in context
}


// // built-in p5 function that is called when the mouse is pressed
// function mousePressed() {
//   // check that the audio is started
//   if(sketchStarted == true) {
//     // mouseX gets the X-coordinate of the mouse press
//     // and maps the value from the range 0 - 500
//     // to 12 (C0) - 108 (C8)
//     let note = map(mouseX, 0, w, 12, 108);

//     // play the note above, with 90 velocity
//     // right now, for 0.1 seconds
//     // the duration gets compounded with the envelope
//     // synth.play(midiToFreq(note), 90, 0, 0.1)
//     startParam.enumValue = 'start';

//     // draw an ellipse at the X and Y coordinates
//     // with a random size between 0 and 200px
//     ellipse(mouseX, mouseY, random(200));
//   }
// }


// function that will be called when startButton is pressed
function resumeAudio() {
  sketchStarted = true; // audio is now started

  // change CSS of button to hide it
  // since we don't need it anymore
  startButton.style('opacity', '0') ;

  // get the audio context from p5
  if (getAudioContext().state !== 'running') {
    // and resume it if it's not running already 
    context.resume(); 
    startParam.enumValue = 'start';
  }
}


// // this gets called every render frame
// // (which is usually 60 times per second
// function draw() {
//   // this will re-draw the canvas each frame (60 times per second)
//   // with a very low opacity
//   background('rgba(255, 255, 0, 0.05)');
// }


function draw() {
    background(255, 255, 255, 100);
    stroke(237, 34, 93, 120);
    noFill();

    // Get the waveform data
    var waveform = fft.waveform();

    // Number of oscilloscopes
    var numOscilloscopes = 16;

    // Width of each oscilloscope
    var oscWidth = width / numOscilloscopes;

    for (var i = 0; i < numOscilloscopes; i++) {
        // Calculate the x position for this oscilloscope
        var x = i * oscWidth;

        // Calculate the starting and ending index for this bin
        var startIndex = Math.floor(i * waveform.length / numOscilloscopes);
        var endIndex = Math.floor((i + 1) * waveform.length / numOscilloscopes);

        // Draw the waveform for this oscilloscope
        beginShape();
        for (var j = startIndex; j < endIndex; j++) {
            var y = map(waveform[j], -1, 1, height, 0);
            vertex(x + map(j, startIndex, endIndex, 0, oscWidth), y);
        }
        endShape();
    }
}
