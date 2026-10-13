

/* ==========================================
   VOLTIX - VARIABLES
   ========================================== */

const $ = (id) => document.getElementById(id);

const form = $("circuitForm");

const voltageInput = $("voltage");
const resistor1Input = $("resistor1");
const resistor2Input = $("resistor2");
const circuitTypeInput = $("circuitType");

const MAX_VALUE = 1e12;

let lastResults = null;
let history = loadHistory();


/* ==========================================
   FORMATO DE NÚMEROS
   ========================================== */

function formatNumber(value) {

    if (!Number.isFinite(value)) {
        return "--";
    }

    if (Object.is(value, -0) || value === 0) {
        return "0";
    }

    const abs = Math.abs(value);

    if (abs >= 1e7 || abs < 0.0001) {
        return value.toExponential(4);
    }

    return Number(value.toPrecision(7)).toLocaleString("es-GT", {
        maximumFractionDigits: 7
    });
}


function formatResistance(value) {

    const abs = Math.abs(value);

    if (abs >= 1e6) {
        return `${formatNumber(value / 1e6)} MΩ`;
    }

    if (abs >= 1e3) {
        return `${formatNumber(value / 1e3)} kΩ`;
    }

    return `${formatNumber(value)} Ω`;
}


function formatCurrent(value) {

    const abs = Math.abs(value);

    if (abs > 0 && abs < 1) {
        return `${formatNumber(value * 1000)} mA`;
    }

    return `${formatNumber(value)} A`;
}


function formatPower(value) {

    const abs = Math.abs(value);

    if (abs > 0 && abs < 1) {
        return `${formatNumber(value * 1000)} mW`;
    }

    if (abs >= 1000) {
        return `${formatNumber(value / 1000)} kW`;
    }

    return `${formatNumber(value)} W`;
}


function formatVoltage(value) {
    return `${formatNumber(value)} V`;
}


/* ==========================================
   VALIDACIÓN
   ========================================== */

function getCircuitInputs() {

    const voltage = Number(voltageInput.value);
    const r1 = Number(resistor1Input.value);
    const r2 = Number(resistor2Input.value);

    const values = [
        {
            name: "El voltaje",
            value: voltage,
            min: 0
        },
        {
            name: "La resistencia R1",
            value: r1,
            min: Number.MIN_VALUE
        },
        {
            name: "La resistencia R2",
            value: r2,
            min: Number.MIN_VALUE
        }
    ];

    for (const item of values) {

        if (!Number.isFinite(item.value)) {
            throw new Error(`${item.name} no es un número válido.`);
        }

        if (item.value < item.min) {
            throw new Error(
                item.name === "El voltaje"
                    ? "El voltaje no puede ser negativo."
                    : `${item.name} debe ser mayor que cero.`
            );
        }

        if (item.value > MAX_VALUE) {
            throw new Error(`${item.name} es demasiado grande.`);
        }
    }

    if (
        voltageInput.value.trim() === "" ||
        resistor1Input.value.trim() === "" ||
        resistor2Input.value.trim() === ""
    ) {
        throw new Error("Completa todos los campos del circuito.");
    }

    return {
        voltage,
        r1,
        r2,
        type: circuitTypeInput.value
    };
}


/* ==========================================
   CÁLCULO DEL CIRCUITO
   ========================================== */

function calculateCircuit() {

    const input = getCircuitInputs();

    const {
        voltage,
        r1,
        r2,
        type
    } = input;

    let equivalentResistance;

    if (type === "series") {

        equivalentResistance = r1 + r2;

    } else {

        // Forma equivalente que evita multiplicar
        // directamente resistencias muy grandes.
        const smaller = Math.min(r1, r2);
        const larger = Math.max(r1, r2);

        equivalentResistance =
            smaller / (1 + smaller / larger);
    }

    if (
        !Number.isFinite(equivalentResistance) ||
        equivalentResistance <= 0
    ) {
        throw new Error(
            "No se pudo calcular la resistencia equivalente."
        );
    }

    const totalCurrent = voltage / equivalentResistance;

    let voltageR1;
    let voltageR2;
    let currentR1;
    let currentR2;

    if (type === "series") {

        currentR1 = totalCurrent;
        currentR2 = totalCurrent;

        voltageR1 = currentR1 * r1;
        voltageR2 = currentR2 * r2;

    } else {

        voltageR1 = voltage;
        voltageR2 = voltage;

        currentR1 = voltage / r1;
        currentR2 = voltage / r2;
    }

    const powerR1 = voltageR1 * currentR1;
    const powerR2 = voltageR2 * currentR2;

    const totalPower = voltage * totalCurrent;

    const results = {
        ...input,

        equivalentResistance,
        totalCurrent,

        voltageR1,
        voltageR2,

        currentR1,
        currentR2,

        powerR1,
        powerR2,

        totalPower,

        createdAt: new Date().toISOString()
    };

    const numericValues = [
        equivalentResistance,
        totalCurrent,
        voltageR1,
        voltageR2,
        currentR1,
        currentR2,
        powerR1,
        powerR2,
        totalPower
    ];

    if (!numericValues.every(Number.isFinite)) {
        throw new Error(
            "Los resultados exceden el rango numérico disponible."
        );
    }

    return results;
}


