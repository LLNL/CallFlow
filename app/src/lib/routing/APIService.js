/**
 * Copyright 2017-2021 Lawrence Livermore National Security, LLC and other
 * CallFlow Project Developers. See the top-level LICENSE file for details.
 *
 * SPDX-License-Identifier: MIT
 */

class APIService {
	/**
     * API service for CallFlow.
	 * Two kinds of requests are supported, GET and POST.
	 * fetch API is being used to trigger the requests.
     */
	constructor() {
		this.url = "http://localhost:5000/"; // For local
	}
  
	/**
     * Force to reject the promise in the specified seconds.
     * @param {Numeric} ms milliseconds before rejecting the promise
     * @param {Promise} promise Promise of interest.
     * @return {Promise} A promise with timeout.
     */
	timeoutPromise(ms, promise) {
		return new Promise((resolve, reject) => {
			const timeoutId = setTimeout(() => {
				reject(new Error("Promise times out"));
			}, ms);
			promise.then(
				(res) => {
					clearTimeout(timeoutId);
					resolve(res);
				},
				(err) => {
					clearTimeout(timeoutId);
					reject(err);
				},
			);
		});
	}
  
	/**
	 * Send a POST request to the server.
	 * @param {String} endpoint 
	 * @param {JSON} jsonBody 
	 * @return {Promise<JSON>} response
	 */
	POSTRequest(endpoint="", jsonBody={}) {
		const fullURL = this.url + endpoint;
		console.log("[POST Request]", fullURL, "body: ", jsonBody);
		const httpResponse = fetch(fullURL, {
			method: "POST",
			cache: "default", // *default, no-cache, reload, force-cache, only-if-cached
			headers: {"Content-Type": "application/json"},
			body: JSON.stringify(jsonBody),
		}).then((response) => {
			switch (response.status) {
			case 200:
				return response.json();
			case 401:
				return Promise.reject("unauthorized");
			case 500:
				return Promise.reject("not_allowed");
			default:
				return Promise.reject("unknown_error");
			}
		}).catch((error) => {
			console.error(error);
			return Promise.reject(error);
		});
		return this.timeoutPromise(10000, httpResponse);
	}

	/**
	 * Send a GET request to the server.
	 * @param {String} endpoint 
	 * @param {String} requestType 
	 * @param {JSON} headers 
	 * @return {Promise<JSON>} response
	 */
	GETRequest(endpoint="", headers={"Content-Type": "application/json"}) {
		const fullURL = this.url + endpoint;
		console.debug("[GET Request]", fullURL, headers);
		const httpResponse = fetch(fullURL, {
			method: "GET",
			headers: headers,
			cache: "default", // *default, no-cache, reload, force-cache, only-if-cached
		}).then((response) => {
			switch (response.status) {
			case 200:
				return response.json();
			case 401:
				return Promise.reject("unauthorized");
			case 500:
				return Promise.reject("not_allowed");
			default:
				return Promise.reject("unknown_error");
			}
		}).catch((error) => {
			console.error(error);
			return Promise.reject(error);
		});
		return this.timeoutPromise(10000, httpResponse);
	}
}
export default new APIService();
  