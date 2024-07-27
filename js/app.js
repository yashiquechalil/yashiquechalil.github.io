
let canvas, w, h, sketchStarted = false, context, synth, startParam, buzzParam, mixParam;

// setup RNBO and connect to p5 context
async function rnboSetup(context) { 

    const patchExportURL = "export/patch.export.json";
    // pass in context from p5
    const outputNode = context.createGain();
    outputNode.connect(context.destination);

    // load reverb patch
    //response = await fetch("export/rnbo.shimmerev.json")
    //const reverbPatcher = await response.json()

// load reverb patch
response = await fetch(patchExportURL);
const reverbPatcher = await response.json();

const doomDevice = await RNBO.createDevice({ context, patcher: doomPatcher });

// link parameters to change 
startParam = doomDevice.parametersById.get('start');
mixParam = doomDevice.parametersById.get('doomFuzz/Mix');
buzzParam = doomDevice.parametersById.get('doomFuzz/DoomFuzzDSP/Fuzz/Buzz');

// establish signal chain: p5 Synth → Reverb Patch → Output
// connect synth to reverb patch
// synth.connect(doomDevice.node)

// connect reverb patch to output
doomDevice.node.connect(outputNode);
context.suspend();
}

// this gets called once during initialization
function setup() {
  w = window.innerWidth; // width of the browser window
  h = window.innerHeight; // height of the browser window

  // create a canvas for drawing, with dimensions 500x500px
  canvas = createCanvas(w, h) ;

  // make the background of the canvas yellow
  background('yellow') ;

  // fill any shapes that you draw on screen with red
  fill('red'); 

  // don't add any strokes/outlines to shapes
  // by default they have a black stroke
  noStroke();

  // create button - the text inside the function call
  // is the text displayed on screen
  startButton = createButton('Start Sketch'); 

  // position the button at the center of the screen
  startButton.position(w/2, h/2);

  // tell the button what function to call when it is pressed
  startButton.mousePressed(resumeAudio) ;

  context = getAudioContext(); // get p5 audio context

 // synth = new p5.MonoSynth() // create a synth
 // synth.setADSR(10, 1, 1, 5) // set an envelope
 // synth.amp(0.1) // set a lower amplitude to be careful with volumes

  rnboSetup(context); // call RNBO setup function and pass in context
}


// built-in p5 function that is called when the mouse is pressed
function mousePressed() {
  // check that the audio is started
  if(sketchStarted == true) {
    // mouseX gets the X-coordinate of the mouse press
    // and maps the value from the range 0 - 500
    // to 12 (C0) - 108 (C8)
    let note = map(mouseX, 0, w, 12, 108);

    // play the note above, with 90 velocity
    // right now, for 0.1 seconds
    // the duration gets compounded with the envelope
    // synth.play(midiToFreq(note), 90, 0, 0.1)
    startParam.enumValue = 'start';

    // draw an ellipse at the X and Y coordinates
    // with a random size between 0 and 200px
    ellipse(mouseX, mouseY, random(200));
  }
}


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
  }
}


// this gets called every render frame
// (which is usually 60 times per second
function draw() {
  // this will re-draw the canvas each frame (60 times per second)
  // with a very low opacity
  background('rgba(255, 255, 0, 0.05)');
}