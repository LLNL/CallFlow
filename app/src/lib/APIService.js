/**
 * Copyright 2017-2020 Lawrence Livermore National Security, LLC and other
 * CallFlow Project Developers. See the top-level LICENSE file for details.
 *
 * SPDX-License-Identifier: MIT
 */

class APIService {
	/**
     * A
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
	 * Send a POST request to the firestore.
	 * @param {String} fullURL 
	 * @param {JSON} headers 
	 * @param {JSON} jsonBody 
	 * @return {Promise<JSON>} response
	 */
	POSTRequest(fullURL="", headers = {"Content-Type": "application/json"}, jsonBody={}) {
		console.log("[POST Request]", fullURL, "headers:", headers, "body: ", jsonBody);
		const httpResponse = fetch(fullURL, {
			method: "POST",
			mode: "no-cors",
			cache: "default", // *default, no-cache, reload, force-cache, only-if-cached
			credentials: "same-origin", // include, *same-origin, omit
			headers: headers,
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
			console.debug(error);
			return Promise.reject(error);
		});
		return this.timeoutPromise(10000, httpResponse);
	}

	/**
	 * Send a GET request to the firestore.
	 * @param {String} fullURL 
	 * @param {String} requestType 
	 * @param {JSON} headers 
	 * @return {Promise<JSON>} response
	 */
	GETRequest(fullURL, headers={"Content-Type": "application/json"}) {
		console.debug("[GET Request]", fullURL, headers);
		const httpResponse = fetch(fullURL, {
			method: "GET",
			headers: headers,
			mode: "no-cors",
			cache: "default", // *default, no-cache, reload, force-cache, only-if-cached
			credentials: "same-origin", // include, *same-origin, omit
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
			console.log(error);
			return Promise.reject(error);
		});
		return this.timeoutPromise(10000, httpResponse);
	}

	/**
     * /init endpoint
     * @param {*} dataset 
     */
	init(datasetPath) {
		this.GETRequest(this.url + "init");
	}

	/**
	 * /config endpoint
	 */
	config() {
		this.GETRequest(this.url + "config");
	}



}
export default new APIService();
  