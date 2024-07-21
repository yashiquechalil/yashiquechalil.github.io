let buzzParam;
let startParam;
let mixParam;

let mic, fft;

// Setup function
async function setup() {
    const patchExportURL = "export/patch.export.json";

    canvas = createCanvas(windowWidth, windowHeight);
    noFill();

    mic = new p5.AudioIn();
    mic.start();

    fft = new p5.FFT();
    fft.setInput(mic);

    // Create AudioContext
    const WAContext = window.AudioContext || window.webkitAudioContext;
    const context = new WAContext();

    // Create gain node and connect it to audio output
    const outputNode = context.createGain();
    outputNode.connect(context.destination);

    // Fetch the exported patcher
    let response, patcher;
    try {
        response = await fetch(patchExportURL);
        patcher = await response.json();

        if (!window.RNBO) {
            // Load RNBO script dynamically
            await loadRNBOScript(patcher.desc.meta.rnboversion);
        }
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

    // (Optional) Fetch the dependencies
    let dependencies = [];
    try {
        const dependenciesResponse = await fetch("export/dependencies.json");
        dependencies = await dependenciesResponse.json();
        dependencies = dependencies.map(d => d.file ? Object.assign({}, d, { file: "export/" + d.file }) : d);
    } catch (e) {}

    // Create the device
    let device;
    try {
        device = await RNBO.createDevice({ context, patcher });
    } catch (err) {
        if (typeof guardrails === "function") {
            guardrails({ error: err });
        } else {
            throw err;
        }
        return;
    }

    device.node.connect(outputNode);

    startParam = device.parametersById.get('start');
    mixParam = device.parametersById.get('doomFuzz/Mix');
    buzzParam = device.parametersById.get('doomFuzz/DoomFuzzDSP/Fuzz/Buzz');

    document.body.onclick = () => {
        if (context.state === 'suspended'){
            context.resume();
        }
        startParam.enumValue = 'start';
    }

    // Skip if you're not using guardrails.js
    if (typeof guardrails === "function")
        guardrails();
}

function loadRNBOScript(version) {
    return new Promise((resolve, reject) => {
        if (/^\d+\.\d+\.\d+-dev$/.test(version)) {
            throw new Error("Patcher exported with a Debug Version!\nPlease specify the correct RNBO version to use in the code.");
        }
        const el = document.createElement("script");
        el.src = "https://c74-public.nyc3.digitaloceanspaces.com/rnbo/" + encodeURIComponent(version) + "/rnbo.min.js";
        el.onload = resolve;
        el.onerror = function(err) {
            console.log(err);
            reject(new Error("Failed to load rnbo.js v" + version));
        };
        document.body.append(el);
    });
}

function draw() {
    background(255, 255, 255, 100);
    stroke(237, 34, 93, 120);

    let timeDomain = fft.waveform(1024, 'float32');
    let corrBuff = autoCorrelate(timeDomain);

    let len = corrBuff.length;

    beginShape();
    for (let i = 0; i < len; i++) {
        let x = map(i, 0, len, 0, width);
        let y = map(abs(corrBuff[i]), 0, 1, height / 2, 0);
        vertex(x, y);
    }
    endShape();

    beginShape();
    for (let i = 0; i < len; i++) {
        let x = map(i, 0, len, 0, width);
        let y = map(abs(corrBuff[i]), 0, 1, height / 2, height);
        vertex(x, y);
    }
    endShape();

    // Existing drawing logic for parameter control
    background(mouseY / 2, 100, 100);
    fill(360 - mouseY / 2, 100, 100);
    rect(360, 360, mouseX + 1, mouseX + 1);

    let yValue = map(mouseY, height, 0, 0, 1);
    let xValue = map(mouseX, 0, width, 0.01, 100);

    yValue = yValue / 1;
    xValue = xValue / 100;

    if (buzzParam) {
        buzzParam.normalizedValue = yValue;
    }

    if (mixParam) {
        mixParam.normalizedValue = xValue;
    }
}

function autoCorrelate(buffer) {
    let newBuffer = [];
    let nSamples = buffer.length;

    if (centerClip) {
        let cutoff = centerClip;
        for (let i = 0; i < buffer.length; i++) {
            let val = buffer[i];
            buffer[i] = Math.abs(val) > cutoff ? val : 0;
        }
    }

    for (let lag = 0; lag < nSamples; lag++) {
        let sum = 0;
        for (let index = 0; index < nSamples; index++) {
            let indexLagged = index + lag;
            let sound1 = buffer[index];
            let sound2 = buffer[indexLagged % nSamples];
            let product = sound1 * sound2;
            sum += product;
        }
        newBuffer[lag] = sum / nSamples;
    }

    if (bNormalize) {
        let biggestVal = 0;
        for (let index = 0; index < nSamples; index++) {
            if (abs(newBuffer[index]) > biggestVal) {
                biggestVal = abs(newBuffer[index]);
            }
        }
        if (biggestVal !== 0) {
            for (let index = 0; index < nSamples; index++) {
                newBuffer[index] /= biggestVal;
            }
        }
    }

    return newBuffer;
}