let canvas, w, h, sketchStarted = false, context, fft, startParam, buzzParam, mixParam;
var bNormalize = true;
let isPlaying = false;
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
    w = windowWidth; // width of the browser window
    h = 800; // height of the browser window

    // create a canvas for drawing, with dimensions 500x500px
    canvas = createCanvas(w, h);
    //canvas.position((windowWidth -w) /2, (windowHeight - h)/2);
    canvas.parent('patcherCanvas');


    noFill();

    // default mode is radians
    angleMode(RADIANS);

    // make the background of the canvas yellow
    //background('yellow') ;

    // fill any shapes that you draw on screen with red
    //fill('red'); 

    // don't add any strokes/outlines to shapes
    // by default they have a black stroke
    //noStroke();

    // create button - the text inside the function call
    // is the text displayed on screen
    startButton = createButton('Start/Stop'); 
    startButton.style('background-color', 'red');
    startButton.style('border','none');
    startButton.style('color','white');
    startButton.style('padding','15px 32px');
    startButton.style('text-align','center');
    startButton.style('text-decoration','none');
    startButton.style('display','inline-block');
    startButton.style('font-size','16px');
    startButton.style('margin','0px -75px');
    startButton.style('width', '150px')
    startButton.style('cursor','pointer');

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

// function that will be called when startButton is pressed
function resumeAudio() {
    sketchStarted = true; // audio is now started

    // change CSS of button to hide it
    // since we don't need it anymore
    // startButton.style('opacity', '0') ;

    // get the audio context from p5
    if (getAudioContext().state !== 'running') {
        // and resume it if it's not running already 
        context.resume(); 
    }

    if(isPlaying == false)
    {
        startParam.enumValue = 'start';
        isPlaying = true;
    }
    else
    {
        startParam.enumValue = 'stop';
        isPlaying = false;
    }
}

    // Draw function to create 16 vertical oscilloscopes
function draw() {
    background(211, 211, 211); // Clear the canvas with a semi-transparent white background
    stroke(0,0,0); // Set the stroke color to gray
    strokeWeight(2); // Change this value to adjust the thickness of the lines
  
    // Get the waveform data
    var waveform = fft.waveform();
  
    // Number of oscilloscopes
    var numOscilloscopes = 16;
  
    // Height of each oscilloscope
    var oscHeight = height;
  
    // Width of each oscilloscope
    var oscWidth = width / numOscilloscopes;


    let yValue = map(mouseY, height, 0, 0, 1);

    let xValue = map(mouseX, 0, width, 0.01, 100);

    yValue = yValue / 1;

    xValue = xValue / 100;

    if(buzzParam) {
        buzzParam.normalizedValue = yValue;

    }

    if (mixParam){
        mixParam.normalizedValue = xValue;
    }
  

    for (var i = 0; i < numOscilloscopes; i++) {
      // Calculate the x position for this oscilloscope
      var x = i * oscWidth + oscWidth / 2;
  
      // Calculate the starting and ending index for this bin
      var startIndex = Math.floor(i * waveform.length / numOscilloscopes);
      var endIndex = Math.floor((i + 1) * waveform.length / numOscilloscopes);
  
      // Adjust the frequency display by increasing the frequency resolution
      var frequencyMultiplier = 0.0001; // Adjust this value to increase or decrease frequency representation
  
      // Draw the waveform for this oscilloscope
      beginShape();
      for (var j = startIndex; j < endIndex; j++) {

        var y = map(j * frequencyMultiplier, startIndex * frequencyMultiplier, endIndex * frequencyMultiplier, 0, oscHeight);
        var xOffset = map(waveform[j], -1, 1, -oscWidth / 2, oscWidth / 2);
        vertex(x + xOffset, y);
      }
      endShape();

      
    }
  }
