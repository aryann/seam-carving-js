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
    var costsCanvas = document.getElementById("costs");
};

},{}]},{},[1])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvbWFpbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7OztBQ0FBLElBQU0sUUFBUSxJQUFkO0FBRUEsU0FBUyxLQUFULENBQWUsR0FBZixFQUE0QixLQUE1QixFQUFtRDtBQUMvQyxRQUFJLE1BQU0sTUFBTSxDQUFOLENBQVYsRUFBb0I7QUFDaEIsZUFBTyxNQUFNLENBQU4sQ0FBUDtBQUNIO0FBQ0QsUUFBSSxPQUFPLE1BQU0sQ0FBTixDQUFYLEVBQXFCO0FBQ2pCLGVBQU8sTUFBTSxDQUFOLENBQVA7QUFDSDtBQUNELFdBQU8sR0FBUDtBQUNIOztJQUVLLGE7QUFLRiwyQkFBNEIsS0FBNUIsRUFBMkQsTUFBM0QsRUFBeUU7QUFBQTs7QUFBN0MsYUFBQSxLQUFBLEdBQUEsS0FBQTtBQUErQixhQUFBLE1BQUEsR0FBQSxNQUFBO0FBSG5ELGFBQUEsR0FBQSxHQUFjLENBQWQ7QUFDQSxhQUFBLEdBQUEsR0FBYyxDQUFkO0FBR0osYUFBSyxJQUFMLEdBQVksSUFBSSxXQUFKLENBQWdCLFFBQVEsTUFBeEIsQ0FBWjtBQUNIOzs7OzRCQUVVLEcsRUFBYSxHLEVBQVc7QUFDL0IsbUJBQU8sS0FBSyxJQUFMLENBQVUsTUFBTSxLQUFLLEtBQVgsR0FBbUIsR0FBN0IsQ0FBUDtBQUNIOzs7NEJBRVUsRyxFQUFhLEcsRUFBYSxHLEVBQVc7QUFDNUMsaUJBQUssR0FBTCxHQUFXLEtBQUssR0FBTCxDQUFTLEtBQUssR0FBZCxFQUFtQixHQUFuQixDQUFYO0FBQ0EsaUJBQUssR0FBTCxHQUFXLEtBQUssR0FBTCxDQUFTLEtBQUssR0FBZCxFQUFtQixHQUFuQixDQUFYO0FBQ0EsaUJBQUssSUFBTCxDQUFVLE1BQU0sS0FBSyxLQUFYLEdBQW1CLEdBQTdCLElBQW9DLEdBQXBDO0FBQ0g7Ozt1Q0FFa0I7QUFDZixnQkFBSSxTQUFTLElBQUksVUFBSixDQUNULElBQUksaUJBQUos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LEtBQTFCLENBQXhCO0FBQ0EsWUFBUSxNQUFSLENBQWUsS0FBZixHQUF1QixLQUF2QjtBQUVBLFlBQVEsU0FBUixDQUFrQixHQUFsQixFQUF1QixDQUF2QixFQUEwQixDQUExQixFQUE2QixRQUFRLE1BQVIsQ0FBZSxLQUE1QyxFQUFtRCxRQUFRLE1BQVIsQ0FBZSxNQUFsRTtBQUNBLFFBQUksYUFBYSxJQUFJLFVBQUosQ0FDYixRQUFRLFlBQVIsQ0FBcUIsQ0FBckIsRUFBd0IsQ0FBeEIsRUFBMkIsUUFBUSxNQUFSLENBQWUsS0FBMUMsRUFBaUQsUUFBUSxNQUFSLENBQWUsTUFBaEUsRUFBd0UsSUFEM0QsRUFFYixRQUFRLE1BQVIsQ0FBZSxLQUZGLEVBR2IsUUFBUSxNQUFSLENBQWUsTUFIRixDQUFqQjtBQU1BLFFBQUksU0FBUyxjQUFjLFVBQWQsQ0FBYjtBQUVBLFFBQU0sZUFBZSxTQUFTLGNBQVQsQ0FBd0IsUUFBeEIsQ0FBckI7QUFDQSxRQUFNLGdCQUFnQixhQUFhLFVBQWIsQ0FBd0IsSUFBeEIsQ0FBdEI7QUFDQSxrQkFBYyxNQUFkLENBQXFCLE1BQXJCLEdBQThCLElBQUksTUFBSixJQUFjLFFBQVEsSUFBSSxLQUExQixDQUE5QjtBQUNBLGtCQUFjLE1BQWQsQ0FBcUIsS0FBckIsR0FBNkIsS0FBN0I7QUFDQSxrQkFBYyxZQUFkLENBQTJCLE9BQU8sWUFBUCxHQUFzQixZQUF0QixFQUEzQixFQUFpRSxDQUFqRSxFQUFvRSxDQUFwRTtBQUVBLFFBQU0sY0FBYyxTQUFTLGNBQVQsQ0FBd0IsT0FBeEIsQ0FBcEI7QUFDSCxDQXRCRCIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uKCl7ZnVuY3Rpb24gcihlLG4sdCl7ZnVuY3Rpb24gbyhpLGYpe2lmKCFuW2ldKXtpZighZVtpXSl7dmFyIGM9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZTtpZighZiYmYylyZXR1cm4gYyhpLCEwKTtpZih1KXJldHVybiB1KGksITApO3ZhciBhPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIraStcIidcIik7dGhyb3cgYS5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGF9dmFyIHA9bltpXT17ZXhwb3J0czp7fX07ZVtpXVswXS5jYWxsKHAuZXhwb3J0cyxmdW5jdGlvbihyKXt2YXIgbj1lW2ldWzFdW3JdO3JldHVybiBvKG58fHIpfSxwLHAuZXhwb3J0cyxyLGUsbix0KX1yZXR1cm4gbltpXS5leHBvcnRzfWZvcih2YXIgdT1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlLGk9MDtpPHQubGVuZ3RoO2krKylvKHRbaV0pO3JldHVybiBvfXJldHVybiByfSkoKSIsImNvbnN0IFdJRFRIID0gMTAwMDtcblxuZnVuY3Rpb24gY2xhbXAodmFsOiBudW1iZXIsIHJhbmdlOiBbbnVtYmVyLCBudW1iZXJdKTogbnVtYmVyIHtcbiAgICBpZiAodmFsIDwgcmFuZ2VbMF0pIHtcbiAgICAgICAgcmV0dXJuIHJhbmdlWzBdO1xuICAgIH1cbiAgICBpZiAodmFsID49IHJhbmdlWzFdKSB7XG4gICAgICAgIHJldHVybiByYW5nZVsxXTtcbiAgICB9XG4gICAgcmV0dXJuIHZhbDtcbn1cblxuY2xhc3MgVWludDE2QXJyYXkyRCB7XG4gICAgcHJpdmF0ZSByZWFkb25seSBkYXRhOiBVaW50MTZBcnJheTtcbiAgICBwcml2YXRlIG1pbjogbnVtYmVyID0gMDtcbiAgICBwcml2YXRlIG1heDogbnVtYmVyID0gMDtcblxuICAgIGNvbnN0cnVjdG9yKHB1YmxpYyByZWFkb25seSB3aWR0aDogbnVtYmVyLCBwdWJsaWMgcmVhZG9ubHkgaGVpZ2h0OiBudW1iZXIpIHtcbiAgICAgICAgdGhpcy5kYXRhID0gbmV3IFVpbnQxNkFycmF5KHdpZHRoICogaGVpZ2h0KTtcbiAgICB9XG5cbiAgICBwdWJsaWMgZ2V0KHJvdzogbnVtYmVyLCBjb2w6IG51bWJlcik6IG51bWJlciB7XG4gICAgICAgIHJldHVybiB0aGlzLmRhdGFbcm93ICogdGhpcy53aWR0aCArIGNvbF07XG4gICAgfVxuXG4gICAgcHVibGljIHNldChyb3c6IG51bWJlciwgY29sOiBudW1iZXIsIHZhbDogbnVtYmVyKTogdm9pZCB7XG4gICAgICAgIHRoaXMubWluID0gTWF0aC5taW4odGhpcy5taW4sIHZhbCk7XG4gICAgICAgIHRoaXMubWF4ID0gTWF0aC5tYXgodGhpcy5tYXgsIHZhbCk7XG4gICAgICAgIHRoaXMuZGF0YVtyb3cgKiB0aGlzLndpZHRoICsgY29sXSA9IHZhbDtcbiAgICB9XG5cbiAgICBwdWJsaWMgYXNJbWFnZUFycmF5KCk6IEltYWdlQXJyYXkge1xuICAgICAgICBsZXQgcmVzdWx0ID0gbmV3IEltYWdlQXJyYXkoXG4gICAgICAgICAgICBuZXcgVWludDhDbGFtcGVkQXJyYXkodGhpcy53aWR0aCAqIHRoaXMuaGVpZ2h0ICogNCksXG4gICAgICAgICAgICB0aGlzLndpZHRoLCB0aGlzLmhlaWdodCk7XG4gICAgICAgIGZvciAobGV0IHJvdyA9IDA7IHJvdyA8IHRoaXMuaGVpZ2h0OyByb3crKykge1xuICAgICAgICAgICAgZm9yIChsZXQgY29sID0gMDsgY29sIDwgdGhpcy53aWR0aDsgY29sKyspIHtcbiAgICAgICAgICAgICAgICBjb25zdCBjb2xvciA9IDI1NSAtIHRoaXMuZ2V0KHJvdywgY29sKSAvIHRoaXMubWF4ICogMjU1O1xuICAgICAgICAgICAgICAgIHJlc3VsdC5zZXQocm93LCBjb2wsIFtjb2xvciwgY29sb3IsIGNvbG9yXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGNvbXB1dGVFbmVyZ3koZGF0YTogSW1hZ2VBcnJheSk6IFVpbnQxNkFycmF5MkQge1xuICAgIGxldCBlbmVyZ3kgPSBuZXcgVWludDE2QXJyYXkyRChkYXRhLndpZHRoLCBkYXRhLmhlaWdodCk7XG4gICAgZm9yIChsZXQgcm93ID0gMDsgcm93IDwgZGF0YS5oZWlnaHQ7IHJvdysrKSB7XG4gICAgICAgIGZvciAobGV0IGNvbCA9IDA7IGNvbCA8IGRhdGEud2lkdGg7IGNvbCsrKSB7XG4gICAgICAgICAgICBjb25zdCBsZWZ0UmdiID0gZGF0YS5nZXRDbGFtcGVkKHJvdywgY29sIC0gMSk7XG4gICAgICAgICAgICBjb25zdCByaWdodFJnYiA9IGRhdGEuZ2V0Q2xhbXBlZChyb3csIGNvbCArIDEpO1xuICAgICAgICAgICAgbGV0IGhvcml6b250YWwgPSAwO1xuICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBsZWZ0UmdiLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgaG9yaXpvbnRhbCArPSAobGVmdFJnYltpXSAtIHJpZ2h0UmdiW2ldKSAqKiAyO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCB1cFJnYiA9IGRhdGEuZ2V0Q2xhbXBlZChyb3cgLSAxLCBjb2wpO1xuICAgICAgICAgICAgY29uc3QgZG93blJnYiA9IGRhdGEuZ2V0Q2xhbXBlZChyb3cgKyAxLCBjb2wpO1xuICAgICAgICAgICAgbGV0IHZlcnRpY2FsID0gMDtcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdXBSZ2IubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICB2ZXJ0aWNhbCArPSAodXBSZ2JbaV0gLSBkb3duUmdiW2ldKSAqKiAyO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBlbmVyZ3kuc2V0KHJvdywgY29sLCBob3Jpem9udGFsICsgdmVydGljYWwpO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBlbmVyZ3k7XG59XG5cblxuY2xhc3MgSW1hZ2VBcnJheSB7XG4gICAgY29uc3RydWN0b3IoXG4gICAgICAgIHByaXZhdGUgZGF0YTogVWludDhDbGFtcGVkQXJyYXksXG4gICAgICAgIHB1YmxpYyByZWFkb25seSB3aWR0aDogbnVtYmVyLFxuICAgICAgICBwdWJsaWMgcmVhZG9ubHkgaGVpZ2h0OiBudW1iZXIpIHsgfVxuXG4gICAgcHVibGljIGdldChyb3c6IG51bWJlciwgY29sOiBudW1iZXIpOiBbXG4gICAgICAgIG51bWJlciwgbnVtYmVyLCBudW1iZXJdIHtcbiAgICAgICAgbGV0IHN0YXJ0ID0gdGhpcy5nZXRPZmZzZXQocm93LCBjb2wpO1xuICAgICAgICByZXR1cm4gW3RoaXMuZGF0YVtzdGFydF0sIHRoaXMuZGF0YVtzdGFydCArIDFdLCB0aGlzLmRhdGFbc3RhcnQgKyAyXV07XG4gICAgfVxuXG4gICAgcHVibGljIGdldENsYW1wZWQocm93OiBudW1iZXIsIGNvbDogbnVtYmVyKTogW251bWJlciwgbnVtYmVyLCBudW1iZXJdIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuZ2V0KFxuICAgICAgICAgICAgY2xhbXAocm93LCBbMCwgdGhpcy5oZWlnaHQgLSAxXSksXG4gICAgICAgICAgICBjbGFtcChjb2wsIFswLCB0aGlzLndpZHRoIC0gMV0pKTtcbiAgICB9XG5cbiAgICBwdWJsaWMgc2V0KHJvdzogbnVtYmVyLCBjb2w6IG51bWJlciwgcmdiOiBbbnVtYmVyLCBudW1iZXIsIG51bWJlcl0pOiB2b2lkIHtcbiAgICAgICAgbGV0IHN0YXJ0ID0gdGhpcy5nZXRPZmZzZXQocm93LCBjb2wpO1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHJnYi5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdGhpcy5kYXRhW3N0YXJ0ICsgaV0gPSByZ2JbaV07XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5kYXRhW3N0YXJ0ICsgM10gPSAyNTU7IC8vIGFscGhhXG4gICAgfVxuXG4gICAgcHVibGljIGdldEltYWdlRGF0YSgpOiBJbWFnZURhdGEge1xuICAgICAgICByZXR1cm4gbmV3IEltYWdlRGF0YSh0aGlzLmRhdGEsIHRoaXMud2lkdGgsIHRoaXMuaGVpZ2h0KTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGdldE9mZnNldChyb3c6IG51bWJlciwgY29sOiBudW1iZXIpOiBudW1iZXIge1xuICAgICAgICBpZiAocm93IDwgMCB8fCByb3cgPj0gdGhpcy5oZWlnaHQgfHwgY29sIDwgMCB8fCBjb2wgPj0gdGhpcy53aWR0aCkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoXG4gICAgICAgICAgICAgICAgYHJvdyAoJHtyb3d9KSBhbmQgY29sICgke2NvbH0pIG11c3QgYmUgaW4gcmFuZ2VzIGAgK1xuICAgICAgICAgICAgICAgIGBbMCwgJHt0aGlzLmhlaWdodH0pIGFuZCBbMCwgJHt0aGlzLndpZHRofSksIHJlc3BlY3RpdmVseS5gKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcm93ICogdGhpcy53aWR0aCAqIDQgKyBjb2wgKiA0O1xuICAgIH1cbn1cblxuXG5jb25zdCBpbWcgPSBuZXcgSW1hZ2UoKTtcbmltZy5zcmMgPSBcImJyb2Fkd2F5LXRvd2VyLmpwZ1wiO1xuaW1nLm9ubG9hZCA9IGZ1bmN0aW9uICgpIHtcbiAgICBjb25zdCBjYW52YXM6IEhUTUxDYW52YXNFbGVtZW50ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJvcmlnaW5hbFwiKSBhcyBIVE1MQ2FudmFzRWxlbWVudDtcbiAgICBjb25zdCBjb250ZXh0ID0gY2FudmFzLmdldENvbnRleHQoXCIyZFwiKTtcbiAgICBjb250ZXh0LmNhbnZhcy5oZWlnaHQgPSBpbWcuaGVpZ2h0ICogKFdJRFRIIC8gaW1nLndpZHRoKTtcbiAgICBjb250ZXh0LmNhbnZhcy53aWR0aCA9IFdJRFRIO1xuXG4gICAgY29udGV4dC5kcmF3SW1hZ2UoaW1nLCAwLCAwLCBjb250ZXh0LmNhbnZhcy53aWR0aCwgY29udGV4dC5jYW52YXMuaGVpZ2h0KTtcbiAgICBsZXQgaW1hZ2VBcnJheSA9IG5ldyBJbWFnZUFycmF5KFxuICAgICAgICBjb250ZXh0LmdldEltYWdlRGF0YSgwLCAwLCBjb250ZXh0LmNhbnZhcy53aWR0aCwgY29udGV4dC5jYW52YXMuaGVpZ2h0KS5kYXRhLFxuICAgICAgICBjb250ZXh0LmNhbnZhcy53aWR0aCxcbiAgICAgICAgY29udGV4dC5jYW52YXMuaGVpZ2h0XG4gICAgKVxuXG4gICAgbGV0IGVuZXJneSA9IGNvbXB1dGVFbmVyZ3koaW1hZ2VBcnJheSk7XG5cbiAgICBjb25zdCBlbmVyZ3lDYW52YXMgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImVuZXJneVwiKSBhcyBIVE1MQ2FudmFzRWxlbWVudDtcbiAgICBjb25zdCBlbmVyZ3lDb250ZXh0ID0gZW5lcmd5Q2FudmFzLmdldENvbnRleHQoXCIyZFwiKTtcbiAgICBlbmVyZ3lDb250ZXh0LmNhbnZhcy5oZWlnaHQgPSBpbWcuaGVpZ2h0ICogKFdJRFRIIC8gaW1nLndpZHRoKTtcbiAgICBlbmVyZ3lDb250ZXh0LmNhbnZhcy53aWR0aCA9IFdJRFRIO1xuICAgIGVuZXJneUNvbnRleHQucHV0SW1hZ2VEYXRhKGVuZXJneS5hc0ltYWdlQXJyYXkoKS5nZXRJbWFnZURhdGEoKSwgMCwgMCk7XG5cbiAgICBjb25zdCBjb3N0c0NhbnZhcyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiY29zdHNcIikgYXMgSFRNTENhbnZhc0VsZW1lbnQ7XG59O1xuXG5cblxuIl19
