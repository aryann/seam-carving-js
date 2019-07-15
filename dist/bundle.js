(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var WIDTH = 1000;
function clamp(val, range) {
    if (val < range[0]) {
        return range[0];
    }
    if (val >= range[1]) {
        return range[1];
    }
    return val;
}
function argmin(values) {
    var min = values[0];
    var minIdx = 0;
    for (var i = 1; i < values.length; i++) {
        if (values[i] < min) {
            min = values[i];
            minIdx = i;
        }
    }
    return minIdx;
}

var Uint16Array2D = function () {
    function Uint16Array2D(width, height) {
        _classCallCheck(this, Uint16Array2D);

        this.width = width;
        this.height = height;
        this.min = 0;
        this.max = 0;
        this.data = new Uint16Array(width * height);
    }

    _createClass(Uint16Array2D, [{
        key: "get",
        value: function get(row, col) {
            return this.data[row * this.width + col];
        }
    }, {
        key: "set",
        value: function set(row, col, val) {
            this.min = Math.min(this.min, val);
            this.max = Math.max(this.max, val);
            this.data[row * this.width + col] = val;
        }
    }, {
        key: "asImageArray",
        value: function asImageArray() {
            var result = new ImageArray(new Uint8ClampedArray(this.width * this.height * 4), this.width, this.height);
            for (var row = 0; row < this.height; row++) {
                for (var col = 0; col < this.width; col++) {
                    var color = 255 - this.get(row, col) / this.max * 255;
                    result.set(row, col, [color, color, color]);
                }
            }
            return result;
        }
    }]);

    return Uint16Array2D;
}();

function computeEnergy(data) {
    var energy = new Uint16Array2D(data.width, data.height);
    for (var row = 0; row < data.height; row++) {
        for (var col = 0; col < data.width; col++) {
            var leftRgb = data.getClamped(row, col - 1);
            var rightRgb = data.getClamped(row, col + 1);
            var horizontal = 0;
            for (var i = 0; i < leftRgb.length; i++) {
                horizontal += Math.pow(leftRgb[i] - rightRgb[i], 2);
            }
            var upRgb = data.getClamped(row - 1, col);
            var downRgb = data.getClamped(row + 1, col);
            var vertical = 0;
            for (var _i = 0; _i < upRgb.length; _i++) {
                vertical += Math.pow(upRgb[_i] - downRgb[_i], 2);
            }
            energy.set(row, col, horizontal + vertical);
        }
    }
    return energy;
}
function computeSeamCosts(energy) {
    var costs = new Uint16Array2D(energy.width, energy.height);
    var costIndices = new Uint16Array2D(energy.width, energy.height);
    for (var col = 0; col < costs.width; col++) {
        costs.set(0, col, energy.get(0, col));
        costIndices.set(0, col, -1);
    }
    for (var row = 1; row < costs.height; row++) {
        for (var _col = 0; _col < costs.width; _col++) {
            var candidates = [costs.get(row - 1, clamp(_col - 1, [0, costs.width - 1])), costs.get(row - 1, _col), costs.get(row - 1, clamp(_col + 1, [0, costs.width - 1]))];
            costs.set(row, _col, energy.get(row, _col) + Math.min.apply(Math, candidates));
            costIndices.set(row, _col, _col + argmin(candidates) - (_col == 0 ? 0 : 1));
        }
    }
    return [costs, costIndices];
}

var ImageArray = function () {
    function ImageArray(data, width, height) {
        _classCallCheck(this, ImageArray);

        this.data = data;
        this.width = width;
        this.height = height;
    }

    _createClass(ImageArray, [{
        key: "get",
        value: function get(row, col) {
            var start = this.getOffset(row, col);
            return [this.data[start], this.data[start + 1], this.data[start + 2]];
        }
    }, {
        key: "getClamped",
        value: function getClamped(row, col) {
            return this.get(clamp(row, [0, this.height - 1]), clamp(col, [0, this.width - 1]));
        }
    }, {
        key: "set",
        value: function set(row, col, rgb) {
            var start = this.getOffset(row, col);
            for (var i = 0; i < rgb.length; i++) {
                this.data[start + i] = rgb[i];
            }
            this.data[start + 3] = 255; // alpha
        }
    }, {
        key: "getImageData",
        value: function getImageData() {
            return new ImageData(this.data, this.width, this.height);
        }
    }, {
        key: "getOffset",
        value: function getOffset(row, col) {
            if (row < 0 || row >= this.height || col < 0 || col >= this.width) {
                throw new RangeError("row (" + row + ") and col (" + col + ") must be in ranges " + ("[0, " + this.height + ") and [0, " + this.width + "), respectively."));
            }
            return row * this.width * 4 + col * 4;
        }
    }]);

    return ImageArray;
}();

var img = new Image();
img.src = "broadway-tower.jpg";
img.onload = function () {
    var canvas = document.getElementById("original");
    var context = canvas.getContext("2d");
    context.canvas.height = img.height * (WIDTH / img.width);
    context.canvas.width = WIDTH;
    context.drawImage(img, 0, 0, context.canvas.width, context.canvas.height);
    var imageArray = new ImageArray(context.getImageData(0, 0, context.canvas.width, context.canvas.height).data, context.canvas.width, context.canvas.height);
    var energy = computeEnergy(imageArray);
    var energyCanvas = document.getElementById("energy");
    var energyContext = energyCanvas.getContext("2d");
    energyContext.canvas.height = img.height * (WIDTH / img.width);
    energyContext.canvas.width = WIDTH;
    energyContext.putImageData(energy.asImageArray().getImageData(), 0, 0);
    var seamCosts = computeSeamCosts(energy);
    var costs = seamCosts[0];
    var costsCanvas = document.getElementById("costs");
    var costsContext = costsCanvas.getContext("2d");
    costsContext.canvas.height = img.height * (WIDTH / img.width);
    costsContext.canvas.width = WIDTH;
    costsContext.putImageData(costs.asImageArray().getImageData(), 0, 0);
};

},{}]},{},[1])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvbWFpbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7OztBQ0FBLElBQU0sUUFBUSxJQUFkO0FBRUEsU0FBUyxLQUFULENBQWUsR0FBZixFQUE0QixLQUE1QixFQUFtRDtBQUMvQyxRQUFJLE1BQU0sTUFBTSxDQUFOLENBQVYsRUFBb0I7QUFDaEIsZUFBTyxNQUFNLENBQU4sQ0FBUDtBQUNIO0FBQ0QsUUFBSSxPQUFPLE1BQU0sQ0FBTixDQUFYLEVBQXFCO0FBQ2pCLGVBQU8sTUFBTSxDQUFOLENBQVA7QUFDSDtBQUNELFdBQU8sR0FBUDtBQUNIO0FBRUQsU0FBUyxNQUFULENBQWdCLE1BQWhCLEVBQWdDO0FBQzVCLFFBQUksTUFBTSxPQUFPLENBQVAsQ0FBVjtBQUNBLFFBQUksU0FBUyxDQUFiO0FBQ0EsU0FBSyxJQUFJLElBQUksQ0FBYixFQUFnQixJQUFJLE9BQU8sTUFBM0IsRUFBbUMsR0FBbkMsRUFBd0M7QUFDcEMsWUFBSSxPQUFPLENBQVAsSUFBWSxHQUFoQixFQUFxQjtBQUNqQixrQkFBTSxPQUFPLENBQVAsQ0FBTjtBQUNBLHFCQUFTLENBQVQ7QUFDSDtBQUNKO0FBQ0QsV0FBTyxNQUFQO0FBQ0g7O0lBRUssYTtBQUtGLDJCQUE0QixLQUE1QixFQUEyRCxNQUEzRCxFQUF5RTtBQUFBOztBQUE3QyxhQUFBLEtBQUEsR0FBQSxLQUFBO0FBQStCLGFBQUEsTUFBQSxHQUFBLE1BQUE7QUFIbkQsYUFBQSxHQUFBLEdBQWMsQ0FBZDtBQUNBLGFBQUEsR0FBQSxHQUFjLENBQWQ7QUFHSixhQUFLLElBQUwsR0FBWSxJQUFJLFdBQUosQ0FBZ0IsUUFBUSxNQUF4QixDQUFaO0FBQ0g7Ozs7NEJBRVUsRyxFQUFhLEcsRUFBVztBQUMvQixtQkFBTyxLQUFLLElBQUwsQ0FBVSxNQUFNLEtBQUssS0FBWCxHQUFtQixHQUE3QixDQUFQO0FBQ0g7Ozs0QkFFVSxHLEVB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QUE4QixJQUFJLE1BQUosSUFBYyxRQUFRLElBQUksS0FBMUIsQ0FBOUI7QUFDQSxrQkFBYyxNQUFkLENBQXFCLEtBQXJCLEdBQTZCLEtBQTdCO0FBQ0Esa0JBQWMsWUFBZCxDQUEyQixPQUFPLFlBQVAsR0FBc0IsWUFBdEIsRUFBM0IsRUFBaUUsQ0FBakUsRUFBb0UsQ0FBcEU7QUFFQSxRQUFNLFlBQVksaUJBQWlCLE1BQWpCLENBQWxCO0FBQ0EsUUFBTSxRQUFRLFVBQVUsQ0FBVixDQUFkO0FBQ0EsUUFBTSxjQUFjLFNBQVMsY0FBVCxDQUF3QixPQUF4QixDQUFwQjtBQUNBLFFBQU0sZUFBZSxZQUFZLFVBQVosQ0FBdUIsSUFBdkIsQ0FBckI7QUFDQSxpQkFBYSxNQUFiLENBQW9CLE1BQXBCLEdBQTZCLElBQUksTUFBSixJQUFjLFFBQVEsSUFBSSxLQUExQixDQUE3QjtBQUNBLGlCQUFhLE1BQWIsQ0FBb0IsS0FBcEIsR0FBNEIsS0FBNUI7QUFDQSxpQkFBYSxZQUFiLENBQTBCLE1BQU0sWUFBTixHQUFxQixZQUFyQixFQUExQixFQUErRCxDQUEvRCxFQUFrRSxDQUFsRTtBQUNILENBM0JEIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24oKXtmdW5jdGlvbiByKGUsbix0KXtmdW5jdGlvbiBvKGksZil7aWYoIW5baV0pe2lmKCFlW2ldKXt2YXIgYz1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlO2lmKCFmJiZjKXJldHVybiBjKGksITApO2lmKHUpcmV0dXJuIHUoaSwhMCk7dmFyIGE9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitpK1wiJ1wiKTt0aHJvdyBhLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsYX12YXIgcD1uW2ldPXtleHBvcnRzOnt9fTtlW2ldWzBdLmNhbGwocC5leHBvcnRzLGZ1bmN0aW9uKHIpe3ZhciBuPWVbaV1bMV1bcl07cmV0dXJuIG8obnx8cil9LHAscC5leHBvcnRzLHIsZSxuLHQpfXJldHVybiBuW2ldLmV4cG9ydHN9Zm9yKHZhciB1PVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmUsaT0wO2k8dC5sZW5ndGg7aSsrKW8odFtpXSk7cmV0dXJuIG99cmV0dXJuIHJ9KSgpIiwiY29uc3QgV0lEVEggPSAxMDAwO1xuXG5mdW5jdGlvbiBjbGFtcCh2YWw6IG51bWJlciwgcmFuZ2U6IFtudW1iZXIsIG51bWJlcl0pOiBudW1iZXIge1xuICAgIGlmICh2YWwgPCByYW5nZVswXSkge1xuICAgICAgICByZXR1cm4gcmFuZ2VbMF07XG4gICAgfVxuICAgIGlmICh2YWwgPj0gcmFuZ2VbMV0pIHtcbiAgICAgICAgcmV0dXJuIHJhbmdlWzFdO1xuICAgIH1cbiAgICByZXR1cm4gdmFsO1xufVxuXG5mdW5jdGlvbiBhcmdtaW4odmFsdWVzOiBudW1iZXJbXSk6IG51bWJlciB7XG4gICAgbGV0IG1pbiA9IHZhbHVlc1swXTtcbiAgICBsZXQgbWluSWR4ID0gMDtcbiAgICBmb3IgKGxldCBpID0gMTsgaSA8IHZhbHVlcy5sZW5ndGg7IGkrKykge1xuICAgICAgICBpZiAodmFsdWVzW2ldIDwgbWluKSB7XG4gICAgICAgICAgICBtaW4gPSB2YWx1ZXNbaV07XG4gICAgICAgICAgICBtaW5JZHggPSBpO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBtaW5JZHg7XG59XG5cbmNsYXNzIFVpbnQxNkFycmF5MkQge1xuICAgIHByaXZhdGUgcmVhZG9ubHkgZGF0YTogVWludDE2QXJyYXk7XG4gICAgcHJpdmF0ZSBtaW46IG51bWJlciA9IDA7XG4gICAgcHJpdmF0ZSBtYXg6IG51bWJlciA9IDA7XG5cbiAgICBjb25zdHJ1Y3RvcihwdWJsaWMgcmVhZG9ubHkgd2lkdGg6IG51bWJlciwgcHVibGljIHJlYWRvbmx5IGhlaWdodDogbnVtYmVyKSB7XG4gICAgICAgIHRoaXMuZGF0YSA9IG5ldyBVaW50MTZBcnJheSh3aWR0aCAqIGhlaWdodCk7XG4gICAgfVxuXG4gICAgcHVibGljIGdldChyb3c6IG51bWJlciwgY29sOiBudW1iZXIpOiBudW1iZXIge1xuICAgICAgICByZXR1cm4gdGhpcy5kYXRhW3JvdyAqIHRoaXMud2lkdGggKyBjb2xdO1xuICAgIH1cblxuICAgIHB1YmxpYyBzZXQocm93OiBudW1iZXIsIGNvbDogbnVtYmVyLCB2YWw6IG51bWJlcik6IHZvaWQge1xuICAgICAgICB0aGlzLm1pbiA9IE1hdGgubWluKHRoaXMubWluLCB2YWwpO1xuICAgICAgICB0aGlzLm1heCA9IE1hdGgubWF4KHRoaXMubWF4LCB2YWwpO1xuICAgICAgICB0aGlzLmRhdGFbcm93ICogdGhpcy53aWR0aCArIGNvbF0gPSB2YWw7XG4gICAgfVxuXG4gICAgcHVibGljIGFzSW1hZ2VBcnJheSgpOiBJbWFnZUFycmF5IHtcbiAgICAgICAgbGV0IHJlc3VsdCA9IG5ldyBJbWFnZUFycmF5KFxuICAgICAgICAgICAgbmV3IFVpbnQ4Q2xhbXBlZEFycmF5KHRoaXMud2lkdGggKiB0aGlzLmhlaWdodCAqIDQpLFxuICAgICAgICAgICAgdGhpcy53aWR0aCwgdGhpcy5oZWlnaHQpO1xuICAgICAgICBmb3IgKGxldCByb3cgPSAwOyByb3cgPCB0aGlzLmhlaWdodDsgcm93KyspIHtcbiAgICAgICAgICAgIGZvciAobGV0IGNvbCA9IDA7IGNvbCA8IHRoaXMud2lkdGg7IGNvbCsrKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgY29sb3IgPSAyNTUgLSB0aGlzLmdldChyb3csIGNvbCkgLyB0aGlzLm1heCAqIDI1NTtcbiAgICAgICAgICAgICAgICByZXN1bHQuc2V0KHJvdywgY29sLCBbY29sb3IsIGNvbG9yLCBjb2xvcl0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBjb21wdXRlRW5lcmd5KGRhdGE6IEltYWdlQXJyYXkpOiBVaW50MTZBcnJheTJEIHtcbiAgICBsZXQgZW5lcmd5ID0gbmV3IFVpbnQxNkFycmF5MkQoZGF0YS53aWR0aCwgZGF0YS5oZWlnaHQpO1xuICAgIGZvciAobGV0IHJvdyA9IDA7IHJvdyA8IGRhdGEuaGVpZ2h0OyByb3crKykge1xuICAgICAgICBmb3IgKGxldCBjb2wgPSAwOyBjb2wgPCBkYXRhLndpZHRoOyBjb2wrKykge1xuICAgICAgICAgICAgY29uc3QgbGVmdFJnYiA9IGRhdGEuZ2V0Q2xhbXBlZChyb3csIGNvbCAtIDEpO1xuICAgICAgICAgICAgY29uc3QgcmlnaHRSZ2IgPSBkYXRhLmdldENsYW1wZWQocm93LCBjb2wgKyAxKTtcbiAgICAgICAgICAgIGxldCBob3Jpem9udGFsID0gMDtcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbGVmdFJnYi5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIGhvcml6b250YWwgKz0gKGxlZnRSZ2JbaV0gLSByaWdodFJnYltpXSkgKiogMjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3QgdXBSZ2IgPSBkYXRhLmdldENsYW1wZWQocm93IC0gMSwgY29sKTtcbiAgICAgICAgICAgIGNvbnN0IGRvd25SZ2IgPSBkYXRhLmdldENsYW1wZWQocm93ICsgMSwgY29sKTtcbiAgICAgICAgICAgIGxldCB2ZXJ0aWNhbCA9IDA7XG4gICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHVwUmdiLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgdmVydGljYWwgKz0gKHVwUmdiW2ldIC0gZG93blJnYltpXSkgKiogMjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgZW5lcmd5LnNldChyb3csIGNvbCwgaG9yaXpvbnRhbCArIHZlcnRpY2FsKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZW5lcmd5O1xufVxuXG5mdW5jdGlvbiBjb21wdXRlU2VhbUNvc3RzKGVuZXJneTogVWludDE2QXJyYXkyRCk6IFtVaW50MTZBcnJheTJELCBVaW50MTZBcnJheTJEXSB7XG4gICAgbGV0IGNvc3RzID0gbmV3IFVpbnQxNkFycmF5MkQoZW5lcmd5LndpZHRoLCBlbmVyZ3kuaGVpZ2h0KTtcbiAgICBsZXQgY29zdEluZGljZXMgPSBuZXcgVWludDE2QXJyYXkyRChlbmVyZ3kud2lkdGgsIGVuZXJneS5oZWlnaHQpO1xuXG4gICAgZm9yIChsZXQgY29sID0gMDsgY29sIDwgY29zdHMud2lkdGg7IGNvbCsrKSB7XG4gICAgICAgIGNvc3RzLnNldCgwLCBjb2wsIGVuZXJneS5nZXQoMCwgY29sKSk7XG4gICAgICAgIGNvc3RJbmRpY2VzLnNldCgwLCBjb2wsIC0xKTtcbiAgICB9XG4gICAgZm9yIChsZXQgcm93ID0gMTsgcm93IDwgY29zdHMuaGVpZ2h0OyByb3crKykge1xuICAgICAgICBmb3IgKGxldCBjb2wgPSAwOyBjb2wgPCBjb3N0cy53aWR0aDsgY29sKyspIHtcbiAgICAgICAgICAgIGNvbnN0IGNhbmRpZGF0ZXMgPSBbXG4gICAgICAgICAgICAgICAgY29zdHMuZ2V0KHJvdyAtIDEsIGNsYW1wKGNvbCAtIDEsIFswLCBjb3N0cy53aWR0aCAtIDFdKSksXG4gICAgICAgICAgICAgICAgY29zdHMuZ2V0KHJvdyAtIDEsIGNvbCksXG4gICAgICAgICAgICAgICAgY29zdHMuZ2V0KHJvdyAtIDEsIGNsYW1wKGNvbCArIDEsIFswLCBjb3N0cy53aWR0aCAtIDFdKSksXG4gICAgICAgICAgICBdXG4gICAgICAgICAgICBjb3N0cy5zZXQocm93LCBjb2wsIGVuZXJneS5nZXQocm93LCBjb2wpICsgTWF0aC5taW4oLi4uY2FuZGlkYXRlcykpO1xuICAgICAgICAgICAgY29zdEluZGljZXMuc2V0KHJvdywgY29sLFxuICAgICAgICAgICAgICAgIGNvbCArIGFyZ21pbihjYW5kaWRhdGVzKSAtIChjb2wgPT0gMCA/IDAgOiAxKSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIFtjb3N0cywgY29zdEluZGljZXNdO1xufVxuXG5jbGFzcyBJbWFnZUFycmF5IHtcbiAgICBjb25zdHJ1Y3RvcihcbiAgICAgICAgcHJpdmF0ZSBkYXRhOiBVaW50OENsYW1wZWRBcnJheSxcbiAgICAgICAgcHVibGljIHJlYWRvbmx5IHdpZHRoOiBudW1iZXIsXG4gICAgICAgIHB1YmxpYyByZWFkb25seSBoZWlnaHQ6IG51bWJlcikgeyB9XG5cbiAgICBwdWJsaWMgZ2V0KHJvdzogbnVtYmVyLCBjb2w6IG51bWJlcik6IFtcbiAgICAgICAgbnVtYmVyLCBudW1iZXIsIG51bWJlcl0ge1xuICAgICAgICBsZXQgc3RhcnQgPSB0aGlzLmdldE9mZnNldChyb3csIGNvbCk7XG4gICAgICAgIHJldHVybiBbdGhpcy5kYXRhW3N0YXJ0XSwgdGhpcy5kYXRhW3N0YXJ0ICsgMV0sIHRoaXMuZGF0YVtzdGFydCArIDJdXTtcbiAgICB9XG5cbiAgICBwdWJsaWMgZ2V0Q2xhbXBlZChyb3c6IG51bWJlciwgY29sOiBudW1iZXIpOiBbbnVtYmVyLCBudW1iZXIsIG51bWJlcl0ge1xuICAgICAgICByZXR1cm4gdGhpcy5nZXQoXG4gICAgICAgICAgICBjbGFtcChyb3csIFswLCB0aGlzLmhlaWdodCAtIDFdKSxcbiAgICAgICAgICAgIGNsYW1wKGNvbCwgWzAsIHRoaXMud2lkdGggLSAxXSkpO1xuICAgIH1cblxuICAgIHB1YmxpYyBzZXQocm93OiBudW1iZXIsIGNvbDogbnVtYmVyLCByZ2I6IFtudW1iZXIsIG51bWJlciwgbnVtYmVyXSk6IHZvaWQge1xuICAgICAgICBsZXQgc3RhcnQgPSB0aGlzLmdldE9mZnNldChyb3csIGNvbCk7XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgcmdiLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICB0aGlzLmRhdGFbc3RhcnQgKyBpXSA9IHJnYltpXTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmRhdGFbc3RhcnQgKyAzXSA9IDI1NTsgLy8gYWxwaGFcbiAgICB9XG5cbiAgICBwdWJsaWMgZ2V0SW1hZ2VEYXRhKCk6IEltYWdlRGF0YSB7XG4gICAgICAgIHJldHVybiBuZXcgSW1hZ2VEYXRhKHRoaXMuZGF0YSwgdGhpcy53aWR0aCwgdGhpcy5oZWlnaHQpO1xuICAgIH1cblxuICAgIHByaXZhdGUgZ2V0T2Zmc2V0KHJvdzogbnVtYmVyLCBjb2w6IG51bWJlcik6IG51bWJlciB7XG4gICAgICAgIGlmIChyb3cgPCAwIHx8IHJvdyA+PSB0aGlzLmhlaWdodCB8fCBjb2wgPCAwIHx8IGNvbCA+PSB0aGlzLndpZHRoKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcihcbiAgICAgICAgICAgICAgICBgcm93ICgke3Jvd30pIGFuZCBjb2wgKCR7Y29sfSkgbXVzdCBiZSBpbiByYW5nZXMgYCArXG4gICAgICAgICAgICAgICAgYFswLCAke3RoaXMuaGVpZ2h0fSkgYW5kIFswLCAke3RoaXMud2lkdGh9KSwgcmVzcGVjdGl2ZWx5LmApO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiByb3cgKiB0aGlzLndpZHRoICogNCArIGNvbCAqIDQ7XG4gICAgfVxufVxuXG5cbmNvbnN0IGltZyA9IG5ldyBJbWFnZSgpO1xuaW1nLnNyYyA9IFwiYnJvYWR3YXktdG93ZXIuanBnXCI7XG5pbWcub25sb2FkID0gZnVuY3Rpb24gKCkge1xuICAgIGNvbnN0IGNhbnZhczogSFRNTENhbnZhc0VsZW1lbnQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIm9yaWdpbmFsXCIpIGFzIEhUTUxDYW52YXNFbGVtZW50O1xuICAgIGNvbnN0IGNvbnRleHQgPSBjYW52YXMuZ2V0Q29udGV4dChcIjJkXCIpO1xuICAgIGNvbnRleHQuY2FudmFzLmhlaWdodCA9IGltZy5oZWlnaHQgKiAoV0lEVEggLyBpbWcud2lkdGgpO1xuICAgIGNvbnRleHQuY2FudmFzLndpZHRoID0gV0lEVEg7XG5cbiAgICBjb250ZXh0LmRyYXdJbWFnZShpbWcsIDAsIDAsIGNvbnRleHQuY2FudmFzLndpZHRoLCBjb250ZXh0LmNhbnZhcy5oZWlnaHQpO1xuICAgIGNvbnN0IGltYWdlQXJyYXkgPSBuZXcgSW1hZ2VBcnJheShcbiAgICAgICAgY29udGV4dC5nZXRJbWFnZURhdGEoMCwgMCwgY29udGV4dC5jYW52YXMud2lkdGgsIGNvbnRleHQuY2FudmFzLmhlaWdodCkuZGF0YSxcbiAgICAgICAgY29udGV4dC5jYW52YXMud2lkdGgsXG4gICAgICAgIGNvbnRleHQuY2FudmFzLmhlaWdodFxuICAgIClcblxuICAgIGNvbnN0IGVuZXJneSA9IGNvbXB1dGVFbmVyZ3koaW1hZ2VBcnJheSk7XG4gICAgY29uc3QgZW5lcmd5Q2FudmFzID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJlbmVyZ3lcIikgYXMgSFRNTENhbnZhc0VsZW1lbnQ7XG4gICAgY29uc3QgZW5lcmd5Q29udGV4dCA9IGVuZXJneUNhbnZhcy5nZXRDb250ZXh0KFwiMmRcIik7XG4gICAgZW5lcmd5Q29udGV4dC5jYW52YXMuaGVpZ2h0ID0gaW1nLmhlaWdodCAqIChXSURUSCAvIGltZy53aWR0aCk7XG4gICAgZW5lcmd5Q29udGV4dC5jYW52YXMud2lkdGggPSBXSURUSDtcbiAgICBlbmVyZ3lDb250ZXh0LnB1dEltYWdlRGF0YShlbmVyZ3kuYXNJbWFnZUFycmF5KCkuZ2V0SW1hZ2VEYXRhKCksIDAsIDApO1xuXG4gICAgY29uc3Qgc2VhbUNvc3RzID0gY29tcHV0ZVNlYW1Db3N0cyhlbmVyZ3kpO1xuICAgIGNvbnN0IGNvc3RzID0gc2VhbUNvc3RzWzBdO1xuICAgIGNvbnN0IGNvc3RzQ2FudmFzID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJjb3N0c1wiKSBhcyBIVE1MQ2FudmFzRWxlbWVudDtcbiAgICBjb25zdCBjb3N0c0NvbnRleHQgPSBjb3N0c0NhbnZhcy5nZXRDb250ZXh0KFwiMmRcIik7XG4gICAgY29zdHNDb250ZXh0LmNhbnZhcy5oZWlnaHQgPSBpbWcuaGVpZ2h0ICogKFdJRFRIIC8gaW1nLndpZHRoKTtcbiAgICBjb3N0c0NvbnRleHQuY2FudmFzLndpZHRoID0gV0lEVEg7XG4gICAgY29zdHNDb250ZXh0LnB1dEltYWdlRGF0YShjb3N0cy5hc0ltYWdlQXJyYXkoKS5nZXRJbWFnZURhdGEoKSwgMCwgMCk7XG59O1xuXG5cblxuIl19