/* ==========================================
   MOSTRAR RESULTADOS
   ========================================== */

function showResults(results) {

    lastResults = results;

    $("metricCurrent").textContent =
        formatCurrent(results.totalCurrent);

    $("metricVoltage").textContent =
        formatVoltage(results.voltage);

    $("metricResistance").textContent =
        formatResistance(results.equivalentResistance);

    $("metricPower").textContent =
        formatPower(results.totalPower);


    $("equivalentResistance").textContent =
        formatResistance(results.equivalentResistance);

    $("totalCurrent").textContent =
        formatCurrent(results.totalCurrent);

    $("totalPower").textContent =
        formatPower(results.totalPower);

    $("voltageR1").textContent =
        formatVoltage(results.voltageR1);

    $("voltageR2").textContent =
        formatVoltage(results.voltageR2);

    $("currentR1").textContent =
        formatCurrent(results.currentR1);

    $("currentR2").textContent =
        formatCurrent(results.currentR2);

    $("powerR1").textContent =
        formatPower(results.powerR1);

    $("powerR2").textContent =
        formatPower(results.powerR2);


    const typeLabel =
        results.type === "series"
            ? "Serie"
            : "Paralelo";

    $("circuitTypeResult").textContent = typeLabel;

    $("circuitBadge").textContent = typeLabel.toUpperCase();

    $("sourceResult").textContent =
        `${formatNumber(results.voltage)} V DC`;

    $("resultMessage").classList.remove("error");

    $("resultMessage").textContent =
        "Cálculo completado correctamente. " +
        `Configuración: ${typeLabel.toLowerCase()}.`;

    drawCircuit(results);

    showCalculationSteps(results);

    saveHistory(results);
}


/* ==========================================
   DIAGRAMA SVG
   ========================================== */

