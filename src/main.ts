import { COLOR_MAP } from "./colormap";

const WIDTH = 400;
const SEAM_FILL_STYLE = "rgba(255, 255, 255, 255)";

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
      this.width,
      this.height
    );
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

function computeSeamCosts(
  energy: Uint32Array2D
): [Uint32Array2D, Uint32Array2D] {
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
        costs.get(row - 1, clamp(col + 1, [0, costs.width - 1]))
      ];
      costs.set(row, col, energy.get(row, col) + Math.min(...candidates));
      costIndices.set(row, col, col + argmin(candidates) - (col == 0 ? 0 : 1));
    }
  }
  return [costs, costIndices];
}

function findSeamIndices(
  costs: Uint32Array2D,
  costIndices: Uint32Array2D
): number[] {
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
    public readonly height: number
  ) {}

  public get(row: number, col: number): [number, number, number] {
    let start = this.getOffset(row, col);
    return [this.data[start], this.data[start + 1], this.data[start + 2]];
  }

  public getClamped(row: number, col: number): [number, number, number] {
    return this.get(
      clamp(row, [0, this.height - 1]),
      clamp(col, [0, this.width - 1])
    );
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
      this.height
    );

    for (let row = 0; row < this.height; row++) {
      let offset = 0;
      for (let col = 0; col < this.width; col++) {
        if (col == seamIndices[row]) {
          offset = 1;
          continue; // This is a seam pixel; don't copy it!
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
          `[0, ${this.height}) and [0, ${this.width}), respectively.`
      );
    }
    return row * this.width * 4 + col * 4;
  }
}

interface CanvasContext {
  original: CanvasRenderingContext2D;
  modified: CanvasRenderingContext2D;
  energy: CanvasRenderingContext2D;
  seamCosts: CanvasRenderingContext2D;
}

class State {
  private currentImage: ImageArray;
  private energy: Uint32Array2D;
  private seamCosts: [Uint32Array2D, Uint32Array2D];
  private currSeamIndices: number[];

  constructor(
    private readonly originalImage: ImageArray,
    private readonly canvasContext: CanvasContext
  ) {
    this.currentImage = originalImage;
    this.recompute();
  }

  public draw(): void {
    this.canvasContext.original.putImageData(
      this.originalImage.getImageData(),
      0,
      0
    );

    this.canvasContext.modified.fillStyle = "lightgrey";
    this.canvasContext.modified.fillRect(
      0,
      0,
      this.originalImage.width,
      this.originalImage.height
    );
    this.canvasContext.modified.putImageData(
      this.currentImage.getImageData(),
      0,
      0
    );

    this.canvasContext.energy.fillStyle = "lightgrey";
    this.canvasContext.energy.fillRect(
      0,
      0,
      this.originalImage.width,
      this.originalImage.height
    );
    this.canvasContext.energy.putImageData(
      this.energy.asImageArray().getImageData(),
      0,
      0
    );
    this.canvasContext.energy.fillStyle = SEAM_FILL_STYLE;
    for (let row = 0; row < this.currSeamIndices.length; row++) {
      const col: number = this.currSeamIndices[row];
      this.canvasContext.energy.fillRect(col, row, 1, 1);
    }

    this.canvasContext.seamCosts.fillStyle = "lightgrey";
    this.canvasContext.seamCosts.fillRect(
      0,
      0,
      this.originalImage.width,
      this.originalImage.height
    );
    this.canvasContext.seamCosts.putImageData(
      this.seamCosts[0].asImageArray().getImageData(),
      0,
      0
    );
  }

  public reduceWidthByOne(): void {
    this.currentImage = this.currentImage.removeSeam(this.currSeamIndices);
    this.recompute();
  }

  public reset(): void {
    this.currentImage = this.originalImage;
    this.recompute();
  }

  private recompute(): void {
    this.energy = computeEnergy(this.currentImage);
    this.seamCosts = computeSeamCosts(this.energy);
    const costs: Uint32Array2D = this.seamCosts[0];
    const costIndices: Uint32Array2D = this.seamCosts[1];
    this.currSeamIndices = findSeamIndices(costs, costIndices);
  }
}

const img = new Image();
img.src = "broadway-tower.jpg";
img.onload = function() {
  const upload: HTMLInputElement = document.getElementById(
    "file"
  ) as HTMLInputElement;
  upload.addEventListener("change", function(event) {
    const file = this.files[0];
    if (!file.type.match("image.*")) {
      alert("Please upload an image file.");
    }

    const reader = new FileReader();
    reader.onload = function(event) {
      img.src = (event.target as FileReader).result as string;
    };
    reader.readAsDataURL(file);
  });

  const uploadButton: HTMLAnchorElement = document.getElementById(
    "upload-button"
  ) as HTMLAnchorElement;
  uploadButton.onclick = function(event) {
    upload.click();
  };

  const reduceButton: HTMLAnchorElement = document.getElementById(
    "reduce-button"
  ) as HTMLAnchorElement;
  const resetButton: HTMLAnchorElement = document.getElementById(
    "reset-button"
  ) as HTMLAnchorElement;

  const original: HTMLCanvasElement = document.getElementById(
    "original"
  ) as HTMLCanvasElement;
  const originalContext = original.getContext("2d");
  originalContext.canvas.height = img.height * (WIDTH / img.width);
  originalContext.canvas.width = WIDTH;
  originalContext.drawImage(
    img,
    0,
    0,
    originalContext.canvas.width,
    originalContext.canvas.height
  );

  const modified: HTMLCanvasElement = document.getElementById(
    "resized"
  ) as HTMLCanvasElement;
  const modifiedContext = modified.getContext("2d");
  modifiedContext.canvas.height = img.height * (WIDTH / img.width);
  modifiedContext.canvas.width = WIDTH;

  const energyCanvas = document.getElementById("energy") as HTMLCanvasElement;
  const energyContext = energyCanvas.getContext("2d");
  energyContext.canvas.height = img.height * (WIDTH / img.width);
  energyContext.canvas.width = WIDTH;

  const costsCanvas = document.getElementById("costs") as HTMLCanvasElement;
  const costsContext = costsCanvas.getContext("2d");
  costsContext.canvas.height = img.height * (WIDTH / img.width);
  costsContext.canvas.width = WIDTH;

  const image: ImageArray = new ImageArray(
    originalContext.getImageData(
      0,
      0,
      originalContext.canvas.width,
      originalContext.canvas.height
    ).data,
    originalContext.canvas.width,
    originalContext.canvas.height
  );

  const state: State = new State(image, {
    original: originalContext,
    modified: modifiedContext,
    energy: energyContext,
    seamCosts: costsContext
  });
  state.draw();

  let reduceFn = function() {
    state.reduceWidthByOne();
    state.draw();
  };

  reduceButton.innerHTML = "Play";
  let reduceHandler: number = -1;

  reduceButton.onclick = function(event) {
    if (reduceHandler == -1) {
      reduceHandler = window.setInterval(reduceFn, 100);
      reduceButton.innerHTML = "Pause";
    } else {
      clearInterval(reduceHandler);
      reduceHandler = -1;
      reduceButton.innerHTML = "Play";
    }
  };

  resetButton.onclick = function(event) {
    state.reset();
    state.draw();
  };
};
