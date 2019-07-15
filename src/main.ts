const WIDTH = 1000;

function clamp(val: number, range: [number, number]): number {
    if (val < range[0]) {
        return range[0];
    }
    if (val >= range[1]) {
        return range[1];
    }
    return val;
}

function argmin(values: number[]): number {
    let min = values[0];
    let minIdx = 0;
    for (let i = 1; i < values.length; i++) {
        if (values[i] < min) {
            min = values[i];
            minIdx = i;
        }
    }
    return minIdx;
}

class Uint16Array2D {
    private readonly data: Uint16Array;
    private min: number = 0;
    private max: number = 0;

    constructor(public readonly width: number, public readonly height: number) {
        this.data = new Uint16Array(width * height);
    }

    public get(row: number, col: number): number {
        return this.data[row * this.width + col];
    }

    public set(row: number, col: number, val: number): void {
        this.min = Math.min(this.min, val);
        this.max = Math.max(this.max, val);
        this.data[row * this.width + col] = val;
    }

    public asImageArray(): ImageArray {
        let result = new ImageArray(
            new Uint8ClampedArray(this.width * this.height * 4),
            this.width, this.height);
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                const color = 255 - this.get(row, col) / this.max * 255;
                result.set(row, col, [color, color, color]);
            }
        }
        return result;
    }
}

function computeEnergy(data: ImageArray): Uint16Array2D {
    let energy = new Uint16Array2D(data.width, data.height);
    for (let row = 0; row < data.height; row++) {
        for (let col = 0; col < data.width; col++) {
            const leftRgb = data.getClamped(row, col - 1);
            const rightRgb = data.getClamped(row, col + 1);
            let horizontal = 0;
            for (let i = 0; i < leftRgb.length; i++) {
                horizontal += (leftRgb[i] - rightRgb[i]) ** 2;
            }

            const upRgb = data.getClamped(row - 1, col);
            const downRgb = data.getClamped(row + 1, col);
            let vertical = 0;
            for (let i = 0; i < upRgb.length; i++) {
                vertical += (upRgb[i] - downRgb[i]) ** 2;
            }

            energy.set(row, col, horizontal + vertical);
        }
    }
    return energy;
}

function computeSeamCosts(energy: Uint16Array2D): [Uint16Array2D, Uint16Array2D] {
    let costs = new Uint16Array2D(energy.width, energy.height);
    let costIndices = new Uint16Array2D(energy.width, energy.height);

    for (let col = 0; col < costs.width; col++) {
        costs.set(0, col, energy.get(0, col));
        costIndices.set(0, col, -1);
    }
    for (let row = 1; row < costs.height; row++) {
        for (let col = 0; col < costs.width; col++) {
            const candidates = [
                costs.get(row - 1, clamp(col - 1, [0, costs.width - 1])),
                costs.get(row - 1, col),
                costs.get(row - 1, clamp(col + 1, [0, costs.width - 1])),
            ]
            costs.set(row, col, energy.get(row, col) + Math.min(...candidates));
            costIndices.set(row, col,
                col + argmin(candidates) - (col == 0 ? 0 : 1));
        }
    }
    return [costs, costIndices];
}

class ImageArray {
    constructor(
        private data: Uint8ClampedArray,
        public readonly width: number,
        public readonly height: number) { }

    public get(row: number, col: number): [
        number, number, number] {
        let start = this.getOffset(row, col);
        return [this.data[start], this.data[start + 1], this.data[start + 2]];
    }

    public getClamped(row: number, col: number): [number, number, number] {
        return this.get(
            clamp(row, [0, this.height - 1]),
            clamp(col, [0, this.width - 1]));
    }

    public set(row: number, col: number, rgb: [number, number, number]): void {
        let start = this.getOffset(row, col);
        for (let i = 0; i < rgb.length; i++) {
            this.data[start + i] = rgb[i];
        }
        this.data[start + 3] = 255; // alpha
    }

    public getImageData(): ImageData {
        return new ImageData(this.data, this.width, this.height);
    }

    private getOffset(row: number, col: number): number {
        if (row < 0 || row >= this.height || col < 0 || col >= this.width) {
            throw new RangeError(
                `row (${row}) and col (${col}) must be in ranges ` +
                `[0, ${this.height}) and [0, ${this.width}), respectively.`);
        }
        return row * this.width * 4 + col * 4;
    }
}


const img = new Image();
img.src = "broadway-tower.jpg";
img.onload = function () {
    const canvas: HTMLCanvasElement = document.getElementById("original") as HTMLCanvasElement;
    const context = canvas.getContext("2d");
    context.canvas.height = img.height * (WIDTH / img.width);
    context.canvas.width = WIDTH;

    context.drawImage(img, 0, 0, context.canvas.width, context.canvas.height);
    const imageArray = new ImageArray(
        context.getImageData(0, 0, context.canvas.width, context.canvas.height).data,
        context.canvas.width,
        context.canvas.height
    )

    const energy = computeEnergy(imageArray);
    const energyCanvas = document.getElementById("energy") as HTMLCanvasElement;
    const energyContext = energyCanvas.getContext("2d");
    energyContext.canvas.height = img.height * (WIDTH / img.width);
    energyContext.canvas.width = WIDTH;
    energyContext.putImageData(energy.asImageArray().getImageData(), 0, 0);

    const seamCosts = computeSeamCosts(energy);
    const costs = seamCosts[0];
    const costsCanvas = document.getElementById("costs") as HTMLCanvasElement;
    const costsContext = costsCanvas.getContext("2d");
    costsContext.canvas.height = img.height * (WIDTH / img.width);
    costsContext.canvas.width = WIDTH;
    costsContext.putImageData(costs.asImageArray().getImageData(), 0, 0);
};