function drawCircuit(results) {

    const svg = $("circuitSvg");

    const wire = "#3985ff";
    const resistorFill = "#17263c";
    const textColor = getComputedStyle(document.body)
        .getPropertyValue("--text")
        .trim();

    const mutedColor = getComputedStyle(document.body)
        .getPropertyValue("--text-secondary")
        .trim();

    const sourceX = 75;
    const sourceY = 140;

    const r1 = formatResistance(results.r1);
    const r2 = formatResistance(results.r2);

    const voltageLabel = formatVoltage(results.voltage);

    let drawing = "";

    if (results.type === "series") {

        drawing = `
            <path d="M ${sourceX} 65 H 175"
                  stroke="${wire}" stroke-width="3" fill="none"/>

            <path d="M 265 65 H 350 V 115"
                  stroke="${wire}" stroke-width="3" fill="none"/>

            <path d="M 350 165 V 220 H 75 V 164"
                  stroke="${wire}" stroke-width="3" fill="none"/>

            <circle cx="${sourceX}" cy="${sourceY}"
                    r="24"
                    stroke="${wire}"
                    stroke-width="3"
                    fill="${resistorFill}"/>

            <text x="${sourceX}" y="133"
                  text-anchor="middle"
                  font-size="18"
                  font-weight="bold"
                  fill="${textColor}">+</text>

            <text x="${sourceX}" y="155"
                  text-anchor="middle"
                  font-size="18"
                  font-weight="bold"
                  fill="${textColor}">−</text>

            <rect x="175" y="53"
                  width="90" height="24"
                  rx="4"
                  fill="${resistorFill}"
                  stroke="${wire}"
                  stroke-width="3"/>

            <rect x="338" y="115"
                  width="24" height="50"
                  rx="4"
                  fill="${resistorFill}"
                  stroke="${wire}"
                  stroke-width="3"/>

            <text x="220" y="37"
                  text-anchor="middle"
                  font-size="13"
                  font-weight="bold"
                  fill="${textColor}">R1</text>

            <text x="220" y="96"
                  text-anchor="middle"
                  font-size="11"
                  fill="${mutedColor}">${r1}</text>

            <text x="385" y="135"
                  font-size="13"
                  font-weight="bold"
                  fill="${textColor}">R2</text>

            <text x="385" y="151"
                  font-size="11"
                  fill="${mutedColor}">${r2}</text>

            <text x="75" y="185"
                  text-anchor="middle"
                  font-size="11"
                  fill="${mutedColor}">${voltageLabel}</text>

            <text x="250" y="255"
                  text-anchor="middle"
                  font-size="11"
                  fill="${mutedColor}">CIRCUITO EN SERIE</text>
        `;

    } else {

        drawing = `
            <path d="M 75 65 H 425"
                  stroke="${wire}" stroke-width="3" fill="none"/>

            <path d="M 75 215 H 425"
                  stroke="${wire}" stroke-width="3" fill="none"/>

            <path d="M 75 65 V 116"
                  stroke="${wire}" stroke-width="3" fill="none"/>

            <path d="M 75 164 V 215"
                  stroke="${wire}" stroke-width="3" fill="none"/>

            <path d="M 75 65 H 190 V 100"
                  stroke="${wire}" stroke-width="3" fill="none"/>

            <path d="M 75 215 H 190 V 180"
                  stroke="${wire}" stroke-width="3" fill="none"/>

            <path d="M 190 100 V 116"
                  stroke="${wire}" stroke-width="3" fill="none"/>

            <path d="M 190 164 V 180"
                  stroke="${wire}" stroke-width="3" fill="none"/>

            <path d="M 190 65 H 340 V 100"
                  stroke="${wire}" stroke-width="3" fill="none"/>

            <path d="M 340 100 V 116"
                  stroke="${wire}" stroke-width="3" fill="none"/>

            <path d="M 340 164 V 180"
                  stroke="${wire}" stroke-width="3" fill="none"/>

            <path d="M 340 180 V 215"
                  stroke="${wire}" stroke-width="3" fill="none"/>

            <circle cx="75" cy="140"
                    r="24"
                    stroke="${wire}"
                    stroke-width="3"
                    fill="${resistorFill}"/>

            <text x="75" y="133"
                  text-anchor="middle"
                  font-size="18"
                  font-weight="bold"
                  fill="${textColor}">+</text>

            <text x="75" y="155"
                  text-anchor="middle"
                  font-size="18"
                  font-weight="bold"
                  fill="${textColor}">−</text>

            <rect x="178" y="116"
                  width="24" height="48"
                  rx="4"
                  fill="${resistorFill}"
                  stroke="${wire}"
                  stroke-width="3"/>

            <rect x="328" y="116"
                  width="24" height="48"
                  rx="4"
                  fill="${resistorFill}"
                  stroke="${wire}"
                  stroke-width="3"/>

            <text x="190" y="94"
                  text-anchor="middle"
                  font-size="13"
                  font-weight="bold"
                  fill="${textColor}">R1</text>

            <text x="190" y="198"
                  text-anchor="middle"
                  font-size="11"
                  fill="${mutedColor}">${r1}</text>

            <text x="340" y="94"
                  text-anchor="middle"
                  font-size="13"
                  font-weight="bold"
                  fill="${textColor}">R2</text>

            <text x="340" y="198"
                  text-anchor="middle"
                  font-size="11"
                  fill="${mutedColor}">${r2}</text>

            <text x="75" y="185"
                  text-anchor="middle"
                  font-size="11"
                  fill="${mutedColor}">${voltageLabel}</text>

            <text x="250" y="255"
                  text-anchor="middle"
                  font-size="11"
                  fill="${mutedColor}">CIRCUITO EN PARALELO</text>
        `;
    }

    svg.innerHTML = drawing;
}


/* ==========================================
   PROCEDIMIENTO PASO A PASO
   ========================================== */

