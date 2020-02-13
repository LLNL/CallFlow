// String object
String.prototype.trunc = String.prototype.trunc ||
    function (n) {
        return (this.length > n) ? this.substr(0, n - 1) + '...' : this;
    };

// Array object
Array.prototype.SumArray = function (arr) {
    var sum = [];
    if (arr != null && this.length == arr.length) {
        for (var i = 0; i < arr.length; i++) {
            sum.push(this[i] + arr[i]);
        }
    }

    return sum;
}

/** Deep copy the given object considering circular structure.
 **This function caches all nested objects and its copies.*If it detects
 circular structure, use cached copy to avoid infinite loop.*
    *
    @param {
        *
    }
obj
    *
    @param {
        Array < Object >
    }
cache
    *
    @return {
        *
    }
    */
export function deepCopy(obj, cache = []) {
    // just return if obj is immutable value
    if (obj === null || typeof obj !== 'object') {
        return obj
    }

    // if obj is hit, it is in circular structure
    const hit = find(cache, c => c.original === obj)
    if (hit) {
        return hit.copy
    }

    const copy = Array.isArray(obj) ? [] : {}
    // put the copy into cache at first
    // because we want to refer it in recursive deepCopy
    cache.push({
        original: obj,
        copy
    })

    Object.keys(obj).forEach(key => {
        copy[key] = deepCopy(obj[key], cache)
    })

    return copy
}

export function checkSocketConnection(socket){
    	// Check socket connection.
		console.log('Socket connection check-1 : ', socket.connected);
		socket.on('connect', function () {
			console.log('Socket connection check 2: ', socket.connected);
		});

		// Raise an exception if the socket fails to connect
		socket.on('connect_error', function (err) {
			console.log('Socket error: ', err);
		});
}