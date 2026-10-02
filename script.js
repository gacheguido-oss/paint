
"use strict";

// ==========================================
// ELEMENTOS Y CONFIGURACIÓN
// ==========================================

const canvas = document.getElementById("paintCanvas");
const ctx = canvas.getContext("2d", { willReadFrequently: true });
const canvasFrame = document.getElementById("canvasFrame");
const canvasArea = document.getElementById("canvasArea");

const colorInput = document.getElementById("colorInput");
const canvasColor = document.getElementById("canvasColor");
const sizeInput = document.getElementById("sizeInput");
const opacityInput = document.getElementById("opacityInput");
const fillShape = document.getElementById("fillShape");

const textInput = document.getElementById("textInput");
const fontSizeInput = document.getElementById("fontSize");
const fontFamilyInput = document.getElementById("fontFamily");

const undoBtn = document.getElementById("undoBtn");
const redoBtn = document.getElementById("redoBtn");
const fileInput = document.getElementById("fileInput");

let tool = "pencil";
let drawing = false;
let startX = 0;
let startY = 0;
let currentX = 0;
let currentY = 0;
let previousSnapshot = null;
let zoom = 100;

let color = colorInput.value;
let backgroundColor = "#ffffff";
let lineSize = 5;
let opacity = 1;

const history = [];
const redoHistory = [];
const MAX_HISTORY = 40;

let toastTimer;

// ==========================================
// INICIALIZACIÓN
// ==========================================

function initializeCanvas() {
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    saveHistory();
    updateHistoryButtons();
    updateZoom();
    updatePaletteSelection();
}

initializeCanvas();

// ==========================================
// MENSAJES
// ==========================================

function notify(message) {
    const toast = document.getElementById("toast");

    toast.textContent = message;
    toast.classList.add("show");

    clearTimeout(toastTimer);

    toastTimer = setTimeout(() => {
        toast.classList.remove("show");
    }, 2500);
}

function setStatus(message) {
    document.getElementById("statusMessage").innerHTML =
        `<i class="fa-solid fa-circle-info"></i> ${message}`;
}

// ==========================================
// HISTORIAL: DESHACER Y REHACER
// ==========================================

function saveHistory() {
    try {
        history.push(ctx.getImageData(0, 0, canvas.width, canvas.height));

        if (history.length > MAX_HISTORY) {
            history.shift();
        }

        redoHistory.length = 0;
        updateHistoryButtons();
    } catch (error) {
        console.error("No se pudo guardar el historial:", error);
    }
}

function restoreSnapshot(snapshot) {
    if (!snapshot) return;

    ctx.putImageData(snapshot, 0, 0);
}

function undo() {
    if (history.length <= 1) {
        notify("No hay más acciones para deshacer.");
        return;
    }

    redoHistory.push(history.pop());

    restoreSnapshot(history[history.length - 1]);
    updateHistoryButtons();
    setStatus("Acción deshecha");
}

function redo() {
    if (redoHistory.length === 0) {
        notify("No hay acciones para rehacer.");
        return;
    }

    const snapshot = redoHistory.pop();

    history.push(snapshot);
    restoreSnapshot(snapshot);

    updateHistoryButtons();
    setStatus("Acción restaurada");
}

function updateHistoryButtons() {
    undoBtn.disabled = history.length <= 1;
    redoBtn.disabled = redoHistory.length === 0;
}

undoBtn.addEventListener("click", undo);
redoBtn.addEventListener("click", redo);

// ==========================================
// SELECCIÓN DE HERRAMIENTAS
// ==========================================

document.querySelectorAll(".tool").forEach(button => {
    button.addEventListener("click", () => {
        selectTool(button.dataset.tool);
    });
});

function selectTool(selectedTool) {
    tool = selectedTool;

    document.querySelectorAll(".tool").forEach(button => {
        button.classList.toggle(
            "active",
            button.dataset.tool === selectedTool
        );
    });

    const cursors = {
        pencil: "crosshair",
        brush: "crosshair",
        eraser: "cell",
        fill: "crosshair",
        line: "crosshair",
        rect: "crosshair",
        circle: "crosshair",
        ellipse: "crosshair",
        text: "text",
        eyedropper: "copy"
    };

    canvas.style.cursor = cursors[selectedTool] || "crosshair";

    const names = {
        pencil: "Lápiz",
        brush: "Pincel",
        eraser: "Borrador",
        fill: "Relleno",
        line: "Línea",
        rect: "Rectángulo",
        circle: "Círculo",
        ellipse: "Elipse",
        text: "Texto",
        eyedropper: "Cuentagotas"
    };

    setStatus(`Herramienta seleccionada: ${names[selectedTool]}`);
}