function showCalculationSteps(results) {

    const container = $("calculationSteps");

    const steps = [];

    if (results.type === "series") {

        steps.push({
            title: "Calcular la resistencia equivalente",
            description:
                "En serie, las resistencias se suman.",
            formula:
                `Rt = R1 + R2 = ${formatNumber(results.r1)} + ` +
                `${formatNumber(results.r2)} = ` +
                `${formatResistance(results.equivalentResistance)}`
        });

    } else {

        steps.push({
            title: "Calcular la resistencia equivalente",
            description:
                "En paralelo, se utiliza el inverso de la suma de los inversos.",
            formula:
                `Rt = (R1 × R2) / (R1 + R2) = ` +
                `${formatResistance(results.equivalentResistance)}`
        });
    }


    steps.push({
        title: "Calcular la corriente total",
        description:
            "Aplicamos la ley de Ohm utilizando el voltaje de la fuente.",
        formula:
            `I = V / Rt = ${formatNumber(results.voltage)} / ` +
            `${formatNumber(results.equivalentResistance)} = ` +
            `${formatCurrent(results.totalCurrent)}`
    });


    if (results.type === "series") {

        steps.push({
            title: "Calcular el voltaje de cada resistencia",
            description:
                "La corriente es igual en todas las resistencias en serie.",
            formula:
                `VR1 = I × R1 = ${formatVoltage(results.voltageR1)}; ` +
                `VR2 = I × R2 = ${formatVoltage(results.voltageR2)}`
        });

    } else {

        steps.push({
            title: "Calcular el voltaje de cada resistencia",
            description:
                "En paralelo, cada rama tiene el mismo voltaje que la fuente.",
            formula:
                `VR1 = VR2 = ${formatVoltage(results.voltage)}`
        });
    }


    steps.push({
        title: "Calcular la potencia eléctrica",
        description:
            "La potencia total se obtiene multiplicando el voltaje por la corriente.",
        formula:
            `P = V × I = ${formatNumber(results.voltage)} × ` +
            `${formatNumber(results.totalCurrent)} = ` +
            `${formatPower(results.totalPower)}`
    });


    steps.push({
        title: "Comprobar la distribución de corriente",
        description:
            results.type === "series"
                ? "En serie, la corriente es igual en ambas resistencias."
                : "En paralelo, la corriente total es la suma de las corrientes de las ramas.",
        formula:
            `IR1 = ${formatCurrent(results.currentR1)}; ` +
            `IR2 = ${formatCurrent(results.currentR2)}; ` +
            `It = ${formatCurrent(results.totalCurrent)}`
    });


    container.innerHTML = steps.map((step, index) => `

        <article class="step-card">

            <div class="step-number">
                ${index + 1}
            </div>

            <div class="step-content">

                <h3>${step.title}</h3>

                <p>${step.description}</p>

                <div class="step-formula">
                    ${step.formula}
                </div>

            </div>

        </article>

    `).join("");
}


/* ==========================================
   MENSAJES DE ERROR
   ========================================== */

function showError(error) {

    $("resultMessage").textContent = error.message;

    $("resultMessage").classList.add("error");
}


/* ==========================================
   FORMULARIO PRINCIPAL
   ========================================== */

form.addEventListener("submit", function(event) {

    event.preventDefault();

    try {

        const results = calculateCircuit();

        showResults(results);

    } catch (error) {

        showError(error);
    }
});


/* ==========================================
   RESTABLECER
   ========================================== */

$("resetButton").addEventListener("click", function() {

    voltageInput.value = 12;
    resistor1Input.value = 100;
    resistor2Input.value = 200;

    circuitTypeInput.value = "series";

    lastResults = null;

    clearDisplayedResults();

    try {

        const results = calculateCircuit();

        showResults(results);

    } catch (error) {

        showError(error);
    }
});


function clearDisplayedResults() {

    const ids = [
        "metricCurrent",
        "metricVoltage",
        "metricResistance",
        "metricPower",

        "equivalentResistance",
        "totalCurrent",
        "totalPower",

        "voltageR1",
        "voltageR2",

        "currentR1",
        "currentR2",

        "powerR1",
        "powerR2"
    ];

    ids.forEach(id => {
        $(id).textContent = "--";
    });

    $("calculationSteps").innerHTML = `
        <div class="empty-state">
            <span>∑</span>
            <p>Realiza un cálculo para consultar el procedimiento.</p>
        </div>
    `;

    $("resultMessage").classList.remove("error");

    $("resultMessage").textContent =
        "Introduce los valores del circuito y pulsa «Calcular circuito».";

    $("circuitTypeResult").textContent = "Serie";

    $("circuitBadge").textContent = "SERIE";

    $("sourceResult").textContent = "--";

    $("circuitSvg").innerHTML = "";

    lastResults = null;
}


