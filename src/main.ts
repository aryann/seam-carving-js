import { COLOR_MAP } from './colormap';

const WIDTH = 300;

function clamp(val: number, range: [number, number]): number {
    if (val < range[0]) {
        return range[0];
    }
    if (val >= range[1]) {
        return range[1];
    }
    return val;
}

function argmin(values: number[] | Uint32Array): number {
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

class Uint32Array2D {
    private readonly data: Uint32Array;
    private min: number = 0;
    private max: number = 0;

    constructor(public readonly width: number, public readonly height: number) {
        this.data = new Uint32Array(width * height);
    }

    public get(row: number, col: number): number {
        return this.data[row * this.width + col];
    }

    public set(row: number, col: number, val: number): void {
        this.min = Math.min(this.min, val);
        this.max = Math.max(this.max, val);
        this.data[row * this.width + col] = val;
    }

    public getRow(row: number): Uint32Array {
        return this.data.slice(row * this.width, (row + 1) * this.width);
    }

    public asImageArray(): ImageArray {
        let result = new ImageArray(
            new Uint8ClampedArray(this.width * this.height * 4),
            this.width, this.height);
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                const color = COLOR_MAP.get(this.get(row, col) / this.max);
                result.set(row, col, color);
            }
        }
        return result;
    }
}

function computeEnergy(data: ImageArray): Uint32Array2D {
    let energy = new Uint32Array2D(data.width, data.height);
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

            energy.set(row, col, Math.sqrt(horizontal + vertical));
        }
    }
    return energy;
}

function computeSeamCosts(energy: Uint32Array2D): [Uint32Array2D, Uint32Array2D] {
    let costs = new Uint32Array2D(energy.width, energy.height);
    let costIndices = new Uint32Array2D(energy.width, energy.height);

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

function findSeamIndices(costs: Uint32Array2D, costIndices: Uint32Array2D): number[] {
    let result: number[] = [];

    let lastRow = costs.getRow(costs.height - 1);
    let currIdx = argmin(lastRow);
    result.push(currIdx);

    for (let row = costIndices.height - 1; row > 0; row--) {
        currIdx = costIndices.get(row, currIdx);
        result.push(currIdx);
    }
    return result.reverse();
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

    public colorSeam(seamIndices: number[]): void {
        for (let row = 0; row < this.height; row++) {
            const col = seamIndices[row];
            this.set(row, col, [255, 0, 0]);
        }
    }

    public removeSeam(seamIndices: number[]): ImageArray {
        let result = new ImageArray(
            new Uint8ClampedArray((this.width - 1) * this.height * 4),
            this.width - 1,
            this.height);

        for (let row = 0; row < this.height; row++) {
            let offset = 0;
            for (let col = 0; col < this.width; col++) {
                if (col == seamIndices[row]) {
                    offset = 1;
                    continue;  // This is a seam pixel; don't copy it!
                }
                result.set(row, col - offset, this.get(row, col));
            }
        }

        return result;
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
    const reduceButton: HTMLAnchorElement = document.getElementById("reduce-button") as
        HTMLAnchorElement;

    const original: HTMLCanvasElement = document.getElementById("original") as HTMLCanvasElement;
    const originalContext = original.getContext("2d");
    originalContext.canvas.height = img.height * (WIDTH / img.width);
    originalContext.canvas.width = WIDTH;
    originalContext.drawImage(img, 0, 0, originalContext.canvas.width, originalContext.canvas.height);

    const modified: HTMLCanvasElement = document.getElementById("resized") as HTMLCanvasElement;
    const modifiedContext = modified.getContext("2d");
    modifiedContext.canvas.height = img.height * (WIDTH / img.width);
    modifiedContext.canvas.width = WIDTH;

    modifiedContext.drawImage(img, 0, 0, modifiedContext.canvas.width, modifiedContext.canvas.height);
    let imageArray = new ImageArray(
        modifiedContext.getImageData(0, 0, modifiedContext.canvas.width, modifiedContext.canvas.height).data,
        modifiedContext.canvas.width,
        modifiedContext.canvas.height
    )

    let reduceFn = function () {
        const energy = computeEnergy(imageArray);
        const energyCanvas = document.getElementById("energy") as HTMLCanvasElement;
        const energyContext = energyCanvas.getContext("2d");
        energyContext.canvas.height = img.height * (WIDTH / img.width);
        energyContext.canvas.width = WIDTH;
        energyContext.putImageData(energy.asImageArray().getImageData(), 0, 0);

        const seamCosts = computeSeamCosts(energy);
        const costs = seamCosts[0];
        const constIndices = seamCosts[1];
        const costsCanvas = document.getElementById("costs") as HTMLCanvasElement;
        const costsContext = costsCanvas.getContext("2d");
        costsContext.canvas.height = img.height * (WIDTH / img.width);
        costsContext.canvas.width = WIDTH;
        costsContext.putImageData(costs.asImageArray().getImageData(), 0, 0);

        imageArray = imageArray.removeSeam(findSeamIndices(costs, constIndices));
        modifiedContext.clearRect(0, 0, modified.width, modified.height);
        modifiedContext.putImageData(imageArray.getImageData(), 0, 0);
    };

    reduceButton.onclick = reduceFn;

    let reduceHandler: number = -1;
    reduceButton.onmousedown = function (event) {
        if (reduceHandler == -1) {
            reduceHandler = setInterval(reduceFn, 100);
        }
    };
    reduceButton.onmouseup = function (event) {
        if (reduceHandler != -1) {
            clearInterval(reduceHandler);
            reduceHandler = -1;
        }
    };
};
