let buzzParam;
let startParam;
let mixParam;
let fft;

async function setup() {
    const patchExportURL = "export/patch.export.json";

    canvas = createCanvas(800, 800);
    canvas.position((windowWidth - 800) / 2, (windowHeight - 800) / 2);

    colorMode(HSB, 360, 100, 100);

    noStroke();

    // Create AudioContext
    const WAContext = window.AudioContext || window.webkitAudioContext;
    const context = new WAContext();

    // Create gain node and connect it to audio output
    const outputNode = context.createGain();
    outputNode.connect(context.destination);

    // Create FFT analyzer
    fft = new p5.FFT(0.8, 16); // 16 bands
    fft.setInput(outputNode);

    // Fetch the exported patcher
    let response, patcher;
    try {
        response = await fetch(patchExportURL);
        patcher = await response.json();

        if (!window.RNBO) {
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
        if (context.state === 'suspended') {
            context.resume();
        }

        startParam.enumValue = 'start';
    }

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
        el.onerror = function (err) {
            console.log(err);
            reject(new Error("Failed to load rnbo.js v" + version));
        };
        document.body.append(el);
    });
}

function draw() {
    background(0);

    let spectrum = fft.analyze();
    let w = width / 16;

    for (let i = 0; i < 16; i++) {
        let x = i * w;
        let h = -spectrum[i] * 2;
        fill(i * 16, 100, 100);
        rect(x, height, w, h);
    }

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

setup();