/* ==========================================
   LEY DE OHM
   ========================================== */

$("calculateOhm").addEventListener("click", calculateOhm);


function calculateOhm() {

    const voltageField = $("ohmVoltage");
    const currentField = $("ohmCurrent");
    const resistanceField = $("ohmResistance");

    const fields = [
        voltageField,
        currentField,
        resistanceField
    ];

    const provided = fields.filter(field =>
        field.value.trim() !== ""
    );

    const output = $("ohmResult");

    output.textContent = "";

    if (provided.length !== 2) {

        output.textContent =
            "Debes introducir exactamente dos magnitudes conocidas.";

        return;
    }

    const values = fields.map(field =>
        field.value.trim() === "" ? null : Number(field.value)
    );

    if (values.some(value =>
        value !== null &&
        (!Number.isFinite(value) || value < 0 || value > MAX_VALUE)
    )) {

        output.textContent =
            "Introduce valores numéricos válidos y no negativos.";

        return;
    }

    const [voltage, current, resistance] = values;

    if (voltage !== null && current !== null) {

        if (current === 0) {

            output.textContent =
                voltage === 0
                    ? "Con V = 0 e I = 0 no se puede determinar una resistencia única."
                    : "No se puede dividir entre una corriente de cero.";

            return;
        }

        const result = voltage / current;

        if (!Number.isFinite(result)) {

            output.textContent = "El resultado excede el rango numérico.";

            return;
        }

        resistanceField.value = result;

        output.innerHTML =
            `<strong>Resistencia calculada:</strong> ` +
            `${formatResistance(result)}<br>` +
            `Fórmula: R = V / I<br>` +
            `Sustitución: R = ${formatNumber(voltage)} / ` +
            `${formatNumber(current)}`;

        return;
    }


    if (voltage !== null && resistance !== null) {

        if (resistance === 0) {

            output.textContent =
                "La resistencia debe ser mayor que cero.";

            return;
        }

        const result = voltage / resistance;

        if (!Number.isFinite(result)) {

            output.textContent = "El resultado excede el rango numérico.";

            return;
        }

        currentField.value = result;

        output.innerHTML =
            `<strong>Corriente calculada:</strong> ` +
            `${formatCurrent(result)}<br>` +
            `Fórmula: I = V / R<br>` +
            `Sustitución: I = ${formatNumber(voltage)} / ` +
            `${formatNumber(resistance)}`;

        return;
    }


    if (current !== null && resistance !== null) {

        const result = current * resistance;

        if (!Number.isFinite(result)) {

            output.textContent = "El resultado excede el rango numérico.";

            return;
        }

        voltageField.value = result;

        output.innerHTML =
            `<strong>Voltaje calculado:</strong> ` +
            `${formatVoltage(result)}<br>` +
            `Fórmula: V = I × R<br>` +
            `Sustitución: V = ${formatNumber(current)} × ` +
            `${formatNumber(resistance)}`;
    }
}


$("clearOhm").addEventListener("click", function() {

    $("ohmVoltage").value = "";
    $("ohmCurrent").value = "";
    $("ohmResistance").value = "";

    $("ohmResult").textContent =
        "Introduce dos magnitudes positivas para calcular la tercera.";
});


/* ==========================================
   HISTORIAL LOCAL
   ========================================== */

function loadHistory() {

    try {

        const saved = localStorage.getItem("voltixHistory");

        if (!saved) {
            return [];
        }

        const parsed = JSON.parse(saved);

        if (!Array.isArray(parsed)) {
            return [];
        }

        return parsed.filter(item =>

            item &&
            Number.isFinite(item.voltage) &&
            Number.isFinite(item.r1) &&
            Number.isFinite(item.r2) &&
            Number.isFinite(item.equivalentResistance) &&
            Number.isFinite(item.totalCurrent) &&
            Number.isFinite(item.totalPower) &&
            ["series", "parallel"].includes(item.type)

        ).slice(0, 20);

    } catch {

        return [];
    }
}


