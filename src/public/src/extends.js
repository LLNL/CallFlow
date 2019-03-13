String.prototype.trunc = String.prototype.trunc ||
    function(n){
	return (this.length > n) ? this.substr(0, n-1) + '...' : this;
    };

Array.prototype.SumArray = function (arr) {
    var sum = [];
    if (arr != null && this.length == arr.length) {
	for (var i = 0; i < arr.length; i++) {
	    sum.push(this[i] + arr[i]);
	}
    }

    return sum;
}