// ==========================================
// COLOR Y AJUSTES
// ==========================================

function updateColor(newColor) {
    color = newColor;
    colorInput.value = newColor;
    document.getElementById("hexValue").textContent = newColor.toUpperCase();
    updatePaletteSelection();
}

colorInput.addEventListener("input", () => {
    updateColor(colorInput.value);
});

sizeInput.addEventListener("input", () => {
    lineSize = Number(sizeInput.value);
    document.getElementById("sizeValue").textContent = `${lineSize} px`;
});

opacityInput.addEventListener("input", () => {
    opacity = Number(opacityInput.value) / 100;

    document.getElementById("opacityValue").textContent =
        `${opacityInput.value}%`;
});

document.querySelectorAll("#palette button").forEach(button => {
    button.addEventListener("click", () => {
        updateColor(button.dataset.color);
    });
});

function updatePaletteSelection() {
    document.querySelectorAll("#palette button").forEach(button => {
        button.classList.toggle(
            "selected",
            button.dataset.color.toLowerCase() === color.toLowerCase()
        );
    });
}

canvasColor.addEventListener("input", () => {
    backgroundColor = canvasColor.value;
});

document.getElementById("swapColorBtn").addEventListener("click", () => {
    updateColor(canvasColor.value);
    notify("Color de fondo seleccionado.");
});

// ==========================================
// COORDENADAS DEL LIENZO
// ==========================================

function getCanvasCoordinates(event) {
    const rect = canvas.getBoundingClientRect();

    return {
        x: (event.clientX - rect.left) * canvas.width / rect.width,
        y: (event.clientY - rect.top) * canvas.height / rect.height
    };
}

function updateCursorPosition(x, y) {
    document.getElementById("cursorPosition").textContent =
        `X: ${Math.round(x)}, Y: ${Math.round(y)}`;
}

// ==========================================
// CONFIGURAR EL CONTEXTO
// ==========================================

function applyDrawingStyle() {
    ctx.lineWidth = lineSize;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.globalAlpha = opacity;
}

// ==========================================
// EVENTOS DEL LIENZO
// ==========================================

canvas.addEventListener("pointerdown", startDrawing);
canvas.addEventListener("pointermove", moveDrawing);
canvas.addEventListener("pointerup", stopDrawing);
canvas.addEventListener("pointercancel", stopDrawing);