function saveHistory(results) {

    const entry = {
        ...results,
        createdAt: new Date().toISOString()
    };

    history.unshift(entry);

    history = history.slice(0, 20);

    try {

        localStorage.setItem(
            "voltixHistory",
            JSON.stringify(history)
        );

    } catch (error) {

        console.warn("No se pudo guardar el historial.", error);
    }

    renderHistory();
}


function renderHistory() {

    const container = $("historyList");

    if (history.length === 0) {

        container.innerHTML = `
            <div class="empty-history">
                Todavía no hay simulaciones guardadas.
            </div>
        `;

        return;
    }

    container.innerHTML = history.map((item, index) => {

        const date = new Date(item.createdAt);

        const dateLabel = Number.isNaN(date.getTime())
            ? "Fecha desconocida"
            : date.toLocaleString("es-GT");

        const typeLabel = item.type === "series"
            ? "Serie"
            : "Paralelo";

        return `

            <article class="history-item">

                <div>
                    <h3>Simulación ${history.length - index}</h3>

                    <p>
                        ${typeLabel} ·
                        Fuente ${formatNumber(item.voltage)} V ·
                        R1 ${formatResistance(item.r1)} ·
                        R2 ${formatResistance(item.r2)}
                    </p>

                    <p>${dateLabel}</p>
                </div>

                <div class="history-values">

                    <strong>
                        ${formatResistance(item.equivalentResistance)}
                    </strong>

                    <span>
                        I = ${formatCurrent(item.totalCurrent)}
                    </span>

                    <br>

                    <button
                        class="text-button load-history"
                        type="button"
                        data-index="${index}">
                        Cargar
                    </button>

                </div>

            </article>

        `;

    }).join("");
}


$("historyList").addEventListener("click", function(event) {

    const button = event.target.closest(".load-history");

    if (!button) {
        return;
    }

    const index = Number(button.dataset.index);

    if (!Number.isInteger(index) || !history[index]) {
        return;
    }

    const item = history[index];

    voltageInput.value = item.voltage;
    resistor1Input.value = item.r1;
    resistor2Input.value = item.r2;
    circuitTypeInput.value = item.type;

    try {

        const results = calculateCircuit();

        showResultsWithoutHistory(results);

        $("simulador").scrollIntoView({
            behavior: "smooth"
        });

    } catch (error) {

        showError(error);
    }
});


function showResultsWithoutHistory(results) {

    // Cargar una simulación antigua no debe crear
    // una entrada duplicada en el historial.
    lastResults = results;

    $("metricCurrent").textContent =
        formatCurrent(results.totalCurrent);

    $("metricVoltage").textContent =
        formatVoltage(results.voltage);

    $("metricResistance").textContent =
        formatResistance(results.equivalentResistance);

    $("metricPower").textContent =
        formatPower(results.totalPower);

    $("equivalentResistance").textContent =
        formatResistance(results.equivalentResistance);

    $("totalCurrent").textContent =
        formatCurrent(results.totalCurrent);

    $("totalPower").textContent =
        formatPower(results.totalPower);

    $("voltageR1").textContent =
        formatVoltage(results.voltageR1);

    $("voltageR2").textContent =
        formatVoltage(results.voltageR2);

    $("currentR1").textContent =
        formatCurrent(results.currentR1);

    $("currentR2").textContent =
        formatCurrent(results.currentR2);

    $("powerR1").textContent =
        formatPower(results.powerR1);

    $("powerR2").textContent =
        formatPower(results.powerR2);

    $("circuitTypeResult").textContent =
        results.type === "series" ? "Serie" : "Paralelo";

    $("circuitBadge").textContent =
        results.type === "series" ? "SERIE" : "PARALELO";

    $("sourceResult").textContent =
        `${formatNumber(results.voltage)} V DC`;

    $("resultMessage").classList.remove("error");

    $("resultMessage").textContent =
        "Simulación histórica cargada correctamente.";

    drawCircuit(results);

    showCalculationSteps(results);
}


$("clearHistory").addEventListener("click", function() {

    const confirmed = confirm(
        "¿Quieres borrar todas las simulaciones del historial?"
    );

    if (!confirmed) {
        return;
    }

    history = [];

    try {

        localStorage.removeItem("voltixHistory");

    } catch (error) {

        console.warn("No se pudo limpiar el almacenamiento.", error);
    }

    renderHistory();
});


