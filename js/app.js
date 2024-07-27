
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
    canvas.position((windowWidth -800) /2, (windowHeight - 800)/2);

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
  
    // min radius of ellipse
    var minRad = 2;
  
    // max radius of ellipse
    var maxRad = height;
  
    // array of values from -1 to 1
    var timeDomain = fft.waveform(1024, 'float32');
    var corrBuff = autoCorrelate(timeDomain);
  
    var len = corrBuff.length;
  
  
    // draw a circular shape
    beginShape();
  
    for (var i = 0; i < len; i++) {
      var angle = map(i, 0, len, 0, HALF_PI);
      var offset = map(abs(corrBuff[i]), 0, 1, 0, maxRad) + minRad;
      var x = (offset) * cos(angle);
      var y = (offset) * sin(angle);
      curveVertex(x, y);
    }
  
    for (var i = 0; i < len; i++) {
      var angle = map(i, 0, len, HALF_PI, PI);
      var offset = map(abs(corrBuff[len - i]), 0, 1, 0, maxRad) + minRad;
      var x = (offset) * cos(angle);
      var y = (offset) * sin(angle);
      curveVertex(x, y);
    }
  
    // semi circle with mirrored
    for (var i = 0; i < len; i++) {
      var angle = map(i, 0, len, PI, HALF_PI + PI);
      var offset = map(abs(corrBuff[i]), 0, 1, 0, maxRad) + minRad;
      var x = (offset) * cos(angle);
      var y = (offset) * sin(angle);
      curveVertex(x, y);
    }
  
    for (var i = 0; i < len; i++) {
      var angle = map(i, 0, len, HALF_PI + PI, TWO_PI);
      var offset = map(abs(corrBuff[len - i]), 0, 1, 0, maxRad) + minRad;
      var x = (offset) * cos(angle);
      var y = (offset) * sin(angle);
      curveVertex(x, y);
    }
  
  
    endShape(CLOSE);
  
  }
  
  
  function autoCorrelate(buffer) {
    var newBuffer = [];
    var nSamples = buffer.length;
  
    var autocorrelation = [];
  
    // center clip removes any samples under 0.1
    if (centerClip) {
      var cutoff = centerClip;
      for (var i = 0; i < buffer.length; i++) {
        var val = buffer[i];
        buffer[i] = Math.abs(val) > cutoff ? val : 0;
      }
    }
  
    for (var lag = 0; lag < nSamples; lag++){
      var sum = 0; 
      for (var index = 0; index < nSamples; index++){
        var indexLagged = index+lag;
        var sound1 = buffer[index];
        var sound2 = buffer[indexLagged % nSamples];
        var product = sound1 * sound2;
        sum += product;
      }
  
      // average to a value between -1 and 1
      newBuffer[lag] = sum/nSamples;
    }
  
    if (bNormalize){
      var biggestVal = 0;
      for (var index = 0; index < nSamples; index++){
        if (abs(newBuffer[index]) > biggestVal){
          biggestVal = abs(newBuffer[index]);
        }
      }
      // dont divide by zero
      if (biggestVal !== 0) {
        for (var index = 0; index < nSamples; index++){
          newBuffer[index] /= biggestVal;
        }
      }
    }
  
    return newBuffer;
  }
  
  