function startDrawing(event) {
    if (event.button !== undefined && event.button !== 0) return;

    event.preventDefault();

    const pos = getCanvasCoordinates(event);

    startX = pos.x;
    startY = pos.y;
    currentX = pos.x;
    currentY = pos.y;

    updateCursorPosition(pos.x, pos.y);

    // El cuentagotas toma el color de un píxel.
    if (tool === "eyedropper") {
        pickColor(pos.x, pos.y);
        return;
    }

    // El relleno utiliza un algoritmo de inundación.
    if (tool === "fill") {
        floodFill(Math.floor(pos.x), Math.floor(pos.y));
        return;
    }

    // El texto se coloca donde se hace clic.
    if (tool === "text") {
        placeText(pos.x, pos.y);
        return;
    }

    drawing = true;

    try {
        canvas.setPointerCapture(event.pointerId);
    } catch (_) {}

    previousSnapshot = ctx.getImageData(
        0, 0, canvas.width, canvas.height
    );

    if (tool === "pencil" || tool === "brush" || tool === "eraser") {
        applyDrawingStyle();

        if (tool === "brush") {
            ctx.lineWidth = lineSize * 2;
        }

        if (tool === "eraser") {
            ctx.globalAlpha = 1;
            ctx.strokeStyle = backgroundColor;
            ctx.fillStyle = backgroundColor;
            ctx.lineWidth = lineSize * 2;
        }

        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(startX + 0.01, startY + 0.01);
        ctx.stroke();

        if (tool === "eraser") {
            ctx.fillStyle = backgroundColor;
            ctx.beginPath();
            ctx.arc(startX, startY, ctx.lineWidth / 2, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

function moveDrawing(event) {
    const pos = getCanvasCoordinates(event);

    updateCursorPosition(pos.x, pos.y);

    if (!drawing) return;

    currentX = pos.x;
    currentY = pos.y;

    if (tool === "pencil" || tool === "brush" || tool === "eraser") {
        applyDrawingStyle();

        if (tool === "brush") {
            ctx.lineWidth = lineSize * 2;
        }

        if (tool === "eraser") {
            ctx.globalAlpha = 1;
            ctx.strokeStyle = backgroundColor;
            ctx.fillStyle = backgroundColor;
            ctx.lineWidth = lineSize * 2;
        }

        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();

        if (tool === "eraser") {
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, ctx.lineWidth / 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(pos.x, pos.y);
        }

        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
    } else {
        // Las figuras se previsualizan mientras se arrastra.
        restoreSnapshot(previousSnapshot);
        drawShape(startX, startY, pos.x, pos.y, false);
    }
}

function stopDrawing(event) {
    if (!drawing) return;

    drawing = false;

    try {
        if (canvas.hasPointerCapture(event.pointerId)) {
            canvas.releasePointerCapture(event.pointerId);
        }
    } catch (_) {}

    ctx.globalAlpha = 1;

    if (
        tool === "line" ||
        tool === "rect" ||
        tool === "circle" ||
        tool === "ellipse"
    ) {
        restoreSnapshot(previousSnapshot);

        drawShape(startX, startY, currentX, currentY, true);
    }

    saveHistory();
    setStatus("Dibujo actualizado");
}

// ==========================================
// DIBUJAR FIGURAS
// ==========================================

function drawShape(x1, y1, x2, y2, finalShape) {
    applyDrawingStyle();

    const width = x2 - x1;
    const height = y2 - y1;

    ctx.beginPath();

    switch (tool) {
        case "line":
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
            break;

        case "rect":
            if (fillShape.checked) {
                ctx.fillRect(x1, y1, width, height);
            } else {
                ctx.strokeRect(x1, y1, width, height);
            }
            break;

        case "circle": {
            const radius = Math.sqrt(width * width + height * height);

            ctx.arc(x1, y1, radius, 0, Math.PI * 2);

            if (fillShape.checked) {
                ctx.fill();
            } else {
                ctx.stroke();
            }
            break;
        }

        case "ellipse": {
            const radiusX = Math.abs(width) / 2;
            const radiusY = Math.abs(height) / 2;

            ctx.ellipse(
                x1 + width / 2,
                y1 + height / 2,
                radiusX,
                radiusY,
                0,
                0,
                Math.PI * 2
            );

            if (fillShape.checked) {
                ctx.fill();
            } else {
                ctx.stroke();
            }
            break;
        }
    }

    ctx.globalAlpha = 1;
}

// ==========================================
// TEXTO
// ==========================================

function placeText(x, y) {
    const text = textInput.value.trim();

    if (!text) {
        notify("Escribí el texto en el panel lateral primero.");
        textInput.focus();
        return;
    }

    const fontSize = Math.max(
        8,
        Math.min(150, Number(fontSizeInput.value) || 28)
    );

    saveBeforeAction();

    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.fillStyle = color;
    ctx.font = `${fontSize}px "${fontFamilyInput.value}"`;
    ctx.textBaseline = "top";
    ctx.fillText(text, x, y);
    ctx.restore();

    saveHistory();
    setStatus("Texto agregado");
}

// Guardar una copia del estado previo por seguridad.
// Las operaciones que usan esta función no modifican
// el lienzo hasta que se ejecutan.
function saveBeforeAction() {
    if (history.length === 0) {
        saveHistory();
    }
}

// ==========================================
// CUENTAGOTAS
// ==========================================

function pickColor(x, y) {
    const pixel = ctx.getImageData(
        Math.floor(x), Math.floor(y), 1, 1
    ).data;

    const hex = "#" + [pixel[0], pixel[1], pixel[2]]
        .map(value => value.toString(16).padStart(2, "0"))
        .join("");

    updateColor(hex);
    notify(`Color seleccionado: ${hex.toUpperCase()}`);
}

// ==========================================
// RELLENO POR INUNDACIÓN
// ==========================================

function floodFill(startX, startY) {
    if (
        startX < 0 || startY < 0 ||
        startX >= canvas.width || startY >= canvas.height
    ) {
        return;
    }

    const imageData = ctx.getImageData(
        0, 0, canvas.width, canvas.height
    );

    const data = imageData.data;
    const width = canvas.width;
    const height = canvas.height;

    const startIndex = (startY * width + startX) * 4;

    const target = [
        data[startIndex],
        data[startIndex + 1],
        data[startIndex + 2],
        data[startIndex + 3]
    ];

    const fillRGB = hexToRgb(color);
    const fillAlpha = Math.round(opacity * 255);

    if (
        target[0] === fillRGB.r &&
        target[1] === fillRGB.g &&
        target[2] === fillRGB.b &&
        target[3] === fillAlpha
    ) {
        return;
    }

    function matches(index) {
        return (
            Math.abs(data[index] - target[0]) <= 20 &&
            Math.abs(data[index + 1] - target[1]) <= 20 &&
            Math.abs(data[index + 2] - target[2]) <= 20 &&
            Math.abs(data[index + 3] - target[3]) <= 20
        );
    }

    const stack = [[startX, startY]];
    const visited = new Uint8Array(width * height);
    let processed = 0;
    const maxPixels = width * height;

    while (stack.length > 0 && processed < maxPixels) {
        const [x, y] = stack.pop();

        if (x < 0 || y < 0 || x >= width || y >= height) continue;

        const pixelNumber = y * width + x;

        if (visited[pixelNumber]) continue;

        visited[pixelNumber] = 1;

        const index = pixelNumber * 4;

        if (!matches(index)) continue;

        data[index] = fillRGB.r;
        data[index + 1] = fillRGB.g;
        data[index + 2] = fillRGB.b;
        data[index + 3] = fillAlpha;

        processed++;

        stack.push(
            [x + 1, y],
            [x - 1, y],
            [x, y + 1],
            [x, y - 1]
        );
    }

    ctx.putImageData(imageData, 0, 0);

    saveHistory();
    setStatus("Área rellenada");
}

function hexToRgb(hex) {
    const clean = hex.replace("#", "");

    return {
        r: parseInt(clean.substring(0, 2), 16),
        g: parseInt(clean.substring(2, 4), 16),
        b: parseInt(clean.substring(4, 6), 16)
    };
}

// ==========================================
// LIMPIAR LIENZO
// ==========================================

document.getElementById("clearBtn").addEventListener("click", () => {
    const confirmed = confirm(
        "¿Querés borrar todo el dibujo? Esta acción se puede deshacer."
    );

    if (!confirmed) return;

    ctx.globalAlpha = 1;
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    saveHistory();
    setStatus("Lienzo limpiado");
    notify("El lienzo está vacío.");
});

// ==========================================
// CAMBIAR FONDO
// ==========================================

canvasColor.addEventListener("change", () => {
    const confirmed = confirm(
        "¿Querés cambiar el fondo de todo el lienzo? " +
        "Las zonas transparentes se reemplazarán por el nuevo color."
    );

    if (!confirmed) return;

    backgroundColor = canvasColor.value;

    const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = image.data;
    const bg = hexToRgb(backgroundColor);

    for (let i = 0; i < data.length; i += 4) {
        const alpha = data[i + 3] / 255;

        data[i] = Math.round(data[i] * alpha + bg.r * (1 - alpha));
        data[i + 1] = Math.round(data[i + 1] * alpha + bg.g * (1 - alpha));
        data[i + 2] = Math.round(data[i + 2] * alpha + bg.b * (1 - alpha));
        data[i + 3] = 255;
    }

    ctx.putImageData(image, 0, 0);

    saveHistory();
    notify("Fondo actualizado.");
});

// ==========================================
// ABRIR IMÁGENES
// ==========================================

document.getElementById("openBtn").addEventListener("click", () => {
    fileInput.click();
});

fileInput.addEventListener("change", event => {
    const file = event.target.files[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
        notify("Seleccioná un archivo de imagen válido.");
        fileInput.value = "";
        return;
    }

    const reader = new FileReader();

    reader.onload = () => {
        const image = new Image();

        image.onload = () => {
            const confirmed = confirm(
                "¿Querés reemplazar el dibujo actual con esta imagen? " +
                "Podrás deshacer esta acción."
            );

            if (!confirmed) {
                fileInput.value = "";
                return;
            }

            ctx.globalAlpha = 1;
            ctx.fillStyle = backgroundColor;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            const scale = Math.min(
                canvas.width / image.width,
                canvas.height / image.height
            );

            const width = image.width * scale;
            const height = image.height * scale;

            ctx.drawImage(
                image,
                (canvas.width - width) / 2,
                (canvas.height - height) / 2,
                width,
                height
            );

            saveHistory();
            setStatus("Imagen abierta");
            notify("Imagen cargada correctamente.");

            fileInput.value = "";
        };

        image.onerror = () => {
            notify("No se pudo abrir esta imagen.");
            fileInput.value = "";
        };

        image.src = reader.result;
    };

    reader.onerror = () => {
        notify("No se pudo leer el archivo.");
        fileInput.value = "";
    };

    reader.readAsDataURL(file);
});

// ==========================================
// GUARDAR PNG
// ==========================================

document.getElementById("saveBtn").addEventListener("click", savePNG);

function savePNG() {
    const link = document.createElement("a");

    link.download = `mi-dibujo-${Date.now()}.png`;
    link.href = canvas.toDataURL("image/png");

    document.body.appendChild(link);
    link.click();
    link.remove();

    notify("Descarga del dibujo iniciada.");
}

// ==========================================
// COPIAR IMAGEN
// ==========================================

document.getElementById("copyBtn").addEventListener("click", async () => {
    if (!navigator.clipboard || !window.ClipboardItem) {
        notify("Tu navegador no permite copiar imágenes aquí. Guardá el PNG.");
        return;
    }

    try {
        const blob = await new Promise(resolve => {
            canvas.toBlob(resolve, "image/png");
        });

        if (!blob) throw new Error("No se pudo crear la imagen.");

        await navigator.clipboard.write([
            new ClipboardItem({ "image/png": blob })
        ]);

        notify("Imagen copiada al portapapeles.");
    } catch (error) {
        console.error(error);
        notify("No se pudo copiar. Probá abrir la página con Live Server.");
    }
});

// ==========================================
// ZOOM
// ==========================================

document.getElementById("zoomIn").addEventListener("click", () => {
    changeZoom(10);
});

document.getElementById("zoomOut").addEventListener("click", () => {
    changeZoom(-10);
});

document.getElementById("zoomReset").addEventListener("click", () => {
    zoom = 100;
    updateZoom();
});

function changeZoom(amount) {
    zoom = Math.max(25, Math.min(200, zoom + amount));
    updateZoom();
}

function updateZoom() {
    document.getElementById("zoomValue").textContent = `${zoom}%`;

    canvasFrame.style.width = `${zoom}%`;

    // En zoom alto, permitir que el área se desplace.
    canvasFrame.style.maxWidth = zoom <= 100 ? "900px" : "none";

    if (window.innerWidth <= 650 && zoom <= 100) {
        canvasFrame.style.width = `${zoom}%`;
    }
}

// ==========================================
// PANTALLA COMPLETA
// ==========================================

document.getElementById("fullscreenBtn").addEventListener("click", async () => {
    try {
        if (!document.fullscreenElement) {
            await document.documentElement.requestFullscreen();
            document.body.classList.add("fullscreen-mode");
        } else {
            await document.exitFullscreen();
        }
    } catch (error) {
        notify("La pantalla completa no está disponible.");
    }
});

document.addEventListener("fullscreenchange", () => {
    document.body.classList.toggle(
        "fullscreen-mode",
        Boolean(document.fullscreenElement)
    );
});

// ==========================================
// ATAJOS DE TECLADO
// ==========================================

document.addEventListener("keydown", event => {
    const target = event.target;
    const editing = target.matches("input, textarea, select");

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();

        if (event.shiftKey) {
            redo();
        } else {
            undo();
        }

        return;
    }

    if (
        (event.ctrlKey || event.metaKey) &&
        event.key.toLowerCase() === "y"
    ) {
        event.preventDefault();
        redo();
        return;
    }

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        savePNG();
        return;
    }

    if (editing || event.ctrlKey || event.metaKey || event.altKey) return;

    const shortcuts = {
        p: "pencil",
        b: "brush",
        e: "eraser",
        f: "fill",
        l: "line",
        r: "rect",
        c: "circle",
        t: "text",
        i: "eyedropper"
    };

    const key = event.key.toLowerCase();

    if (shortcuts[key]) {
        selectTool(shortcuts[key]);
    }
});

// ==========================================
// DIMENSIONES
// ==========================================

document.getElementById("canvasDimensions").textContent =
    `${canvas.width} × ${canvas.height} px`;

setStatus("Listo para dibujar");