/* ==========================================
   COPIAR RESULTADOS
   ========================================== */

$("copyButton").addEventListener("click", async function() {

    if (!lastResults) {

        alert("Primero debes calcular un circuito.");

        return;
    }

    const text = buildReport(lastResults);

    try {

        await navigator.clipboard.writeText(text);

        $("copyButton").textContent = "✓ Copiado";

        setTimeout(() => {

            $("copyButton").textContent = "▣ Copiar resultados";

        }, 1800);

    } catch {

        // Alternativa para contextos donde Clipboard API
        // no está disponible.
        const textarea = document.createElement("textarea");

        textarea.value = text;

        textarea.style.position = "fixed";
        textarea.style.opacity = "0";

        document.body.appendChild(textarea);

        textarea.select();

        const copied = document.execCommand("copy");

        textarea.remove();

        alert(
            copied
                ? "Resultados copiados."
                : "No se pudo copiar. Utiliza la opción Exportar TXT."
        );
    }
});


/* ==========================================
   EXPORTAR RESULTADOS
   ========================================== */

function buildReport(results) {

    const typeLabel = results.type === "series"
        ? "Serie"
        : "Paralelo";

    return `
VOLTIX - ELECTRONIC CIRCUIT SIMULATOR
=====================================

Fecha: ${new Date().toLocaleString("es-GT")}

CONFIGURACIÓN
-------------
Tipo de circuito: ${typeLabel}
Voltaje: ${formatVoltage(results.voltage)}
R1: ${formatResistance(results.r1)}
R2: ${formatResistance(results.r2)}

RESULTADOS TOTALES
------------------
Resistencia equivalente: ${formatResistance(results.equivalentResistance)}
Corriente total: ${formatCurrent(results.totalCurrent)}
Potencia total: ${formatPower(results.totalPower)}

RESISTENCIA R1
--------------
Voltaje: ${formatVoltage(results.voltageR1)}
Corriente: ${formatCurrent(results.currentR1)}
Potencia: ${formatPower(results.powerR1)}

RESISTENCIA R2
--------------
Voltaje: ${formatVoltage(results.voltageR2)}
Corriente: ${formatCurrent(results.currentR2)}
Potencia: ${formatPower(results.powerR2)}

FÓRMULAS
--------
${results.type === "series"
    ? "Rt = R1 + R2"
    : "Rt = (R1 * R2) / (R1 + R2)"}

I = V / Rt
P = V * I

Nota: resultados de un modelo ideal de circuito resistivo DC.
    `.trim();
}


$("exportButton").addEventListener("click", function() {

    if (!lastResults) {

        alert("Primero debes calcular un circuito.");

        return;
    }

    const report = buildReport(lastResults);

    const blob = new Blob(
        ["\uFEFF", report],
        { type: "text/plain;charset=utf-8" }
    );

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;
    link.download = "VOLTIX_resultados.txt";

    document.body.appendChild(link);

    link.click();

    link.remove();

    URL.revokeObjectURL(url);
});


/* ==========================================
   MODO OSCURO / CLARO
   ========================================== */

const themeButton = $("themeButton");

function applyTheme(theme) {

    const isLight = theme === "light";

    document.body.classList.toggle("light-theme", isLight);

    themeButton.textContent = isLight ? "☾" : "☀";

    themeButton.setAttribute(
        "aria-label",
        isLight ? "Activar tema oscuro" : "Activar tema claro"
    );

    try {

        localStorage.setItem("voltixTheme", theme);

    } catch (error) {

        console.warn("No se pudo guardar el tema.", error);
    }

    if (lastResults) {
        drawCircuit(lastResults);
    }
}


function loadTheme() {

    try {

        const saved = localStorage.getItem("voltixTheme");

        applyTheme(saved === "light" ? "light" : "dark");

    } catch {

        applyTheme("dark");
    }
}


themeButton.addEventListener("click", function() {

    const isLight = document.body.classList.contains("light-theme");

    applyTheme(isLight ? "dark" : "light");
});


/* ==========================================
   INICIALIZACIÓN
   ========================================== */

loadTheme();

renderHistory();

// Ejecutar el primer cálculo con los valores
// de ejemplo incluidos en el formulario.
try {

    const initialResults = calculateCircuit();

    showResultsWithoutHistory(initialResults);

} catch (error) {

    showError(error);
}

